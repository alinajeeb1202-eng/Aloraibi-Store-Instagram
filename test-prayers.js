import { getPrayerTimesForToday } from './src/api/prayers.js';
getPrayerTimesForToday().then(console.log).catch(console.error);
