import axios from 'axios';

async function run() {
  const url = "https://api.green-api.com/waInstance710722682633/getContacts/65f60bac9d514fdf90e696b0a7556a9d47399d720aad40c0b5";
  try {
    const response = await axios.get(url);
    const groups = response.data.filter((c: any) => c.type === 'group' || c.id.endsWith('@g.us'));
    console.log(JSON.stringify(groups, null, 2));
  } catch (err) {
    console.error(err?.message || err);
  }
}
run();
