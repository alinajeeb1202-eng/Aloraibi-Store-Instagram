import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';
import ArabicReshaper from 'arabic-reshaper';

const amiriBold = fs.readFileSync('src/amiri-bold.ttf');
const text = ArabicReshaper.convertArabic("الفجر 04:02");

(async () => {
  const svg = await satori(
    <div dir="rtl" style={{ display: 'flex', fontSize: '60px', color: 'black' }}>
      {text}
    </div>,
    {
      width: 800, height: 200,
      fonts: [{ name: 'Amiri', data: amiriBold, weight: 700 }]
    }
  );
  
  const png = new Resvg(svg).render().asPng();
  fs.writeFileSync('test-bidi.png', png);
  console.log("Done");
})();
