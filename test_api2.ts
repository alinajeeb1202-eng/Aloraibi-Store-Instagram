import { getPrayerTimesForToday } from './src/api/prayers.js';
async function run() {
  const data = await getPrayerTimesForToday();
  console.log(data);
}
run();
