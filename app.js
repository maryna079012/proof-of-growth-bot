import express from "express";
import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from "dotenv";

// Загружаем переменные из .env
dotenv.config();

// Настраиваем Express для URL Verification
const expressApp = express();
expressApp.use(express.json());

expressApp.post("/slack/events", (req, res) => {
  if (req.body.type === "url_verification") {
    return res.send(req.body.challenge); // ⚡️ ВАЖНО: возвращаем challenge
  }
});

// Настраиваем Bolt с кастомным Express
const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET, app: expressApp });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN,
  receiver,
});

// 👉 Slash-команда /checkin
app.command('/checkin', async ({ command, ack, client }) => {
  await ack();

  const userId = command.user_id;

  await client.chat.postMessage({
    channel: userId,
    text: `🧘 Hey! It's time for your monthly check-in. Just reply below to each question. You’ve got this 💪`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🧠 Let's reflect:*\n\n🔢 Score yourself (1️⃣–5️⃣) on each:\n– Autonomy\n– Clarity\n– Output quality\n– Speed\n– Collaboration"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🎯 *What's your biggest win or blocker this month?*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🙌 *Who helped you this month? Shoutouts welcome!*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "📈 *What's your focus or growth goal for next month?*"
        }
      }
    ]
  });
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
