import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import React from 'react';
import ArabicReshaper from 'arabic-reshaper';
import bidi from 'bidi-js';

const amiriBold = fs.readFileSync('src/amiri-bold.ttf');
const bidiEngine = bidi();

function fixArabic(text: string) {
  if (!text) return text;
  const shaped = ArabicReshaper.convertArabic(text);
  // Get bidi levels
  const embeddingLevels = bidiEngine.getEmbeddingLevels(shaped, 'rtl');
  
  // Reorder according to BIDI algorithm
  // Wait, bidi-js provides a method to get the visual string
  // Let's check how to use bidi-js
  return shaped; // Let's see if satori's dir="rtl" is enough
}

// Actually bidi-js usage:
// const visual = bidiEngine.getReorderedString(shaped, embeddingLevels);
// But wait, getReorderedString is not directly a function of bidiEngine? Let's check.
