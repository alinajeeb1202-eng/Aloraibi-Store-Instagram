import axios from 'axios';
import { format } from 'date-fns';

export interface PrayerData {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Maghrib: string;
  Midnight: string;
  hijriDate: string; // e.g. "25 ربيع الأول 1448 هـ"
  gregorianDate: string; // e.g. "08 سبتمبر 2026 م"
  weekday: string; // e.g. "الثلاثاء"
  hijriDayNum: number;
}

function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h.toString().padStart(2, '0')}:${mStr}`;
}

function calculateShiaMidnight(sunsetStr: string, fajrStr: string): string {
  const [sH, sM] = sunsetStr.split(':').map(Number);
  const [fH, fM] = fajrStr.split(':').map(Number);
  
  const sunsetMinutes = sH * 60 + sM;
  const fajrMinutes = (fH + 24) * 60 + fM;
  
  const midMinutes = sunsetMinutes + Math.floor((fajrMinutes - sunsetMinutes) / 2);
  const midH24 = Math.floor(midMinutes / 60) % 24;
  const midM = midMinutes % 60;
  
  return `${midH24.toString().padStart(2, '0')}:${midM.toString().padStart(2, '0')}`;
}

export interface PrayerOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  maghrib: number;
}

export async function getPrayerTimesForToday(): Promise<PrayerData> {
  const dateStr = format(new Date(), 'dd-MM-yyyy');
  const aladhanUrl = `https://api.aladhan.com/v1/timingsByCity?city=Manama&country=Bahrain&method=0&date=${dateStr}`;

  let taqwimTimes = {
    fajr: '',
    sunrise: '',
    dhuhr: '',
    maghrib: '',
    midnight: ''
  };

  try {
    const formattedDate = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Bahrain', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());
    
    // Fetch from Taqwim Al-Sayegh
    const htmlResponse = await axios.get(`https://taqwimalsayegh.com/home/post?country=Bahrain&city=Manama&currentTime=${formattedDate}&_token=`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    const html = htmlResponse.data;
    
    // Extract times using Regex parsing from HTML
    const fajrMatch = html.match(/>([^<]+)<\/span>\s*<span[^>]*>أذان الفجر/s);
    if (fajrMatch) taqwimTimes.fajr = fajrMatch[1].trim();
    
    const sunriseMatch = html.match(/class="prayrowtime">(\d{2}:\d{2})<\/span><span\s*class="prayrowtime">شروق/s);
    if (sunriseMatch) taqwimTimes.sunrise = sunriseMatch[1].trim();
    
    const dhuhrMatch = html.match(/أذان الظهر.*?<div class="praytime">\s*(\d{2}:\d{2})/s);
    if (dhuhrMatch) taqwimTimes.dhuhr = dhuhrMatch[1].trim();
    
    const maghribMatch = html.match(/أذان المغرب.*?<div class="praytime">\s*(\d{2}:\d{2})/s);
    if (maghribMatch) taqwimTimes.maghrib = maghribMatch[1].trim();

    const midMatch = html.match(/class="prayrowtime">(\d{2}:\d{2})<\/span><span\s*class="prayrowtime">منتصف الليل/s);
    if (midMatch) taqwimTimes.midnight = midMatch[1].trim();
    
  } catch (err) {
    console.error('Error fetching from Taqwim Al-Sayegh, falling back to Aladhan', err);
  }

  try {
    const response = await axios.get(aladhanUrl);
    const data = response.data.data;
    const timings = data.timings;
    const hijri = data.date.hijri;
    const gregorian = data.date.gregorian;
    
    // Format dates in Arabic
    const arMonthsHijri: Record<number, string> = {
      1: 'محرم', 2: 'صفر', 3: 'ربيع الأول', 4: 'ربيع الآخر',
      5: 'جمادى الأولى', 6: 'جمادى الآخرة', 7: 'رجب', 8: 'شعبان',
      9: 'رمضان', 10: 'شوال', 11: 'ذو القعدة', 12: 'ذو الحجة'
    };
    
    const arMonthsGregorian: Record<number, string> = {
      1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
      5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
      9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
    };

    const hijriMonth = arMonthsHijri[parseInt(hijri.month.number)] || hijri.month.ar;
    const gregorianMonth = arMonthsGregorian[parseInt(gregorian.month.number)] || gregorian.month.en;
    
    const hijriDayNum = parseInt(hijri.day);
    const hijriDateStr = `${hijri.day} ${hijriMonth} ${hijri.year} هـ`;
    const gregorianDateStr = `${gregorian.day} ${gregorianMonth} ${gregorian.year} م`;
    
    // Weekday in Arabic
    const daysAr: Record<string, string> = {
      'Sunday': 'الأحد', 'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
    };
    const weekdayAr = daysAr[gregorian.weekday.en] || gregorian.weekday.en;

    const shiaMidnight24 = calculateShiaMidnight(timings.Sunset, timings.Fajr);

    return {
      Fajr: to12Hour(taqwimTimes.fajr || timings.Fajr),
      Sunrise: to12Hour(taqwimTimes.sunrise || timings.Sunrise),
      Dhuhr: to12Hour(taqwimTimes.dhuhr || timings.Dhuhr),
      Maghrib: to12Hour(taqwimTimes.maghrib || timings.Maghrib),
      Midnight: to12Hour(taqwimTimes.midnight || shiaMidnight24),
      hijriDate: hijriDateStr,
      gregorianDate: gregorianDateStr,
      weekday: weekdayAr,
      hijriDayNum
    };
  } catch (err) {
    console.error('Error fetching prayer times', err);
    throw err;
  }
}
