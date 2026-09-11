import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import { getPrayerTimesForToday } from "./api/prayers.js";
import { generatePrayerImage } from "./api/generateImage.js";
import { sendImageToWhatsApp, sendTextMessageToWhatsApp } from "./api/whatsapp.js";
import { generateDua, generateDailyShiaTextDua } from "./api/gemini.js";
import { shiaDuasCollection } from "./api/shiaDuasDatabase.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// In-memory config for demo, should be saved properly or in ENV
let config = {
  idInstance: process.env.GREEN_API_ID_INSTANCE || "710722682633",
  apiTokenInstance: process.env.GREEN_API_API_TOKEN_INSTANCE || "65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5",
  chatId: process.env.WHATSAPP_GROUP_ID || "120363413046572405@g.us", // Using the correct Group ID format instead of the invite link
};

// Route to get config
app.get("/api/config", (req, res) => {
  res.json(config);
});

// Route to save config
app.post("/api/config", (req, res) => {
  const { idInstance, apiTokenInstance, chatId } = req.body;
  config = { 
    idInstance: idInstance ?? config.idInstance, 
    apiTokenInstance: apiTokenInstance ?? config.apiTokenInstance, 
    chatId: chatId ?? config.chatId
  };
  res.json({ success: true });
});

// In-memory execution logs and last run tracking
interface ExecutionLog {
  timestamp: string;
  type: "poster" | "dua";
  status: "success" | "failed";
  details: string;
}

let executionLogs: ExecutionLog[] = [];
let lastPosterDate = "";
let lastDuaDate = "";
let testTodayDuaSent = false;

function getBahrainCurrentDate(): { dateStr: string, timeStr: string, hours: number, minutes: number } {
  const now = new Date();
  // Bahrain is UTC+3
  const bahrainTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bahrain" }));
  const year = bahrainTime.getFullYear();
  const month = String(bahrainTime.getMonth() + 1).padStart(2, '0');
  const day = String(bahrainTime.getDate()).padStart(2, '0');
  const hours = bahrainTime.getHours();
  const minutes = bahrainTime.getMinutes();
  const seconds = bahrainTime.getSeconds();
  
  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    hours,
    minutes
  };
}

// Function to run the job
async function runDailyJob() {
  console.log("Running daily prayer times job...");
  const bTime = getBahrainCurrentDate();
  if (!config.idInstance || !config.apiTokenInstance || !config.chatId) {
    console.log("Green API credentials not set. Skipping.");
    executionLogs.unshift({
      timestamp: `${bTime.dateStr} ${bTime.timeStr}`,
      type: "poster",
      status: "failed",
      details: "بيانات Green API غير مكتملة."
    });
    throw new Error("Green API credentials not configured.");
  }

  const prayers = await getPrayerTimesForToday();
  const dua = await generateDua();
  const imageBuffer = await generatePrayerImage(prayers, dua);
  const caption = `مواقيت الصلاة ليوم ${prayers.weekday} ${prayers.gregorianDate} الموافق ${prayers.hijriDate}\n\nنسألكم الدعاء 🤲`;

  const chatIds = config.chatId.split(',').map(id => id.trim()).filter(id => id.length > 0);
  let sentCount = 0;
  let errors: string[] = [];

  for (const targetChatId of chatIds) {
    if (targetChatId.includes('chat.whatsapp.com')) {
      const err = `Skipping invalid chat ID (Invite Link): ${targetChatId}. Please use the actual Group ID.`;
      console.error(err);
      errors.push(err);
      continue;
    }
    try {
      await sendImageToWhatsApp(
        config.idInstance,
        config.apiTokenInstance,
        targetChatId,
        imageBuffer,
        caption
      );
      console.log(`Successfully sent WhatsApp message to ${targetChatId}!`);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send to ${targetChatId}:`, error);
      errors.push(`Failed to send to ${targetChatId}: ${error}`);
    }
  }

  lastPosterDate = bTime.dateStr;
  executionLogs.unshift({
    timestamp: `${bTime.dateStr} ${bTime.timeStr}`,
    type: "poster",
    status: sentCount > 0 ? "success" : "failed",
    details: `تم الإرسال إلى ${sentCount} مجموعة بنجاح. ${errors.length ? 'أخطاء: ' + errors.join(', ') : ''}`
  });
  if (executionLogs.length > 30) executionLogs.pop();

  return { sentCount, errors };
}

// Function to run the written Shia Dua job
async function runDailyDuaJob() {
  console.log("Running daily written Shia Dua job...");
  const bTime = getBahrainCurrentDate();
  if (!config.idInstance || !config.apiTokenInstance || !config.chatId) {
    console.log("Green API credentials not set. Skipping.");
    executionLogs.unshift({
      timestamp: `${bTime.dateStr} ${bTime.timeStr}`,
      type: "dua",
      status: "failed",
      details: "بيانات Green API غير مكتملة."
    });
    throw new Error("Green API credentials not configured.");
  }

  const messageText = await generateDailyShiaTextDua();
  const chatIds = config.chatId.split(',').map(id => id.trim()).filter(id => id.length > 0);
  let sentCount = 0;
  let errors: string[] = [];

  for (const targetChatId of chatIds) {
    if (targetChatId.includes('chat.whatsapp.com')) {
      const err = `Skipping invalid chat ID (Invite Link): ${targetChatId}. Please use the actual Group ID.`;
      console.error(err);
      errors.push(err);
      continue;
    }
    try {
      await sendTextMessageToWhatsApp(
        config.idInstance,
        config.apiTokenInstance,
        targetChatId,
        messageText
      );
      console.log(`Successfully sent daily Dua to ${targetChatId}!`);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send Dua to ${targetChatId}:`, error);
      errors.push(`Failed to send Dua to ${targetChatId}: ${error}`);
    }
  }

  lastDuaDate = bTime.dateStr;
  executionLogs.unshift({
    timestamp: `${bTime.dateStr} ${bTime.timeStr}`,
    type: "dua",
    status: sentCount > 0 ? "success" : "failed",
    details: `تم إرسال دعاء اليوم بنجاح إلى ${sentCount} مجموعة.`
  });
  if (executionLogs.length > 30) executionLogs.pop();

  return { sentCount, errors, messageText };
}

