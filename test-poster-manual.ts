import { getPrayerTimesForToday } from './src/api/prayers.js';
import { generateDua } from './src/api/gemini.js';
import { generatePrayerImage } from './src/api/generateImage.js';
import fs from 'fs';

(async () => {
  try {
    const prayers = await getPrayerTimesForToday();
    const dua = await generateDua();
    const buffer = await generatePrayerImage(prayers, dua);
    fs.writeFileSync('test-poster-final.png', buffer);
    console.log('Final poster generated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed', err);
    process.exit(1);
  }
})();
