import bidi from 'bidi-js';
import ArabicReshaper from 'arabic-reshaper';

const bidiEngine = bidi();
const shaped = ArabicReshaper.convertArabic("الفجر 04:02");
const embeddingLevels = bidiEngine.getEmbeddingLevels(shaped, 'rtl');
// bidi-js exports getReorderedString(text, levels, isRtl) ? 
// let's print methods
console.log(Object.keys(bidiEngine));
