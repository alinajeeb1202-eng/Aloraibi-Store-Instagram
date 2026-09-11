const axios = require('axios');
const idInstance = "710722682633";
const apiTokenInstance = "65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5";

(async () => {
  try {
    const res = await axios.post(`https://api.green-api.com/waInstance${idInstance}/JoinGroupViaLink/${apiTokenInstance}`, {
      inviteLink: "ItIArbzqFBTDlWzI7QfKW0" 
    });
    console.log("Join Group Result:", res.data);
  } catch (err) {
    console.error("Error joining group:", err.response ? err.response.data : err.message);
  }
})();
