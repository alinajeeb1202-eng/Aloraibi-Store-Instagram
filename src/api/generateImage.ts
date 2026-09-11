import puppeteer from 'puppeteer';
import { PrayerData } from './prayers.js';
import { DuaData } from './gemini.js';
import * as fs from 'fs';
import * as path from 'path';

const ahkamRules: Record<number, string> = {
  1: "يورث قصر العمر", 2: "يورث قضاء الحاجة", 3: "يطيل الشعر", 4: "يورث الغم والهم",
  5: "يورث السرور", 6: "يورث البلاء بغتة وقيل فيه نقصان وخطر", 7: "يأتيه المال من الأشراف وقيل يتمرض",
  8: "يتمرض وقيل يزيد المال", 9: "يورث داء في ظاهر البدن", 10: "يصير عزيزًا محترمًا وقيل يزيد همه وغمه",
  11: "يصير مغمومًا", 12: "يصير وجيهًا بين الخلق عزيزًا", 13: "يورث الخصومة مع شخص",
  14: "يصير فرحًا", 15: "يصير فرحًا وقيل يحصل مراده", 16: "يصير محزونًا",
  17: "وسط لا ضرر ولا نفع", 18: "يورث المال", 19: "يورث القدرة وقيل يورث الغنى",
  20: "يورث الأمن من الملامة وقيل يخلص من الغم", 21: "يصله مال من الأكابر", 22: "يورث الإفلاس",
  23: "يصلح لكل شيء", 24: "يصلح لكل شيء وقيل يخلص من الإفلاس", 25: "يصلح لكل شيء وقيل يخلص من الغم",
  26: "يخلص من البلاء وقيل من الغموم", 27: "يورث الندم وقيل يصلح", 28: "لا يصلح كثيرًا وقيل يصلح",
  29: "يتحرز من الخلق وقيل تقضى حاجته", 30: "يصير مأمونًا"
};

export interface ImageTheme { skyTop?: string; skyBottom?: string; }

