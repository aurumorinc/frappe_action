export function getWordDifficulty(word: string): 'common' | 'complex' | 'normal' {
  if (!word || word.length === 0) return 'normal';
  
  const w = word.toLowerCase();
  
  // Very basic common words list for English
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what'
  ]);

  if (commonWords.has(w)) return 'common';
  
  // Complex if it has many special characters or is very long
  if (w.length > 10 || /[^a-z0-9]/.test(w)) return 'complex';

  return 'normal';
}

export function isCommonBigram(char1: string, char2: string): boolean {
  const bigram = (char1 + char2).toLowerCase();
  
  const commonBigrams = new Set([
    'th', 'he', 'in', 'er', 'an', 're', 'nd', 'at', 'on', 'nt',
    'ha', 'es', 'st', 'en', 'ed', 'to', 'it', 'ou', 'ea', 'hi',
    'is', 'or', 'ti', 'as', 'te', 'et', 'ng', 'of', 'al', 'de',
    'se', 'le', 'sa', 'si', 'ar', 've', 'ra', 'ld', 'ur'
  ]);

  return commonBigrams.has(bigram);
}
