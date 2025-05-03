// slack.js
import { WebClient } from "@slack/web-api";
import { google } from "googleapis";
import { config } from "../config.js";


const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const answers = {};

async function writeToGoogleSheet(user, data) {
  const auth = new google.auth.JWT({
    email: process.env.GCP_CLIENT_EMAIL,
    key: Buffer.from(process.env.GCP_PRIVATE_KEY_BASE64, "base64").toString("utf-8"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const values = [
    new Date().toISOString(),
    user,
    ...config.individual.map(q => data[q.id] || "")
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Individual Contributor!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { type, user_id, event, command, text } = req.body;

  if (type === "url_verification") return res.status(200).send(req.body.challenge);

  if (command === "/checkin") {
    answers[user_id] = { step: 0, data: {} };
    await slack.chat.postMessage({ channel: user_id, text: config.individual[0].text });
    return res.status(200).send();
  }

  if (type === "event_callback" && event?.type === "message" && event.channel_type === "im") {
    const user = event.user;
    const state = answers[user];
    if (!state) return res.status(200).send();

    const question = config.individual[state.step];
    state.data[question.id] = event.text;
    state.step++;

    if (state.step >= config.individual.length) {
      await writeToGoogleSheet(user, state.data);
      delete answers[user];
      await slack.chat.postMessage({ channel: user, text: "✅ Thanks for checking in!" });
    } else {
      const nextQuestion = config.individual[state.step];
      await slack.chat.postMessage({ channel: user, text: nextQuestion.text });
    }

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
