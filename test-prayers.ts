import { getPrayerTimesForToday } from './src/api/prayers';
getPrayerTimesForToday().then(console.log).catch(console.error);
