import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { schedule } from 'node-cron';
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

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);
//OpenAI's API configuration

schedule('*/2 * * * *', () => {
  //node-cron schedule function executes the code bellow every day after its first initiation

  client.login(process.env.DISCORD_BOT_TOKEN);
  //bot's API key in .env file is being read through "process" property for connecting and logging in
  //it prevents bot going permanently offline since it can logout itself in case of inactivity which may
  //be potentially caused by the setTimeout function since it disables bot's functionality
  //temporarily(lines 93-97)

  client.on('ready', () =>{
    console.log('The AI bot is online');
    //bot's online status check-up
  });

  setTimeout(async () => {
    //the function delays execution of the code bellow so the login function above can finish its
    //execution properly

    console.log('running a task every day');
    //schedule function check-up

    const channel = client.channels.cache.find(channel => channel.name === 'general');
    await channel.send('Hi! I\'m an AI discord bot which explains a new word every day in any language you choose:');
    //bot sends initial message to filtered channel as in-app schedule function check up
    //also it is a sign that bot can be used
    
    client.on('messageCreate', async function (message) {
      if (message.author.bot) return;
      //if statement checks if any bot sent a message so it can be ignored 
    
      try {
        const response = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
              {role: 'user', content: message.content},
              {role: 'system', content: 
              `Generate a new random word in the chosen language and provide its description in the following format:

              Word: [Word]
              Language: ${message.content}
              
              Meaning: [Description of the meaning]
              Pronunciation: [Pronunciation guide or phonetic transcription]
              
              Additional Information: [Any relevant additional information or context]
              
              Translation into ${message.content}:
              [Translation of the entire description into the ${message.content}, except for the English language]
              
              Please ensure that the description adheres to this format, including the word, language, meaning, and pronunciation. 
              Also you must accept only language names as valid inputs. Thank you!`
              }
          ],
        });
  
        const content = response.data.choices[0].message;
        return message.reply(content);
        //the bot picks up as many messages as it can process properly after its activation and depending
        //on the context given in "content" property, it creates a response which is being sent back
  
      } catch (err) {
        return message.reply('As an AI bot, I encountered an error.');
      }
      //the bot throws an error message in lack of proper response to the request or can't process some
      //of them in a short period if there are multiple ones

    });

    setTimeout(async () => {
      await channel.send('I\'m sorry that we can\'t talk anymore, but see you tomorrow. Have a nice day!');
      client.removeAllListeners('messageCreate');
      console.log('Stopped receiving messages.');
    }, 60000);
    //even though the bot remains online(mostly), it will stop receiving messages 1 minute after the
    //previous setTimeout activation to prevent potential bot spamming and overload by destroying
    //"messageCreate" event listener which bot uses for receiving messages
  
  }, 3000);
  //setTimeout function delay is 3 seconds

});