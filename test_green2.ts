import axios from 'axios';
import FormData from 'form-data';
import { getPrayerTimesForToday } from "./src/api/prayers.js";
import { generateDua } from "./src/api/gemini.js";
import { generatePrayerImage } from "./src/api/generateImage.js";

async function run() {
  const url = `https://api.green-api.com/waInstance710722682633/sendFileByUpload/65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5`;
  const prayers = await getPrayerTimesForToday();
  const dua = await generateDua();
  const imageBuffer = await generatePrayerImage(prayers, dua);
  
  const formData = new FormData();
  formData.append('chatId', '120363413046572405@g.us');
  formData.append('caption', 'Test Message Image');
  formData.append('file', imageBuffer, { 
     filename: 'prayer_times.png', 
     contentType: 'image/png' 
   });

  try {
    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}
run();
