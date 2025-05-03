// api/slack.js
import { WebClient } from "@slack/web-api";
import { google } from "googleapis";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const answers = {};
let cachedQuestions = [];

async function getQuestionsFromSheet() {
  if (cachedQuestions.length > 0) return cachedQuestions;

  const auth = new google.auth.JWT({
    email: process.env.GCP_CLIENT_EMAIL,
    key: Buffer.from(process.env.GCP_PRIVATE_KEY_BASE64, "base64").toString("utf-8"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Questions!A2:B", // A: id, B: text
  });

  cachedQuestions = res.data.values.map(([id, text]) => ({ id, text }));
  return cachedQuestions;
}

async function writeToGoogleSheet(user, data) {
  const auth = new google.auth.JWT({
    email: process.env.GCP_CLIENT_EMAIL,
    key: Buffer.from(process.env.GCP_PRIVATE_KEY_BASE64, "base64").toString("utf-8"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const questions = await getQuestionsFromSheet();
  const values = [
    new Date().toISOString(),
    user,
    ...questions.map(q => data[q.id] || ""),
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
    const questions = await getQuestionsFromSheet();
    answers[user_id] = { step: 0, data: {}, questions };
    await slack.chat.postMessage({ channel: user_id, text: questions[0].text });
    return res.status(200).send();
  }

  if (type === "event_callback" && event?.type === "message" && event.channel_type === "im") {
    const user = event.user;
    const state = answers[user];
    if (!state) return res.status(200).send();

    const question = state.questions[state.step];
    state.data[question.id] = event.text;
    state.step++;

    if (state.step >= state.questions.length) {
      await writeToGoogleSheet(user, state.data);
      delete answers[user];
      await slack.chat.postMessage({ channel: user, text: "✅ Thanks for checking in!" });
    } else {
      const nextQuestion = state.questions[state.step];
      await slack.chat.postMessage({ channel: user, text: nextQuestion.text });
    }

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
