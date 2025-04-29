import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { type, challenge, command, user_id } = req.body;

  // Slack URL verification
  if (type === "url_verification") {
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(challenge);
  }

  // Slash command: /checkin
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

    return res.status(200).send(); // Respond to Slack
  }

  return res.status(200).send("Event received");
}
