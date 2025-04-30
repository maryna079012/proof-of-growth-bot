import { WebClient } from "@slack/web-api";
import { Client as NotionClient } from "@notionhq/client";

// Slack и Notion SDK
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });
const databaseId = "1e52f2293f318011ad90f250c778279b";

// Функция записи в Notion
async function addToNotion({ user, summary }) {
  const today = new Date().toISOString().split("T")[0];

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: {
        title: [{ text: { content: user } }],
      },
      Date: {
        date: { start: today },
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
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { type, challenge, command, user_id, event } = req.body;

  // 1. Slack challenge verification
  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  // 2. Slash-команда /checkin
  if (command === "/checkin") {
    await slack.chat.postMessage({
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

    return res.status(200).send();
  }

  // 3. Обработка входящих сообщений в личку (message.im)
  if (type === "event_callback" && event && event.type === "message" && event.channel_type === "im") {
    const user = event.user;
    const text = event.text;

    // 🧠 Пока: сохраняем как есть (всё в поле Win)
    const summary = {
      win: text,
      blocker: "-",
      shoutout: "-",
      focus: "-"
    };

    await addToNotion({ user: `<@${user}>`, summary });

    return res.status(200).send();
  }

  return res.status(200).send("OK");
}
