import { WebClient } from "@slack/web-api";
import { google } from "googleapis";
import config from "../config.js";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const auth = new google.auth.JWT({
  email: process.env.GCP_CLIENT_EMAIL,
  key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Get contributor info from mapping
async function getContributorInfo(userId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: "mapping!A2:D",
  });

  const rows = res.data.values || [];
  for (const row of rows) {
    const [tlName, tlId, contribName, contribId] = row;
    if (tlId === userId) return { type: "TL", name: tlName, target: contribName };
    if (contribId === userId) return { type: "IC", name: contribName };
  }

  return null;
}

function buildBlocks(questions) {
  return questions.map((q, index) => ({
    type: "input",
    block_id: `q_${index}`,
    element: {
      type: "plain_text_input",
      multiline: true,
      action_id: "input",
    },
    label: {
      type: "plain_text",
      text: q,
    },
  }));
}

function extractAnswers(view) {
  const answers = [];
  const blocks = view.state.values;
  for (const blockId in blocks) {
    const inputBlock = blocks[blockId];
    const actionId = Object.keys(inputBlock)[0];
    answers.push(inputBlock[actionId].value);
  }
  return answers;
}

async function writeToSheet(sheetName, userId, name, values) {
  const timestamp = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[timestamp, userId, name, ...values]],
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { type, challenge, payload } = req.body;

  if (type === "url_verification") return res.status(200).send(challenge);

  // Slash command
  if (req.body.command === "/checkin") {
    const userId = req.body.user_id;
    const info = await getContributorInfo(userId);

    if (!info) return res.status(200).send("User not found in mapping");

    const questions = info.type === "IC" ? config.questionsIC : config.questionsTL;
    const name = info.type === "IC" ? info.name : `${info.name} → ${info.target}`;

    await slack.views.open({
      trigger_id: req.body.trigger_id,
      view: {
        type: "modal",
        callback_id: info.type,
        title: { type: "plain_text", text: "Monthly Check-in" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: buildBlocks(questions),
        private_metadata: JSON.stringify({ userId, name }),
      },
    });

    return res.status(200).send();
  }

  // Modal submission
  if (type === "view_submission") {
    const { user, view, view: { callback_id, private_metadata } } = req.body;
    const meta = JSON.parse(private_metadata);
    const answers = extractAnswers(view);
    const sheetName = callback_id === "IC" ? "Individual Contributors" : "Team Leads";

    try {
      await writeToSheet(sheetName, meta.userId, meta.name, answers);
      return res.status(200).json({ response_action: "clear" });
    } catch (err) {
      console.error("❌ Ошибка при записи в Google Sheets:", err);
      return res.status(500).send("Sheet write failed");
    }
  }

  return res.status(200).send("OK");
}
