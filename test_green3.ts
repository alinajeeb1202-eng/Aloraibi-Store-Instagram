import axios from 'axios';
import FormData from 'form-data';

async function run() {
  const url = `https://api.green-api.com/waInstance710722682633/sendFileByUpload/65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5`;
  const formData = new FormData();
  
  // Try sending to what they provided as Chat ID
  const testChatId = 'DQKH6rwQBNM5HwBXfeQTu6?s=cl&p=a&mlu=4&ilr=4';
  
  formData.append('chatId', testChatId);
  formData.append('caption', 'Test Message with Arabic: مرحبا');
  formData.append('file', Buffer.from('hello world'), { 
     filename: 'test.txt', 
     contentType: 'text/plain',
     knownLength: 11
   });

  try {
    const headers = { ...formData.getHeaders(), 'Content-Length': formData.getLengthSync().toString() };
    const response = await axios.post(url, formData, {
      headers
    });
    console.log("Success:", response.data);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}
run();