export async function generatePrayerImage(prayers: PrayerData, dua: DuaData, theme?: ImageTheme): Promise<Buffer> {
  const hukm = ahkamRules[prayers.hijriDayNum] || "لا يصلح كثيرًا";
  const skyTop = theme?.skyTop || '#101c26';
  const skyBottom = theme?.skyBottom || '#3b5063';

  // Read the local font files to inject as base64
  const amiriRegular = fs.readFileSync(path.join(process.cwd(), 'src', 'amiri.ttf')).toString('base64');
  const amiriBold = fs.readFileSync(path.join(process.cwd(), 'src', 'amiri-bold.ttf')).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Amiri';
          src: url(data:font/ttf;base64,${amiriRegular}) format('truetype');
          font-weight: 400;
        }
        @font-face {
          font-family: 'Amiri';
          src: url(data:font/ttf;base64,${amiriBold}) format('truetype');
          font-weight: 700;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          width: 1080px;
          min-height: 1650px;
          font-family: 'Amiri', serif;
          background-color: #f5f7f8;
          position: relative;
          color: #111;
          display: flex;
          flex-direction: column;
        }
        .sky {
          position: absolute;
          top: 0; left: 0; right: 0; height: 400px;
          background: linear-gradient(to bottom, ${skyTop}, ${skyBottom});
          z-index: 1;
        }
        .container {
          position: relative;
          z-index: 2;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-bottom: 60px;
        }
        .top-section {
          background-color: white;
          border-radius: 350px 350px 20px 20px;
          margin: 40px auto 0;
          padding: 40px 40px 30px;
          width: 700px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          border: 3px solid #8e7a5d;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .circle-title {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 4px solid #8e7a5d;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 25px;
          background: #fff;
        }
        .circle-title span {
          font-size: 42px;
          font-weight: 700;
          text-align: center;
          line-height: 1.2;
        }
        .main-title {
          font-size: 50px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        .weekday {
          font-size: 60px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        .hijri-date {
          font-size: 56px;
          color: #a82c2c;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .gregorian-date {
          font-size: 44px;
          font-weight: 700;
        }
        .middle-section {
          display: flex;
          flex-direction: row;
          padding: 50px 60px;
          justify-content: space-between;
          align-items: flex-start;
        }
        .left-side {
          width: 48%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .salawat {
          font-size: 60px;
          font-weight: 700;
          text-align: center;
          line-height: 1.4;
          margin-bottom: 30px;
        }
        .divider {
          display: flex;
          align-items: center;
          margin-bottom: 30px;
        }
        .divider-icon {
          width: 40px; height: 40px; margin-left: 20px;
        }
        .divider-line-group {
          display: flex; align-items: center;
        }
        .divider-line {
          width: 40px; height: 3px; background-color: #8e7a5d; margin-left: 10px; margin-right: 10px;
        }
        .divider-dot {
          width: 10px; height: 10px; border-radius: 50%; background-color: #6b4c3a;
        }
        .ahkam-title {
          font-size: 34px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        .ahkam-value {
          font-size: 32px;
          font-weight: 700;
          display: flex;
          align-items: center;
          text-align: center;
        }
        .flower {
          font-size: 40px;
          margin-left: 10px;
          color: #8e7a5d;
        }
        .right-side {
          width: 48%;
          display: flex;
          flex-direction: column;
        }
        .time-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
        }
        .time-box {
          width: 47%;
          background-color: #e6ccaa;
          border: 4px solid #8e7a5d;
          border-radius: 20px;
          padding: 15px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 3px 3px 6px rgba(0,0,0,0.1);
        }
        .time-name {
          font-size: 38px;
          font-weight: 700;
        }
        .time-val {
          font-size: 46px;
          font-weight: 700;
          direction: ltr;
        }
        .midnight-box {
          width: 100%;
          background-color: #e6ccaa;
          border: 4px solid #8e7a5d;
          border-radius: 20px;
          padding: 15px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 3px 3px 6px rgba(0,0,0,0.1);
        }
        .bottom-section {
          width: 90%;
          margin: 0 auto;
          background-color: #f1ede4;
          border: 5px solid #1a1a1a;
          border-radius: 30px;
          padding: 50px 40px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .corner {
          position: absolute;
          width: 40px; height: 40px;
        }
        .top-right { top: 15px; right: 15px; border-top: 5px solid #111; border-right: 5px solid #111; border-radius: 0 15px 0 0; }
        .top-left { top: 15px; left: 15px; border-top: 5px solid #111; border-left: 5px solid #111; border-radius: 15px 0 0 0; }
        .bottom-right { bottom: 15px; right: 15px; border-bottom: 5px solid #111; border-right: 5px solid #111; border-radius: 0 0 15px 0; }
        .bottom-left { bottom: 15px; left: 15px; border-bottom: 5px solid #111; border-left: 5px solid #111; border-radius: 0 0 0 15px; }
        
        .dua-text {
          font-size: 50px;
          font-weight: 700;
          text-align: center;
          line-height: 1.5;
          max-width: 900px;
        }
        .dua-source {
          font-size: 34px;
          color: #992a2a;
          text-align: center;
          margin-top: 30px;
          font-weight: 700;
        }
        .footer {
          height: 80px;
          width: 100%;
          background-color: #bd9a40;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-size: 32px;
          font-weight: 700;
          z-index: 5;
          margin-top: auto;
        }
      </style>
    </head>
    <body>
      <div class="sky"></div>
      <div class="container">
        
        <div class="top-section">
          <div class="circle-title">
            <span>أوقات<br>الصلاة</span>
          </div>
          <div class="main-title">أوقات صلاة البحرين</div>
          <div class="weekday">يوم ${prayers.weekday}</div>
          <div class="hijri-date">${prayers.hijriDate}</div>
          <div class="gregorian-date">${prayers.gregorianDate}</div>
        </div>

        <div class="middle-section">
          <div class="right-side">
            <div class="time-row">
              <div class="time-box">
                <span class="time-name">الصبح</span>
                <span class="time-val">${prayers.Fajr}</span>
              </div>
              <div class="time-box">
                <span class="time-name">الشروق</span>
                <span class="time-val">${prayers.Sunrise}</span>
              </div>
            </div>
            <div class="time-row">
              <div class="time-box">
                <span class="time-name">الظهرين</span>
                <span class="time-val">${prayers.Dhuhr}</span>
              </div>
              <div class="time-box">
                <span class="time-name">العشاءين</span>
                <span class="time-val">${prayers.Maghrib}</span>
              </div>
            </div>
            <div class="midnight-box">
              <span class="time-name">منتصف الليل</span>
              <span class="time-val">${prayers.Midnight}</span>
            </div>
          </div>

          <div class="left-side">
            <div class="salawat">اللهم صل على محمد وآل محمد</div>
            
            <div class="divider">
              <svg class="divider-icon" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div class="divider-line-group">
                 <div class="divider-line"></div>
                 <div class="divider-dot"></div>
                 <div class="divider-line"></div>
              </div>
            </div>

            <div class="ahkam-title">أحكام حلق الرأس لليوم ${prayers.hijriDayNum}</div>
            <div class="ahkam-value">
              <span class="flower">✿</span>
              <span>كذلك وقيل ${hukm}</span>
            </div>
          </div>
        </div>

        <div class="bottom-section">
          <div class="corner top-right"></div>
          <div class="corner top-left"></div>
          <div class="corner bottom-right"></div>
          <div class="corner bottom-left"></div>
          
          <div class="dua-text">${dua.text}</div>
          <div class="dua-source">${dua.source}</div>
        </div>
      </div>

      <div class="footer">
        رحم الله من قرأ سورة الفاتحة وأهدى ثوابها لأرواح الشهداء والمؤمنين والمؤمنات
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1500 });
    await page.setContent(html, { waitUntil: 'load' });
    
    // Convert to Buffer instead of Uint8Array for broader compatibility
    const screenshot = await page.screenshot({ type: 'png', fullPage: true });
    return Buffer.from(screenshot);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
