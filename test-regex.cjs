const fs = require('fs');
const html = fs.readFileSync('taqwimalsayegh.html', 'utf8');

const midMatch = html.match(/class="prayrowtime">(\d{2}:\d{2})<\/span><span\s*class="prayrowtime">منتصف الليل/s);
if (midMatch) console.log("Midnight:", midMatch[1].trim());

