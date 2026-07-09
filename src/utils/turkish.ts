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
  return str
    .split('')
    .map((char) => UPPER_MAP[char] || char.toUpperCase())
    .join('');
}

export function turkishLower(str: string): string {
  if (!str) return '';
  return str
    .split('')
    .map((char) => LOWER_MAP[char] || char.toLowerCase())
    .join('');
}
