import bidi from 'bidi-js';
import ArabicReshaper from 'arabic-reshaper';

const bidiEngine = bidi();

export function fixArabic(text: string): string {
  if (!text) return text;
  // Reshape characters
  const shaped = ArabicReshaper.convertArabic(text);
  // Get bidi levels
  const embeddingLevels = bidiEngine.getEmbeddingLevels(shaped, 'rtl');
  // Reorder string visually for LTR rendering engines like Satori
  return bidiEngine.getReorderedString(shaped, embeddingLevels);
}
