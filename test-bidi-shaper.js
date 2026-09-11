import bidi from 'bidi-js';
import ArabicReshaper from 'arabic-reshaper';

const bidiEngine = bidi();
function fixArabic(text) {
  const shaped = ArabicReshaper.convertArabic(text);
  const embeddingLevels = bidiEngine.getEmbeddingLevels(shaped, 'rtl');
  return bidiEngine.getReorderedString(shaped, embeddingLevels);
}

console.log(fixArabic("الفجر 04:02"));
console.log(fixArabic("يوم الأربعاء"));
