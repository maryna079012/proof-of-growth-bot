import express from "express";
import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// Важно: парсим JSON
app.use(express.json());

// ✅ Обработка Slack Challenge
app.post("/slack/events", (req, res) => {
  const body = req.body;

  if (body && body.type === "url_verification") {
    const challenge = body.challenge;
    console.log("Slack challenge received:", challenge);

    // ВАЖНО: тип ответа — text/plain
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  res.status(200).send("ok");
});

// ✅ Обработка /checkin
app.post("/slack/commands", async (req, res) => {
  const { command, user_id } = req.body;

  if (command === "/checkin") {
    await client.chat.postMessage({
      channel: user_id,
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

    return res.status(200).send(); // для Slack важно быстро ответить
  }

  res.status(200).send("Unknown command");
});

// 🚀 Запускаем сервер
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
