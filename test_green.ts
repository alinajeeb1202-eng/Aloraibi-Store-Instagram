import axios from 'axios';
import FormData from 'form-data';

async function run() {
  const url = `https://api.green-api.com/waInstance710722682633/sendFileByUpload/65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5`;
  const formData = new FormData();
  formData.append('chatId', '120363413046572405@g.us');
  formData.append('caption', 'Test Message with Arabic: مرحبا');
  formData.append('file', Buffer.from('hello world'), { 
     filename: 'test.txt', 
     contentType: 'text/plain' 
   });

  try {
    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}
run();