// Internal cron schedules (Bahrain Timezone: Asia/Bahrain)
// 1. Daily Prayer Poster at 18:00 (6:00 PM)
cron.schedule("0 18 * * *", async () => {
  console.log("[Auto-Cron] Running 18:00 (6:00 PM) Daily Prayer Poster...");
  try {
    await runDailyJob();
  } catch (err) {
    console.error("[Auto-Cron] Error in 18:00 poster job:", err);
  }
}, {
  timezone: "Asia/Bahrain"
});

// 2. Daily Written Shia Dua at 15:00 (3:00 PM)
cron.schedule("0 15 * * *", async () => {
  console.log("[Auto-Cron] Running 15:00 (3:00 PM) Daily Shia Dua...");
  try {
    await runDailyDuaJob();
  } catch (err) {
    console.error("[Auto-Cron] Error in 15:00 Dua job:", err);
  }
}, {
  timezone: "Asia/Bahrain"
});

// 3. User requested test today at 19:45 (7:45 PM Bahrain Time)
cron.schedule("45 19 * * *", async () => {
  if (!testTodayDuaSent) {
    testTodayDuaSent = true;
    console.log("[Auto-Cron] ⏰ Running 19:45 (7:45 PM) Test Shia Dua for today...");
    try {
      await runDailyDuaJob();
      console.log("[Auto-Cron] 19:45 Test Dua sent successfully!");
    } catch (err) {
      console.error("[Auto-Cron] Error in 19:45 Test Dua:", err);
    }
  }
}, {
  timezone: "Asia/Bahrain"
});

// Watchdog timer: checks every 10 seconds as a secondary guarantee
setInterval(async () => {
  const bTime = getBahrainCurrentDate();

  // Check for 19:45 (7:45 PM) Special Test Dua today
  if (bTime.hours === 19 && bTime.minutes === 45 && !testTodayDuaSent) {
    testTodayDuaSent = true;
    console.log(`[Watchdog] ⏰ 19:45 reached on ${bTime.dateStr}. Triggering Special Test Dua...`);
    try {
      await runDailyDuaJob();
      console.log("[Watchdog] 19:45 Special Test Dua sent successfully!");
    } catch (err) {
      console.error("[Watchdog] Error in 19:45 Test Dua:", err);
    }
  }
  
  // Check for 15:00 (3:00 PM) Shia Dua trigger
  if (bTime.hours === 15 && bTime.minutes === 0 && lastDuaDate !== bTime.dateStr) {
    console.log(`[Watchdog] 15:00 reached on ${bTime.dateStr}. Triggering Shia Dua...`);
    lastDuaDate = bTime.dateStr;
    try {
      await runDailyDuaJob();
    } catch (err) {
      console.error("[Watchdog] Dua error:", err);
    }
  }

  // Check for 18:00 (6:00 PM) Prayer Poster trigger
  if (bTime.hours === 18 && bTime.minutes === 0 && lastPosterDate !== bTime.dateStr) {
    console.log(`[Watchdog] 18:00 reached on ${bTime.dateStr}. Triggering Prayer Poster...`);
    lastPosterDate = bTime.dateStr;
    try {
      await runDailyJob();
    } catch (err) {
      console.error("[Watchdog] Poster error:", err);
    }
  }
}, 10000);

