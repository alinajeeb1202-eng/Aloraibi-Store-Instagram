const axios = require('axios');
const idInstance = "710722682633";
const apiTokenInstance = "65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5";

const groups = [
  '120363428351880611@g.us',
  '120363420530353146@g.us',
  '120363404614173084@g.us',
  '120363412364222970@g.us',
  '120363402221890218@g.us'
];

(async () => {
  for (const groupId of groups) {
    try {
      // Actually there's no endpoint to get invite code from group if you are not admin.
      // But maybe we can just get the group name.
      const res = await axios.get(`https://api.green-api.com/waInstance${idInstance}/getGroupData/${apiTokenInstance}`, { data: { groupId } });
      console.log(groupId, res.data.groupName);
    } catch(err) {
      console.log(groupId, "Error");
    }
  }
})();
