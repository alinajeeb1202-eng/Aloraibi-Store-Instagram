const axios = require('axios');
const idInstance = "710722682633";
const apiTokenInstance = "65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5";

(async () => {
  try {
    const res = await axios.get(`https://api.green-api.com/waInstance${idInstance}/getChats/${apiTokenInstance}`);
    console.log(res.data.filter(chat => chat.id.includes('@g.us')));
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