// Route to get scheduler live status
app.get("/api/scheduler-status", (req, res) => {
  const bTime = getBahrainCurrentDate();
  res.json({
    status: "active",
    timezone: "Asia/Bahrain (GMT+3)",
    currentTime: `${bTime.dateStr} ${bTime.timeStr}`,
    schedules: [
      {
        name: "تجربة اليوم الخاصة (دعاء في القروب)",
        time: "19:45 (7:45 مساءً اليوم)",
        frequency: "اليوم فقط للتجربة (10 سبتمبر 2026)",
        lastRunDate: testTodayDuaSent ? "تم إرسال الدعاء إلى القروب بنجاح" : "مجدول وجاهز - بانتظار حلول الساعة 7:45 مساءً"
      },
      {
        name: "دعاء اليوم كتابة",
        time: "15:00 (3:00 عصراً)",
        frequency: "يومياً مستمر حتى 2027 وما بعدها",
        lastRunDate: lastDuaDate || "لم يعمل اليوم بعد"
      },
      {
        name: "صورة مواقيت الصلاة",
        time: "18:00 (6:00 مساءً)",
        frequency: "يومياً مستمر حتى 2027 وما بعدها",
        lastRunDate: lastPosterDate || "لم يعمل اليوم بعد"
      }
    ],
    logs: executionLogs
  });
});

