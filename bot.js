import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { schedule } from "node-cron";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () =>{
  console.log("The AI bot is online");
});

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

schedule('*/1 * * * *', () => {
  console.log('running a task every minute');
  const channel = client.channels.cache.get('1093205013272211458');
  channel.send('Hi! I am a discord bot which provides a new word every day in any language you choose');
});

client.on("messageCreate", async function (message) {
    if (message.author.bot) return;
    
    try {
      const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
              {role: "system", content: "You are a helpful assistant who responds succinctly"},
              {role: "user", content: message.content}
          ],
        });
  
      const content = response.data.choices[0].message;
      return message.reply(content);
  
    } catch (err) {
      return message.reply(
        "As an AI robot, I errored out."
      );
    }
  });

  client.login(process.env.DISCORD_BOT_TOKEN);