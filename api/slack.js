import { WebClient } from "@slack/web-api";
import { google } from "googleapis";
import config from "../config.js";
import fs from "fs";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function writeToGoogleSheet({ userId, sheet, values }) {
  const auth = new google.auth.JWT({
    email: process.env.GCP_CLIENT_EMAIL,
    key: Buffer.from(process.env.GCP_PRIVATE_KEY_BASE64, "base64").toString("utf-8"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.sheetId,
    range: `${sheet}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now, userId, ...values]],
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { type, challenge, command, user_id, event } = req.body;

  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  if (command === "/checkin") {
    res.status(200).send();
    const blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: config.messages.intro },
      },
    ];

    config.individual.questions.forEach((q) => {
      blocks.push({
        type: "input",
        block_id: q.id,
        element: { type: "plain_text_input", action_id: "response" },
        label: { type: "plain_text", text: q.question, emoji: true },
      });
    });

    await slack.views.open({
      trigger_id: req.body.trigger_id,
      view: {
        type: "modal",
        callback_id: "checkin_submission",
        title: { type: "plain_text", text: "Monthly Check-In" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks,
      },
    });
    return;
  }

  if (type === "event_callback" && event?.type === "message" && event.channel_type === "im") {
    const text = event.text;
    const summary = {
      win: text,
      blocker: "-",
      shoutout: "-",
      focus: "-",
    };
    try {
      await writeToGoogleSheet({
        userId: event.user,
        sheet: config.individual.sheetName,
        values: Object.values(summary),
      });
    } catch (err) {
      console.error("❌ Ошибка при записи в Google Sheets:", err);
    }
    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
