import axios from 'axios';
async function run() {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=Manama&country=Bahrain&method=0`;
  const res = await axios.get(url);
  console.log("Method 0 (Shia):", res.data.data.timings);
  
  const url4 = `https://api.aladhan.com/v1/timingsByCity?city=Manama&country=Bahrain&method=4`;
  const res4 = await axios.get(url4);
  console.log("Method 4 (Makkah):", res4.data.data.timings);
}
run();
