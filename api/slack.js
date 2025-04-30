import { WebClient } from "@slack/web-api";
import { google } from "googleapis";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function writeToGoogleSheet({ user, summary }) {
  const auth = new google.auth.JWT({
    email: process.env.GCP_CLIENT_EMAIL,
    key: Buffer.from(process.env.GCP_PRIVATE_KEY_BASE64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: "1ash2NiWYobB4dCnlxt_sEYSxE4LSQvkWA8FccSNy0SQ",
    range: "Sheet1!A1",
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

  // Slack URL verification
  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  // Slash command: /checkin
  if (command === "/checkin") {
    res.status(200).send(); // Respond fast to Slack to avoid dispatch_failed

    try {
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

      console.log("✅ Slack message sent");
    } catch (err) {
      console.error("❌ Slack message failed", err);
    }

    return;
  }

  // Handle DM reply
  if (
    type === "event_callback" &&
    event &&
    event.type === "message" &&
    event.channel_type === "im"
  ) {
    const user = event.user;
    const text = event.text;

    console.log("💬 Ответ от пользователя:", user, text);

    const summary = {
      win: text,
      blocker: "-",
      shoutout: "-",
      focus: "-",
    };

    try {
      await writeToGoogleSheet({ user: `<@${user}>`, summary });
    } catch (err) {
      console.error("❌ Ошибка при записи в Google Sheets:", err);
    }

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
