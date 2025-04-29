import express from "express";
import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// Важно: парсим JSON-тело
app.use(express.json());

// 🟢 Обработка Slack Challenge
app.post("/slack/events", (req, res) => {
  try {
    const body = req.body;
    if (body && body.type === "url_verification") {
      console.log("Challenge received:", body.challenge);
      return res.status(200).send(body.challenge);
    }
    return res.status(200).send(); // для других событий
  } catch (err) {
    console.error("Error handling challenge:", err);
    return res.status(500).send("Error");
  }
});

// 🟣 Обработка /checkin
app.post("/slack/commands", async (req, res) => {
  if (req.body.command === "/checkin") {
    const userId = req.body.user_id;

    await client.chat.postMessage({
      channel: userId,
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

    return res.status(200).send();
  }

  res.status(200).send("Unknown command");
});

// 🚀 Запускаем сервер
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
