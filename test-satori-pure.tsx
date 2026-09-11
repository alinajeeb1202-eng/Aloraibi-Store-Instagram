import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';

const amiriBold = fs.readFileSync('src/amiri-bold.ttf');

(async () => {
  const svg = await satori(
    <div style={{ display: 'flex', flexDirection: 'column', width: 800, height: 400, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
      <div dir="rtl" style={{ display: 'flex', fontSize: '60px', color: 'black' }}>
        أوقات صلاة البحرين
      </div>
      <div dir="rtl" style={{ display: 'flex', fontSize: '60px', color: 'black' }}>
        يوم الأربعاء
      </div>
    </div>,
    {
      width: 800, height: 400,
      fonts: [{ name: 'Amiri', data: amiriBold, weight: 700 }]
    }
  );
  
  const png = new Resvg(svg).render().asPng();
  fs.writeFileSync('test-pure.png', png);
  console.log("Done pure satori");
})();
