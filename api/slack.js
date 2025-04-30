import { WebClient } from "@slack/web-api";
import { google } from "googleapis";

// Slack SDK
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Google Sheets через ENV-переменную (Vercel-safe)
async function writeToGoogleSheet({ user, summary }) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
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

  // Slack verification
  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  // Команда /checkin
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

  // Ответы в личку → Google Sheets
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

    await writeToGoogleSheet({ user: `<@${user}>`, summary });

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