// Route to trigger the poster job manually or via cron (accepts POST & GET)
app.all("/api/trigger", async (req, res) => {
  try {
    const result = await runDailyJob();
    res.json({ success: true, message: `تم إرسال صورة المواقيت بنجاح إلى ${result.sentCount} مجموعة.`, errors: result.errors });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Route to trigger the written Shia Dua job manually or via cron (accepts POST & GET)
app.all("/api/trigger-dua", async (req, res) => {
  try {
    const result = await runDailyDuaJob();
    res.json({ 
      success: true, 
      message: `تم إرسال دعاء اليوم بنجاح إلى ${result.sentCount} مجموعة.`, 
      sentCount: result.sentCount,
      errors: result.errors,
      duaText: result.messageText
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Route to send a specific chosen Shia Dua directly
app.post("/api/send-selected-dua", async (req, res) => {
  try {
    const { title, text, source } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Dua text is required" });
    }

    const messageText = `✨ *دُعَـاءٌ مُبَـارَكٌ مِـنْ أَدْعِـيَةِ أَهْـلِ الْبَـيْتِ (ع)* ✨
━━━━━━━━━━━━━━━━━━━━
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ وَعَجِّلْ فَرَجَهُمْ

🌸 *${title || 'من أدعية الأئمة الأطهار (ع)'}*

« ${text} »

📖 *المصدر الشيعي المعتبر:*
${source || 'الصحيفة السجادية ومفاتيح الجنان'}
━━━━━━━━━━━━━━━━━━━━
🤲 *نسألكم خالص الدعاء والزيارة*
🌿 رحم الله من قرأ سورة الفاتحة وأهدى ثوابها لأرواح المؤمنين والمؤمنات`;

    const chatIds = config.chatId.split(',').map(id => id.trim()).filter(id => id.length > 0);
    let sentCount = 0;
    let errors: string[] = [];

    for (const targetChatId of chatIds) {
      if (targetChatId.includes('chat.whatsapp.com')) continue;
      try {
        await sendTextMessageToWhatsApp(
          config.idInstance,
          config.apiTokenInstance,
          targetChatId,
          messageText
        );
        sentCount++;
      } catch (err) {
        errors.push(String(err));
      }
    }

    res.json({
      success: true,
      sentCount,
      errors,
      message: `تم إرسال الدعاء المختار إلى ${sentCount} مجموعة بنجاح.`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Route to preview the daily written Dua
app.get("/api/preview-dua", async (req, res) => {
  try {
    const duaText = await generateDailyShiaTextDua();
    res.json({ duaText });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Route to get authentic Shia Duas collection
app.get("/api/shia-duas", (req, res) => {
  res.json({
    total: shiaDuasCollection.length,
    duas: shiaDuasCollection
  });
});

// Route to preview the generated image
app.get("/api/preview", async (req, res) => {
  try {
    const prayers = await getPrayerTimesForToday();
    const dua = await generateDua();
    const imageBuffer = await generatePrayerImage(prayers, dua);
    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Chatbot route
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const systemInstruction = `أنت مساعد ذكي متخصص في أوقات الصلاة عند الشيعة (طريقة معهد لواء قم) وأدعية أهل البيت عليهم السلام المعتبرة. يمكنك:
1. إعطاء أوقات الصلاة الدقيقة لهذا اليوم في البحرين.
2. اختيار أحاديث شريفة وأدعية من مصادر الشيعة المعتبرة.
3. تصميم وإرسال صورة أوقات الصلاة عبر الواتساب.
4. إرسال دعاء كتابة ومناجاة شيعية معتبرة مباشرة إلى مجموعات الواتساب.
عندما يطلب منك المستخدم إرسال دعاء كتابة، استخدم دالة send_written_shia_dua. وعندما يطلب تصميم أو إرسال صورة المواقيت، استخدم دالة design_and_send_poster.`;

  const tools = [{
    functionDeclarations: [
      {
        name: "get_prayer_times",
        description: "Fetch today's accurate Shia prayer times for Bahrain."
      },
      {
        name: "send_written_shia_dua",
        description: "Send an authentic Shia written Dua (supplication) as a text message directly to the WhatsApp groups."
      },
      {
        name: "design_and_send_poster",
        description: "Design the daily prayer poster with a specific Hadith and sky colors, and send it directly to the WhatsApp group.",
        parameters: {
          type: "OBJECT",
          properties: {
            hadithText: { type: "STRING", description: "The Hadith text (one line)" },
            hadithSource: { type: "STRING", description: "The source (e.g. عن الإمام علي - نهج البلاغة)" },
            skyColorTop: { type: "STRING", description: "Hex color code for the top of the sky background (e.g., #87CEEB)" },
            skyColorBottom: { type: "STRING", description: "Hex color code for the bottom of the sky background (e.g., #4682B4)" }
          },
          required: ["hadithText", "hadithSource", "skyColorTop", "skyColorBottom"]
        }
      }
    ]
  }];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      })),
      config: {
        systemInstruction,
        tools: tools as any,
        temperature: 0.7
      }
    });

    let textResponse = response.text || "";
    
    // Handle function calls if any
    const functionCalls = response.functionCalls || [];
    let toolResultMsg = "";

    if (functionCalls.length > 0) {
      for (const call of functionCalls) {
        if (call.name === "get_prayer_times") {
          const prayers = await getPrayerTimesForToday();
          toolResultMsg += `لقد جلبت الأوقات بنجاح. الفجر: ${prayers.Fajr}، الشروق: ${prayers.Sunrise}، الظهرين: ${prayers.Dhuhr}، العشاءين: ${prayers.Maghrib}، منتصف الليل: ${prayers.Midnight}.\n`;
        } else if (call.name === "send_written_shia_dua") {
          if (!config.idInstance || !config.apiTokenInstance || !config.chatId) {
            toolResultMsg += "عذراً، إعدادات Green API غير مكتملة. يرجى إضافتها أولاً في صفحة الإعدادات.\n";
          } else {
            try {
              const resJob = await runDailyDuaJob();
              toolResultMsg += `تم إرسال دعاء اليوم كتابةً إلى الواتساب بنجاح (${resJob.sentCount} مجموعة)!\nنص الدعاء المرسل:\n${resJob.messageText}\n`;
            } catch (err: any) {
              toolResultMsg += `حدث خطأ أثناء إرسال الدعاء: ${err.message}\n`;
            }
          }
        } else if (call.name === "design_and_send_poster") {
          const args = call.args as any;
          if (!config.idInstance || !config.apiTokenInstance || !config.chatId) {
            toolResultMsg += "عذراً، إعدادات Green API غير مكتملة. يرجى إضافتها أولاً.\n";
          } else {
            const prayers = await getPrayerTimesForToday();
            const dua = { text: args.hadithText, source: args.hadithSource };
            const theme = { skyTop: args.skyColorTop, skyBottom: args.skyColorBottom };
            
            const imageBuffer = await generatePrayerImage(prayers, dua, theme);
            
            const chatIds = config.chatId.split(',').map(id => id.trim()).filter(id => id.length > 0);
            let sentCount = 0;
            
            for (const targetChatId of chatIds) {
              if (targetChatId.includes('chat.whatsapp.com')) {
                toolResultMsg += `\nعذراً، لا يمكن الإرسال إلى الرابط (${targetChatId}). يجب إدخال معرّف المجموعة (Group ID) الخاص بها في الإعدادات.`;
                continue;
              }
              try {
                await sendImageToWhatsApp(
                  config.idInstance,
                  config.apiTokenInstance,
                  targetChatId,
                  imageBuffer,
                  "مواقيت الصلاة لهذا اليوم - البحرين\n\n" + dua.text + "\n" + dua.source
                );
                sentCount++;
              } catch (err) {
                console.error(`Failed to send to ${targetChatId}:`, err);
              }
            }
            if (sentCount > 0) {
              toolResultMsg += `تم تصميم الصورة وإرسالها إلى الواتساب بنجاح (${sentCount} مجموعة)!\n`;
            }
          }
        }
      }
    }

    const finalResponse = toolResultMsg ? (textResponse + "\n" + toolResultMsg).trim() : textResponse;
    res.json({ text: finalResponse });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
