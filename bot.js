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

client.login(process.env.DISCORD_BOT_TOKEN).then(() => {
  //bot's API key in .env file is being read through "process" property for connecting and logging in
  console.log('logged in');

}).finally(()=>{
  console.log('Bot initiates its operativity');

  function getChannel() {
    return new Promise((resolve, reject) => {
      const channel = client.channels.cache.get('1093205013272211458');
      if (channel) {
        resolve(channel);
      } else {
        reject(getChannel());
      }
    });
  }
  //the function extracts a channel ID used for interacting with bot

  async function InitialMessage(){
    const channel = await getChannel();
    setImmediate(async () => {
      channel.send('Hi! I\'m an AI discord bot which explains a new word every day in any language you choose, but please use the following format: [language] [word-length]');
      console.log('Initial message sent.');
    });
  }
  InitialMessage();
  //bot sends initial message to filtered channel as in-app function check up
  //also it is a sign that bot can be used

  let listenerActive = true;
  client.on('messageCreate', async function (message) {
    if (!listenerActive || message.author.bot) return;
    //if statement checks if any bot sent a message so it can be ignored 
  
    try {
      
      const regexPattern = /(\w+)\s+(\d+)/;
      const inputMessage = message.content.trim();
      const match = inputMessage.match(regexPattern);
      if (!match) {
          return message.reply('Invalid input format. Please provide the language and word length.');
      }
      //if an input doesn't match the regular expression,
      //it is gonna be rejected with the following message

      const language = match[1];
      const wordLength = parseInt(match[2]);
      //language and word length are being extracted from valid input into separated variables

      const originalPrompt = `Generate a new random ${wordLength}-letters word in ${language} language and provide its description in the following format:

      Word: [Word]
      Language: ${language}
      
      Meaning: [Description of the meaning]
      Pronunciation: [Pronunciation guide or phonetic transcription]
      
      Additional Information: [Any relevant additional information or context]
      
      Translation into ${language}:
      [Translation of the entire description into the ${language}]
      
      Please ensure that the description adheres to this format, including the word, language, meaning, and pronunciation. Thank you!`

      if(language == 'English'){
        var prompt = `Generate a new random ${wordLength}-letters word in ${language} language and provide its description in the following format:

        Word: [Word]
        Language: ${language}
        
        Meaning: [Description of the meaning]
        Pronunciation: [Pronunciation guide or phonetic transcription]
        
        Additional Information: [Any relevant additional information or context]
        
        Please ensure that the description adheres to this format, including the word, language, meaning, and pronunciation. Thank you!`
      } else{
        prompt = originalPrompt;
      }
      //the if-else statement cuts off a part of prompt to prevent redudant information in English
      
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            {role: 'user', content: message.content},
            {role: 'system', content: prompt}
        ],
      });

      const content = response.data.choices[0].message;
      return message.reply(content);
      //the bot picks up messages and depending on the context given in "content" property,
      //it creates a response which is being sent back
      
    } catch (err) {
      console.log(err);
      if(err.response.status === 429){
        listenerActive = false;
        const cooldownMsg = message.reply('Don\'t hurry, let me cool down for a minute!');
        setTimeout(async () => {
          await cooldownMsg;
          InitialMessage();
          listenerActive = true;
        }, 60000);
      } else{
        return message.reply('As an AI bot, I encountered an error.');
      }
    }
    //the bot throws an error message in lack of proper response to the request or can't process more
    //than declared in model's rate/token limit
  });
});