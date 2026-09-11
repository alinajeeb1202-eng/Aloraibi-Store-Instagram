import dotenv from "dotenv";
dotenv.config();
import { getPrayerTimesForToday } from "./src/api/prayers.js";
import { generateDua } from "./src/api/gemini.js";
import { generatePrayerImage } from "./src/api/generateImage.js";
import * as fs from 'fs';

async function run() {
  const prayers = await getPrayerTimesForToday();
  const dua = {text: "الغضب يفسد الإيمان كما يفسد الخل العسل.", source: "عن الرسول الأكرم (ص) - وسائل الشيعة"};
  const img = await generatePrayerImage(prayers, dua);
  fs.writeFileSync('test_output.png', img);
  console.log('Saved test_output.png');
}
run();
