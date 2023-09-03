import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove, set, onValue, get } from 'firebase/database';
import crypto from 'node:crypto';
import { schedule } from 'node-cron';
//import is being used instead of require due to node.js syntax

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

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DB_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};
//Firebase configuration

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
//database initialization

const initialMessage = 'Hi! I\'m an AI discord bot which explains a new word every day in any language you choose, but please use the following format: [language] [word-length]';

schedule('*/2 * * * *', () => {
  remove(ref(database));
});
//scheduled database clean-up (supposed to be every day by setting 0 0 * * *)

client.login(process.env.DISCORD_BOT_TOKEN).then(() => {
  //bot's API key in .env file is being read through "process" property for connecting and logging in
  console.log('logged in');

}).finally(()=>{
  console.log('Bot initiates its operativity');

  function InitialMessage() {
    const channel = client.channels.cache.get("1093205013272211458");
    setImmediate(() => {
      channel.send(initialMessage);
      console.log('Initial message sent.');
    });
  }
  //the function extracts a channel ID used for interacting with bot
  //bot sends initial message to filtered channel as in-app function check up
  //also it is a sign that bot can be used

  client.on('ready', () => {
    InitialMessage();
  });
  //the function is called upon bot setup

  let lastActivityTime = Date.now();
  let listenerActive = true;
  client.on('messageCreate', async function (message) {
    if (!listenerActive || message.author.bot) {
      return;
    } 
    //if statement checks if any bot sent a message so it can be ignored 

    const userId = message.author.id;
    let userExists = false; 
    let promptExists = false;
    const userRef = ref(database, '/Users/' + userId);
    onValue(userRef, (snapshot) => {
      userExists = snapshot.exists();
    });

    if (userExists) {
      lastActivityTime = Date.now();
      return message.reply('You cannot send any more requests today');
    }
    //check-up with database if certain user had already interacted in that day with a bot
    //blocks further interaction for that user (anti-spam measure, especially for large servers)

    
  
    try {
      
      const regexPattern = /(\w+)\s+(\d+)/;
      const inputMessage = message.content.trim();
      const match = inputMessage.match(regexPattern);
      if (!match) {
        lastActivityTime = Date.now();
        return message.reply('Invalid input format. Please provide the language and word length.');
      }
      //if an input doesn't match the regular expression,
      //it is gonna be rejected with the following message

      const messageContent = message.content;
      let responseContent = null;
      const responseRef = ref(database, '/Responses/');
      try {
        const snapshot = await get(responseRef);
    
        if (snapshot.exists()) {
          snapshot.forEach((responseSnapshot) => {
            const response = responseSnapshot.val();
            if (response.message === messageContent) {
              responseContent = response.response;
              promptExists = true;
            }
          });
        }
      } catch (error) {
        console.error("Error fetching data from Firebase:", error);
      }

      if (promptExists && responseContent !== null) {
        lastActivityTime = Date.now();
        return await message.reply(responseContent);
      }
      //fetches previously stored matching prompts for quicker interaction with the bot

      const language = match[1];
      const wordLength = parseInt(match[2]);
      //language and word length are being extracted from valid input into separated variables

      const responseId = crypto.randomUUID();
      function writeData() {
        set(ref(database, '/Responses/' + responseId), {
          userId: message.author.id,
          user: message.author.username,
          message: message.content,
          response: content.content
        });
        set(ref(database, '/Users/' + userId), {
          userId: message.author.id
        });
      }
      //writes all NEW incoming prompts into a database with the following info

      const originalPrompt = `Generate a new random ${wordLength}-letters long word in ${language} language and provide its description in the following format:

      Word: [Word]
      Language: ${language}
      
      Meaning: [Description of the meaning]
      Pronunciation: [Pronunciation guide or phonetic transcription]
      
      Additional Information: [Any relevant additional information or context]
      
      Translation into ${language}:
      [Translation of the entire description into the ${language}]
      
      Please ensure that the description adheres to this format, including the word, length of word, language, meaning, and pronunciation. Thank you!`

      const randomPrompt = `Generate a new random word in any language and provide its description in the following format:

      Word: [Word]
      Language: [language]
      
      Meaning: [Description of the meaning]
      Pronunciation: [Pronunciation guide or phonetic transcription]
      
      Additional Information: [Any relevant additional information or context]
      
      Translation into [language]:
      [Translation of the entire description into the [language]]
      
      Please ensure that the description adheres to this format, including the word, length of word, language, meaning, and pronunciation. Thank you!`

      if(language == 'English'){
        var prompt = `Generate a new random ${wordLength}-letters long word in ${language} language and provide its description in the following format:

        Word: [Word]
        Language: ${language}
        
        Meaning: [Description of the meaning]
        Pronunciation: [Pronunciation guide or phonetic transcription]
        
        Additional Information: [Any relevant additional information or context]
        
        Please ensure that the description adheres to this format, including the word, length of word, language, meaning, and pronunciation. Thank you!`
      } else{
        prompt = originalPrompt;
      }
      //the if-else statement cuts off a part of prompt to prevent redudant information in English

      async function sendPrompt() {
        try {
          const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: randomPrompt }
            ],
          });
      
          const content = response.data.choices[0].message;
          
          // You can customize the logic for location where you want to send the prompt
          // For example, sending it to a specific channel
          const channel = client.channels.cache.get("1093205013272211458");
          if (channel) {
            return channel.send(content);
          }
      
        } catch (error) {
          console.error('Error sending prompt:', error);
        }
      }

      schedule('*/2 * * * *', () => {
        const currentTime = Date.now();
        const inactiveDuration = currentTime - lastActivityTime;

        // Check if there has been no activity within the last few minutes(customisable)
        if (inactiveDuration >= 2 * 60 * 1000) {
          sendPrompt();
          console.log('Scheduled prompt sending executed due to inactivity');
        }
      });
      
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            {role: 'user', content: message.content},
            {role: 'system', content: prompt}
        ],
      });

      const content = response.data.choices[0].message;
      writeData();
      lastActivityTime = Date.now();
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