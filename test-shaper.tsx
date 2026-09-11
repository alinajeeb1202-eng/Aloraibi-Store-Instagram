import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';
import ArabicReshaper from 'arabic-reshaper';

const amiriBold = fs.readFileSync('src/amiri-bold.ttf');
const text = ArabicReshaper.convertArabic("مرحبا بك في عالم البرمجة البحرين");

(async () => {
  const svg = await satori(
    <div style={{ display: 'flex', flexDirection: 'column', width: 800, height: 200, backgroundColor: 'white' }}>
      {/* Test 1: no dir rtl */}
      <div style={{ display: 'flex', fontSize: '60px', color: 'black' }}>
        {text}
      </div>
      {/* Test 2: dir rtl */}
      <div dir="rtl" style={{ display: 'flex', fontSize: '60px', color: 'red' }}>
        {text}
      </div>
    </div>,
    {
      width: 800, height: 400,
      fonts: [{ name: 'Amiri', data: amiriBold, weight: 700 }]
    }
  );
  
  const png = new Resvg(svg).render().asPng();
  fs.writeFileSync('test-ar-shaper.png', png);
  console.log("Done. Text:", text);
})();
