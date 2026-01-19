require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const express = require('express');

// --- CONFIGURATION ---
const BOT_TOKEN = process.env.BOT_TOKEN ; 
const apiKey = process.env.apiKey ; 
const CHANNEL_ID = '@shayari_aajkal'; 

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const poets = ["Mirza Ghalib", "Faiz Ahmed Faiz", "Allama Iqbal", "Gulzar", "Jaun Elia"];
let poetIndex = 0;

// --- SERVER FOR RENDER ---
app.get('/', (req, res) => res.send('Shayari Bot (Gemini 2.5) is Alive! ✍️'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// --- AI LOGIC (Gemini 2.5 Flash Preview) ---
async function getAIShayari(poetName) {
  // Aapka bataya hua specific URL
 const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  
  const userPrompt = `Write a unique and famous shayari by ${poetName} in Hindi (Devanagari). 
                      Also provide a 1-line meaning in Hinglish.`;

  const payload = {
    contents: [{
      parts: [{ text: userPrompt }]
    }],
    systemInstruction: {
      parts: [{ text: `
        You are a shayari expert. 
        Format:
        (Shayari here)
        
        Meaning: (Brief 1-sentence meaning in Hinglish)
        
        STRICT RULES:
        1. No intro text (like "Sure, here is...").
        2. No emojis.
        3. No markdown backticks.
      ` }]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini 2.5 API Error Detail:", JSON.stringify(result));
      return null;
    }

    // Text extract logic
    return result.candidates?.[0]?.content?.parts?.[0]?.text || null;

  } catch (error) {
    console.error("Fetch Error:", error.message);
    return null;
  }
}

// --- POSTING LOGIC ---
async function postShayariToChannel(customPoet = null) {
  const currentPoet = customPoet || poets[poetIndex];
  console.log(`⏳ Fetching shayari for: ${currentPoet}`);

  try {
    const shayari = await getAIShayari(currentPoet);
    
    if (shayari) {
      const finalPost = `✨ *${currentPoet}* ✨\n\n${shayari}\n\n📌 #Shayari #Poetry`;
      
      await bot.telegram.sendMessage(CHANNEL_ID, finalPost, { parse_mode: 'Markdown' });
      
      if (!customPoet) {
        poetIndex = (poetIndex + 1) % poets.length;
      }
      return true;
    }
  } catch (error) {
    console.error("Post Error:", error.message);
  }
  return false;
}

// --- COMMANDS ---
bot.start((ctx) => ctx.reply("Shayari Bot Active! 'post shayari [Name]' likhein."));

bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase();
  
  if (text.startsWith('post shayari')) {
    const inputPoet = ctx.message.text.split(' ').slice(2).join(' ').trim();
    if (!inputPoet) return ctx.reply("Kripya poet ka naam likhein!");

    await ctx.reply(`🔍 Gemini 2.5 se ${inputPoet} ki shayari dhund raha hoon...`);
    const success = await postShayariToChannel(inputPoet);
    
    if (success) ctx.reply("✅ Channel par post ho gayi!");
    else ctx.reply("❌ Error: API ne response nahi diya.");
  }
});

// --- CRON JOB ---
cron.schedule('0 * * * *', () => {
  console.log("Auto-posting shayari...");
  postShayariToChannel();
}, { timezone: "Asia/Kolkata" });

bot.launch().then(() => console.log("🚀 Shayari Bot (Gemini 2.5) Launched!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

