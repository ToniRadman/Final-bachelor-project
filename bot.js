import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { schedule } from "node-cron";
//import is being used instead of require due to syntax reasons

dotenv.config();
//loads .env file contents into process.env => file stores API keys
//dedicated file is a MUST for bot's security and it must never be shared

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
//bot initiation with its privileges/intents

client.on("ready", () =>{
  console.log("The AI bot is online");
});
//bot's online status check-up

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);
//OpenAI's API configuration

schedule('*/5 * * * *', () => {
  //node-cron schedule function executes the code bellow every day after its first initiation

  client.login(process.env.DISCORD_BOT_TOKEN);
  //bot's API key in .env file is being read through "process" property for connecting/login

  setTimeout(() => {
    //the function delays execution of the code bellow so the login function above can finish its
    //execution properly, otherwise only console.log is going to be executed properly afterwards

    console.log('running a task every minute');
    //schedule function trigger check-up

    const channel = client.channels.cache.find(channel => channel.name === 'general');
    channel.send('Hi! I am a discord bot which provides a new word every day in any language you choose:');
    //bot sends initial message to filtered channel as in-app schedule function check up
    //also it is a sign that bot can be used
    
    client.on("messageCreate", async function (message) {
      if (message.author.bot) return;
      //if statement checks if any bot sent a message so it could be ignored 
    
      try {
        const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
              {role: "system", content: "Pick a random word and describe it in chosen language"},
              {role: "user", content: message.content}
          ],
        });
  
        const content = response.data.choices[0].message;
        return message.reply(content);
        //the bot picks up as many messages as it can process properly after its activation and depending
        //on the context given in "content" property, it creates a response which is being sent back
  
      } catch (err) {
        return message.reply(
          "As an AI robot, I errored out."
        );
      }
      //the bot throws an error message in lack of proper response to the request or can't process some
      //of them in a short period if there are multiple ones

    });
  }, 3000);
  //setTimeout is being delayed for 3 seconds
  
});