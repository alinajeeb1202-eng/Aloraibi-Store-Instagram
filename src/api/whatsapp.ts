import axios from 'axios';
import FormData from 'form-data';

export async function sendImageToWhatsApp(
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
  imageBuffer: Buffer,
  caption: string
) {
  // Use the standard green-api domain
  const url = `https://api.green-api.com/waInstance${idInstance}/sendFileByUpload/${apiTokenInstance}`;

  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('caption', caption);
  formData.append('file', imageBuffer, { 
    filename: 'prayer_times.png', 
    contentType: 'image/png',
    knownLength: imageBuffer.length
  });

  try {
    const headers = { ...formData.getHeaders() };
    try {
      headers['Content-Length'] = formData.getLengthSync().toString();
    } catch (e) {
      console.warn('Could not calculate form data length');
    }

    const response = await axios.post(url, formData, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export async function sendTextMessageToWhatsApp(
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
  message: string
) {
  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

  try {
    const response = await axios.post(
      url,
      {
        chatId,
        message
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp text message:', error);
    throw error;
  }
}
