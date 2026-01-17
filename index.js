require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const app = express();
const BOT_TOKEN =  '8206693893:AAGdbGIHN_bZEFEhwHPsTH57LbFmjujxh_Q';
const GEMINI_API_KEY = 'AIzaSyDqy9AtMHN6I2bRvWBYQ1B-1T06gXjlwM0';
const CHANNEL_ID = '@abcde_officia'; 

// --- SERVER FOR RENDER (Keep Alive) ---
app.get('/', (req, res) => res.send('Bot is Alive! 🚀'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const bot = new Telegraf(BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const poets = ["Mirza Ghalib", "Faiz Ahmed Faiz", "Allama Iqbal", "Gulzar", "Jaun Elia"];
let poetIndex = 0;

// --- AI LOGIC WITH NEW MODEL ---
async function getAIContent(poetName) {
    try {
        // Naya Model Version jo aapne bataya
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-preview-09-2025" 
        });

        const prompt = `Write a famous 2-line shayari by ${poetName} in Hindi (Devanagari). 
        Also, provide a brief 1-sentence meaning in Hinglish. 
        Note: Do not include any introductory text, strictly follow the format.
        
        Format:
        (Shayari here)
        
        Meaning: (Meaning here)`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        return null;
    }
}

// --- POSTING LOGIC ---
async function postToChannel(customPoet = null) {
    const currentPoet = customPoet || poets[poetIndex];
    console.log(`⏳ Generating Shayari for: ${currentPoet}`);

    const content = await getAIContent(currentPoet);

    if (content) {
        const finalPost = `✨ *${currentPoet}* ✨\n\n${content}\n\n📌 #Shayari #Poetry`;
        try {
            await bot.telegram.sendMessage(CHANNEL_ID, finalPost, { parse_mode: 'Markdown' });
            if (!customPoet) {
                poetIndex = (poetIndex + 1) % poets.length;
            }
            return true;
        } catch (err) {
            console.error("❌ Telegram Send Error:", err.message);
            return false;
        }
    }
    return false;
}

// --- COMMANDS & INPUT LISTENER ---

bot.start((ctx) => {
    ctx.reply("Namaste! Bot active hai. \n\n🔹 Auto-post: Har 1 ghante mein.\n🔹 Manual: Likhiye 'post shayari [Poet Name]'");
});

bot.on('text', async (ctx) => {
    const msg = ctx.message.text.toLowerCase();

    // "post shayari" check
    if (msg.startsWith('post shayari')) {
        const inputPoet = ctx.message.text.replace(/post shayari/i, '').trim();
        
        if (!inputPoet) {
            return ctx.reply("Kripya poet ka naam likhein. Example: post shayari Gulzar");
        }

        await ctx.reply(`🔍 Gemini 2.5 Flash se ${inputPoet} ki shayari nikaal raha hoon...`);
        const success = await postToChannel(inputPoet);
        
        if (success) {
            ctx.reply("✅ Channel par post kar diya gaya hai!");
        } else {
            ctx.reply("❌ Maafi, shayari post nahi ho payi. Logs check karein.");
        }
    }
});

// --- AUTOMATIC SCHEDULE (India Time) ---
cron.schedule('0 * * * *', () => {
    postToChannel();
}, { 
    scheduled: true,
    timezone: "Asia/Kolkata" 
});

// --- LAUNCH ---
bot.launch().then(() => console.log("🚀 Bot launched with Gemini 2.5 Flash!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));