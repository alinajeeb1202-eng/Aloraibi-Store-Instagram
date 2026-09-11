import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';

const amiriBold = fs.readFileSync('src/amiri-bold.ttf');

(async () => {
  const svg = await satori(
    <div dir="rtl" style={{ display: 'flex', fontSize: '60px', color: 'black' }}>
      مرحبا بك في عالم البرمجة
    </div>,
    {
      width: 800, height: 200,
      fonts: [{ name: 'Amiri', data: amiriBold, weight: 700 }]
    }
  );
  
  const png = new Resvg(svg).render().asPng();
  fs.writeFileSync('test-ar.png', png);
  console.log("Done");
})();
