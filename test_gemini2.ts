import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "اكتب حديثاً شريفاً قصيراً جداً (سطر واحد فقط) عن الأخلاق أو المواعظ من مصادر الشيعة (مثل الكافي، وسائل الشيعة، نهج البلاغة). أرجع النتيجة على شكل JSON يحتوي على حقلين: 'text' (نص الحديث بدون الراوي الأول)، و 'source' (مصدر الحديث واسم المعصوم، مثلاً: 'عن الإمام علي (ع) - نهج البلاغة'). لا تكتب أي شيء آخر سوى JSON صالح.",
      config: {
        responseMimeType: "application/json"
      }
    });
    console.log(response.text);
  } catch (e: any) {
    console.log("Error 3.6:", e.message);
  }
}
run();
