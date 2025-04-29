import express from "express";
import { App } from "@slack/bolt";
import dotenv from "dotenv";

dotenv.config();

const expressApp = express();
expressApp.use(express.json());

// 🔐 Slack challenge for Event Subscription
expressApp.post("/slack/events", (req, res, next) => {
  if (req.body.type === "url_verification") {
    return res.status(200).send(req.body.challenge);
  } else {
    next(); // Передаём дальше в Bolt
  }
});

// 🔧 Инициализируем Bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: false,
  receiver: {
    app: expressApp,
  },
});

// 🟣 Slash команда /checkin
app.command("/checkin", async ({ ack, command, client }) => {
  await ack();

  await client.chat.postMessage({
    channel: command.user_id,
    text: "👋 It’s check-in time! Answer below 👇",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🧠 Score yourself (1–5):*\n- Autonomy\n- Clarity\n- Output\n- Speed\n- Collaboration"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎯 Biggest win or blocker this month?*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🙌 Who helped you this month?*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📈 Focus for next month?*"
        }
      }
    ]
  });
});

// 🚀 Запуск сервера
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`🚀 App running on port ${PORT}`);
});
