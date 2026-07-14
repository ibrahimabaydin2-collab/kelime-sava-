/**
 * Robust Turkish uppercase and lowercase conversions
 * to handle dotted/dotless I, circumflexes, and other Turkish special characters
 * consistently across both browser and server-side Node.js environments.
 */

const UPPER_MAP: { [key: string]: string } = {
  'a': 'A', 'b': 'B', 'c': 'C', 'ç': 'Ç', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'ğ': 'Ğ',
  'h': 'H', 'ı': 'I', 'i': 'İ', 'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O',
  'ö': 'Ö', 'p': 'P', 'r': 'R', 's': 'S', 'ş': 'Ş', 't': 'T', 'u': 'U', 'ü': 'Ü', 'v': 'V',
  'y': 'Y', 'z': 'Z',
  'â': 'A', 'î': 'I', 'û': 'U',
  'Â': 'A', 'Î': 'I', 'Û': 'U'
};

const LOWER_MAP: { [key: string]: string } = {
  'A': 'a', 'B': 'b', 'C': 'c', 'Ç': 'ç', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'Ğ': 'ğ',
  'H': 'h', 'I': 'ı', 'İ': 'i', 'J': 'j', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o',
  'Ö': 'ö', 'P': 'p', 'R': 'r', 'S': 's', 'Ş': 'ş', 'T': 't', 'U': 'u', 'Ü': 'ü', 'V': 'v',
  'Y': 'y', 'Z': 'z',
  'â': 'a', 'î': 'ı', 'û': 'u',
  'Â': 'a', 'Î': 'ı', 'Û': 'u'
};

export function turkishUpper(str: string): string {
  if (!str) return '';
  // Normalize string to NFC composed form and remove any combining dot above character (u0307)
  const normalized = str.normalize('NFC').replace(/\u0307/g, '');
  return normalized
    .split('')
    .map((char) => UPPER_MAP[char] || char.toUpperCase())
    .join('');
}

export function turkishLower(str: string): string {
  if (!str) return '';
  // Normalize string to NFC composed form and remove any combining dot above character (u0307)
  const normalized = str.normalize('NFC').replace(/\u0307/g, '');
  return normalized
    .split('')
    .map((char) => LOWER_MAP[char] || char.toLowerCase())
    .join('');
}

export function validateTurkishLinguistics(word: string, length: number): { valid: boolean; reason: string } {
  const normalized = turkishLower(word)
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

  // 1. Check for valid characters: Turkish letters only (standard lower alphabet is a-z except q, w, x)
  const validCharsRegex = /^[a-z]+$/;
  if (!validCharsRegex.test(normalized)) {
    return { valid: false, reason: 'Kelime Türkçe alfabesinde bulunmayan geçersiz karakterler barındırıyor.' };
  }

  // 1.1 Keyboard smash detector (reject common sequences of keys adjacent on keyboards)
  const keyboardSmashes = [
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm',
    'asda', 'sada', 'dasa', 'fasa', 'ghjg', 'jklj', 'qweq', 'rewr'
  ];
  for (const smash of keyboardSmashes) {
    if (normalized.includes(smash)) {
      return { valid: false, reason: 'Anlamsız klavye tuşlaması veya ardışık harf grubu tespit edildi.' };
    }
  }

  // 2. Must contain at least one vowel
  const vowels = /[aeiou]/g;
  const vowelMatches = normalized.match(vowels);
  if (!vowelMatches || vowelMatches.length === 0) {
    return { valid: false, reason: 'Türkçe kelimelerde en az bir sesli harf bulunmalıdır.' };
  }

  // 3. Repeating characters: No character can be repeated 3 or more times consecutively.
  for (let i = 0; i < normalized.length - 2; i++) {
    if (normalized[i] === normalized[i + 1] && normalized[i] === normalized[i + 2]) {
      return { valid: false, reason: 'Aynı harf ardışık 3 veya daha fazla kez tekrarlanamaz.' };
    }
  }

  // 4. Consecutive consonants: maximum 4 consecutive consonants (e.g. "ekspres" has 4: "kspr").
  const consecutiveConsonantsRegex = /[^aeiou]{5,}/;
  if (consecutiveConsonantsRegex.test(normalized)) {
    return { valid: false, reason: 'Türkçe hece yapısına aykırı ardışık sessiz harf grubu barındırıyor.' };
  }

  // 5. Letter diversity: If length >= 3 and unique letters is 1 (e.g. "rrrrr" or "aaaaa"), it's definitely invalid
  const uniqueChars = new Set(normalized.split(''));
  if (uniqueChars.size === 1 && length >= 3) {
    return { valid: false, reason: 'Tek bir harfin tekrarından oluşan bir kelime geçerli olamaz.' };
  }

  // 6. Minimum vowel count: For words of length >= 7, there must be at least 2 vowels.
  const vowelCount = vowelMatches.length;
  if (length >= 7 && vowelCount < 2) {
    return { valid: false, reason: 'Uzun Türkçe kelimelerde en az 2 sesli harf bulunmalıdır.' };
  }

  return { valid: true, reason: '' };
}
