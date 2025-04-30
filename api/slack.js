import { WebClient } from "@slack/web-api";
import { google } from "googleapis";
import { readFileSync } from "fs";
import path from "path";

// Slack SDK
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Путь к JSON-файлу ключа сервисного аккаунта
const CREDENTIALS_PATH = path.join(process.cwd(), "proof-of-growth-678a3d244fbe.json");

// Google Sheet ID и имя вкладки
const SHEET_ID = "1ash2NiWYobB4dCnlxt_sEYSxE4LSQvkWA8FccSNy0SQ";
const SHEET_NAME = "Sheet1";

// Запись строки в Google Sheets
async function writeToGoogleSheet({ user, summary }) {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now, user, summary.win, summary.blocker, summary.shoutout, summary.focus]],
    },
  });

  console.log("✅ Данные добавлены в Google Sheets!");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { type, challenge, command, user_id, event } = req.body;

  // Slack challenge check
  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  // Slash-команда /checkin
  if (command === "/checkin") {
    await slack.chat.postMessage({
      channel: user_id,
      text: "👋 It’s check-in time! Answer below 👇",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🧠 Score yourself (1–5):*\n- Autonomy\n- Clarity\n- Output\n- Speed\n- Collaboration",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🎯 Biggest win or blocker this month?*",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🙌 Who helped you this month?*",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*📈 Focus for next month?*",
          },
        },
      ],
    });

    return res.status(200).send();
  }

  // Ответ пользователя в личку
  if (
    type === "event_callback" &&
    event &&
    event.type === "message" &&
    event.channel_type === "im"
  ) {
    const user = event.user;
    const text = event.text;

    console.log("💬 Получен ответ:", user, text);

    const summary = {
      win: text,
      blocker: "-",
      shoutout: "-",
      focus: "-",
    };

    await writeToGoogleSheet({ user: `<@${user}>`, summary });

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
