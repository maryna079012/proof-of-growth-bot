import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN
});

// Slash command: /checkin
app.command('/checkin', async ({ ack, body, client }) => {
  await ack();

  const userId = body.user_id;

  // Start a private message thread
  await client.chat.postMessage({
    channel: userId,
    text: "👋 Hey! It's time for your monthly check-in. Just reply below to each question. You’ve got this 💪",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Let’s reflect:*\n\n*1️⃣ Score yourself (1–5) on each:*\n- Autonomy\n- Clarity\n- Output quality\n- Speed\n- Collaboration\n- Overall impact\n- Presence & energy"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*2️⃣ What’s your biggest win or blocker this month?*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*3️⃣ Who helped you this month? Shoutouts welcome! 🙌*"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*4️⃣ What’s your focus or growth goal for next month?* 🎯"
        }
      }
    ]
  });
});

(async () => {
  await app.start();
  console.log('⚡️ Proof-of-Growth Bot is running!');
})();
