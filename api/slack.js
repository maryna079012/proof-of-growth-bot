import { WebClient } from "@slack/web-api";
import { Client as NotionClient } from "@notionhq/client";

// Инициализация Slack и Notion SDK
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const databaseId = "1e52f2293f318011ad90f250c778279b";

// Функция записи в Notion
async function addToNotion({ user, summary }) {
  try {
    console.log("📥 Отправляем в Notion:", user, summary);

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: user } }],
        },
        Date: {
          date: { start: new Date().toISOString().split("T")[0] },
        },
        Win: {
          rich_text: [{ text: { content: summary.win || "-" } }],
        },
        Blocker: {
          rich_text: [{ text: { content: summary.blocker || "-" } }],
        },
        Shoutout: {
          rich_text: [{ text: { content: summary.shoutout || "-" } }],
        },
        Focus: {
          rich_text: [{ text: { content: summary.focus || "-" } }],
        },
      },
    });

    console.log("✅ Успешно записано в Notion!");
  } catch (err) {
    console.error("❌ Ошибка при записи в Notion:", err.message);
  }
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

  // Обработка личных сообщений
  if (
    type === "event_callback" &&
    event &&
    event.type === "message" &&
    event.channel_type === "im"
  ) {
    const user = event.user;
    const text = event.text;

    console.log("💬 Получено личное сообщение:", text);

    // Пока всё пишем в Win — позже будет AI summary
    const summary = {
      win: text,
      blocker: "-",
      shoutout: "-",
      focus: "-",
    };

    await addToNotion({ user: `<@${user}>`, summary });

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
