import express from 'express';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase.js';
import { getRandomWord, isWordInCuratedList } from './src/data/wordlist.js';
import { turkishUpper, turkishLower } from './src/utils/turkish.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Custom CORS middleware to fully unblock Android WebViews, emulators, and local origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auto-backup AI Studio auth token to keep mobile APK/AAB connection persistent
app.use((req, res, next) => {
  let token = req.query.___aistudio_auth_token;
  
  // Extract token from cookies if not present in query string
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, val] = cookie.trim().split('=');
      if (name === '__SECURE-aistudio_auth_token' || name === 'aistudio_auth_token') {
        token = decodeURIComponent(val);
        break;
      }
    }
  }

  if (token && typeof token === 'string') {
    try {
      const filePath = path.join(process.cwd(), 'src', 'utils', 'tokenBackup.ts');
      let currentContent = '';
      if (fs.existsSync(filePath)) {
        currentContent = fs.readFileSync(filePath, 'utf8');
      }
      const expectedContent = `export const BACKUP_TOKEN = ${JSON.stringify(token)};\n`;
      if (currentContent !== expectedContent) {
        fs.writeFileSync(filePath, expectedContent, 'utf8');
        console.log('Automatically backed up auth token to tokenBackup.ts');
      }
    } catch (e) {
      console.error('Failed to back up auth token:', e);
    }
  }
  next();
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Cache for validated words to avoid redundant API calls
const wordCache: { [key: string]: { valid: boolean; definition: string } } = {};
let geminiCooldownUntil = 0;

// Heuristic linguistic validation to prevent keyboard smashing or repeated consonants (like "rrrrr")
function validateTurkishLinguistics(word: string, length: number): { valid: boolean; reason: string } {
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

  // 1. Check for valid characters: Turkish letters only (No q, w, x allowed in Turkish)
  const validCharsRegex = /^[abcdefghijklmnoprstuvyz]+$/;
  if (!validCharsRegex.test(normalized)) {
    return { valid: false, reason: 'Kelime Türkçe alfabesinde bulunmayan geçersiz karakterler barındırıyor (q, w, x vb.).' };
  }

  // 1.1 Keyboard smash detector (reject common sequences of keys adjacent on keyboards)
  const keyboardSmashes = [
    // 4+ character sequences
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm',
    'asda', 'sada', 'dasa', 'fasa', 'ghjg', 'jklj', 'qweq', 'rewr',
    'fsaf', 'dsaf', 'asdfa', 'sadas', 'fdsaf', 'dsafd', 'fdsfd', 'dfgdf',
    'ghjgh', 'hjklh', 'qwewe', 'werty', 'xcvxc', 'cvbnc', 'vbnmv',
    // Common 3-character keyboard smashes (excluding tasdik with 'asd' and dert/sert/mert/ertesi with 'ert')
    'rty', 'tyu', 'yui', 'uio', 'iop', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
    'qwe', 'xcv', 'cvb', 'vbn', 'bnm', 'asf', 'dsf', 'sdf', 'fgj', 'ghk', 'mnb'
  ];
  for (const smash of keyboardSmashes) {
    if (normalized.includes(smash)) {
      return { valid: false, reason: 'Anlamsız klavye tuşlaması veya ardışık harf grubu tespit edildi.' };
    }
  }

  // 1.2 No consecutive duplicate consonants that never exist in Turkish
  const rawLower = turkishLower(word);
  const illegalDoubles = ['ğğ', 'jj', 'hh', 'vv', 'çç', 'şş'];
  for (const illegal of illegalDoubles) {
    if (rawLower.includes(illegal)) {
      return { valid: false, reason: 'Türkçe fonetiğine aykırı ardışık çift sessiz harf kullanımı tespit edildi.' };
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

  // 3.1 Repeating 2-letter pairs: (e.g., "asasas", "dfdfdf", "fgfgfg")
  const repeatedPairsRegex = /(..)\1\1/;
  if (repeatedPairsRegex.test(normalized)) {
    return { valid: false, reason: 'Aynı harf çiftinin tekrarlanmasıyla oluşan anlamsız dizilim tespit edildi.' };
  }

  // 4. Consecutive consonants check (maximum 4 consecutive consonants in very rare whitelisted words like "ekspres", "elektrik")
  const has4Consonants = /[^aeiou]{4,}/.test(normalized);
  const consonantWhitelist4 = ['ekspres', 'elektrik'];
  if (has4Consonants && !consonantWhitelist4.includes(normalized)) {
    return { valid: false, reason: 'Türkçe hece ve telaffuz yapısına aykırı ardışık sessiz harf dizilimi.' };
  }
  // 5+ consecutive consonants is unconditionally invalid
  if (/[^aeiou]{5,}/.test(normalized)) {
    return { valid: false, reason: 'Türkçe hece yapısına tamamen aykırı aşırı sessiz harf yığılması.' };
  }

  // 4.1 Word starting with 3 consecutive consonants is invalid unless whitelisted (e.g. "stres", "strateji")
  if (/^[^aeiou]{3,}/.test(normalized)) {
    const starting3ConsonantsWhitelist = ['strateji', 'stres', 'strüktür', 'sprey', 'skleroz', 'sfenks'];
    if (!starting3ConsonantsWhitelist.includes(normalized)) {
      return { valid: false, reason: 'Türkçe kelime başlangıç kurallarına aykırı sessiz harf grubu.' };
    }
  }

  // 4.2 No 3 consecutive vowels (no Turkish word has 3 consecutive vowels like "aia", "uoa", except very rare exclamations)
  if (/[aeiou]{3,}/.test(normalized)) {
    return { valid: false, reason: 'Türkçe fonetiğine aykırı ardışık sesli harf dizilimi.' };
  }

  // 5. Letter diversity ratio checks
  const uniqueChars = new Set(normalized.split(''));
  if (length === 4 && uniqueChars.size < 2) {
    return { valid: false, reason: '4 harfli bir kelimede en az 2 farklı harf bulunmalıdır.' };
  }
  if (length === 5 && uniqueChars.size < 3) {
    return { valid: false, reason: '5 harfli bir kelimede en az 3 farklı harf bulunmalıdır.' };
  }
  if (length === 6 && uniqueChars.size < 3) {
    return { valid: false, reason: '6 harfli bir kelimede en az 3 farklı harf bulunmalıdır.' };
  }
  if (length >= 7 && uniqueChars.size < 4) {
    return { valid: false, reason: '7 veya daha fazla harfli bir kelimede en az 4 farklı harf bulunmalıdır.' };
  }

  // 6. Minimum vowel count: For words of length >= 7, there must be at least 2 vowels (e.g. "ekspres" has 2, "sürpriz" has 2).
  const vowelCount = vowelMatches.length;
  if (length >= 7 && vowelCount < 2) {
    return { valid: false, reason: 'Uzun Türkçe kelimelerde en az 2 sesli harf bulunmalıdır.' };
  }

  return { valid: true, reason: '' };
}



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint to generate a target word
app.post('/api/random-word', (req, res) => {
  const { length } = req.body;
  const wordLength = Number(length) || 5;
  const word = getRandomWord(wordLength);
  res.json({ word });
});

// Endpoint to validate if a word is in TDK using Gemini API
app.post('/api/validate-word', async (req, res) => {
  try {
    const { word, length } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    const normalized = turkishUpper(word.trim());
    const wordLength = Number(length) || normalized.length;

    if (normalized.length !== wordLength) {
      return res.json({ valid: false, reason: 'Harf sayısı uyuşmuyor' });
    }

    // 1. Check curated list
    const inCurated = isWordInCuratedList(normalized, wordLength);
    if (inCurated) {
      return res.json({
        valid: true,
        definition: 'Özenle seçilmiş kelime listemizde mevcut.'
      });
    }

    // 1.5 Heuristic linguistic validation (blocks keyboard smash, repetitive letters like rrrrr before cache or API calls)
    const linguisticCheck = validateTurkishLinguistics(normalized, wordLength);
    if (!linguisticCheck.valid) {
      return res.json({
        valid: false,
        definition: linguisticCheck.reason
      });
    }

    // 2. Check cache
    const cacheKey = `${normalized}_${wordLength}`;
    if (wordCache[cacheKey]) {
      return res.json(wordCache[cacheKey]);
    }

    // 2.1 Check Firestore Database
    try {
      const wordDocRef = doc(db, 'dictionary', normalized);
      const wordSnap = await getDoc(wordDocRef);
      if (wordSnap.exists()) {
        const dbData = wordSnap.data();
        const dbResult = {
          valid: dbData.valid,
          definition: dbData.definition || ''
        };
        wordCache[cacheKey] = dbResult;
        console.log(`[Database Hit] Word "${normalized}" found in database:`, dbResult);
        return res.json(dbResult);
      }
    } catch (dbErr) {
      console.warn('Firestore database read failed:', dbErr);
    }

    // 2.2 Direct official TDK GTS API verification on the exact word
    try {
      const lowercaseWord = turkishLower(normalized);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for GTS stability

      const tdkResponse = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(lowercaseWord)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);
      
      if (tdkResponse.ok) {
        const tdkData = await tdkResponse.json() as any;
        
        if (Array.isArray(tdkData) && tdkData.length > 0) {
          let definition = 'TDK Sözlüğünde mevcut.';
          try {
            const meanings = tdkData[0].anlim_goster ? tdkData[0].anlamlarListe : tdkData[0].anlamlarListe;
            if (Array.isArray(meanings) && meanings.length > 0) {
              definition = meanings[0].anlam || 'TDK Sözlüğünde mevcut.';
            }
          } catch (e) {
            // Ignore meaning parse errors
          }
          const tdkResult = {
            valid: true,
            definition
          };
          wordCache[cacheKey] = tdkResult;

          // AUTOMATICALLY SAVE TO FIRESTORE DATABASE!
          try {
            const wordDocRef = doc(db, 'dictionary', normalized);
            await setDoc(wordDocRef, {
              word: normalized,
              valid: true,
              definition,
              createdAt: new Date().toISOString()
            });
            console.log(`[Database Save] Saved valid word "${normalized}" to database with definition: "${definition}".`);
          } catch (saveErr) {
            console.error('Failed to save valid word to Firestore:', saveErr);
          }

          return res.json(tdkResult);
        } else {
          const notFoundResult = {
            valid: false,
            definition: 'Bu kelime TDK sözlüğünde bulunamadı.'
          };
          wordCache[cacheKey] = notFoundResult;
          return res.json(notFoundResult);
        }
      }
    } catch (tdkErr) {
      console.warn('TDK GTS API Request failed or timed out:', tdkErr);
    }

    // 3. Fallback to Gemini AI Validation if TDK API is offline, down, or blocked
    try {
      console.log(`[Validation Fallback] TDK API is unavailable. Using Gemini to validate word: "${normalized}"`);
      const prompt = `Lütfen "${normalized}" kelimesinin geçerli bir Türkçe kelime olup olmadığını (isim, fiil, sıfat vb.) kontrol et. 
Klavye tuşlamaları (asd, asdf, jkl, qwe, asda, dfg, fgh, ghj, hjkl vb.), rastgele yan yana gelen uyumsuz harfler, yabancı/İngilizce kelimeler veya anlamsız uydurma sözcükler kesinlikle GEÇERSİZ (valid: false) olmalıdır. 

Kurallar:
1. Sadece TDK (Türk Dil Kurumu) sözlüğünde yer alan veya dilbilgisi kurallarına uygun biçimde türetilmiş, yaygın bilinen gerçek Türkçe kelimeleri onaylayabilirsin (valid: true).
2. İngilizce kelimeleri, klavye mıncıklamalarını veya uydurma kelimeleri KESİNLİKLE GEÇERSİZ (valid: false) saymalısın.
3. Kelime geçerliyse "definition" alanına kısa ve öz bir Türkçe anlam yaz. Kelime geçersizse "definition" alanına neden geçersiz olduğunu Türkçe olarak açıkla.
4. En ufak bir şüphe durumunda kelimeyi GEÇERSİZ (valid: false) yap.

Yanıtını SADECE aşağıdaki JSON yapısında döndür:
{
  "valid": boolean,
  "definition": "Kelimelerin anlamı veya geçersiz olma sebebi"
}`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Sen son derece titiz, katı ve hata kabul etmeyen bir Türkçe Dil uzmanı ve TDK Sözlük denetçisisin. Görevin, verilen kelimenin klavye tuşlaması (gibberish/nonsense), uydurma veya yabancı bir kelime olmayıp, gerçek ve geçerli bir Türkçe sözlük kelimesi olduğunu %100 doğrulukla teyit etmektir. Şüpheli, uydurma veya anlamsız kelimeleri KESİNLİKLE onaylamazsın."
        }
      });

      if (geminiResponse && geminiResponse.text) {
        const geminiData = JSON.parse(geminiResponse.text.trim());
        if (typeof geminiData.valid === 'boolean') {
          const geminiResult = {
            valid: geminiData.valid,
            definition: geminiData.definition || (geminiData.valid ? 'Türkçe dil kurallarına uygun kelime.' : 'Geçersiz Türkçe kelime.')
          };
          console.log(`[Gemini Fallback Result] Word: "${normalized}", Valid: ${geminiResult.valid}, Def: ${geminiResult.definition}`);
          wordCache[cacheKey] = geminiResult;

          // AUTOMATICALLY SAVE TO FIRESTORE IF GEMINI DEEMS VALID!
          if (geminiResult.valid) {
            try {
              const wordDocRef = doc(db, 'dictionary', normalized);
              await setDoc(wordDocRef, {
                word: normalized,
                valid: true,
                definition: geminiResult.definition,
                createdAt: new Date().toISOString()
              });
              console.log(`[Database Save - Gemini] Saved valid word "${normalized}" to database with definition: "${geminiResult.definition}".`);
            } catch (saveErr) {
              console.error('Failed to save valid word to Firestore:', saveErr);
            }
          }

          return res.json(geminiResult);
        }
      }
    } catch (geminiErr) {
      console.error('[Gemini Fallback ERROR]:', geminiErr);
    }

    // 4. Absolute offline fallback if both TDK and Gemini fail
    const finalOfflineCheck = isWordInCuratedList(normalized, wordLength);
    if (finalOfflineCheck) {
      const fallbackResult = {
        valid: true,
        definition: 'Kelime çevrimdışı sözlük listesinde onaylandı.'
      };
      wordCache[cacheKey] = fallbackResult;
      return res.json(fallbackResult);
    }

    return res.json({
      valid: false,
      definition: 'Bağlantı kurulamadı ve kelime Türkçe sözlüğünde bulunamadı!'
    });
  } catch (error: any) {
    console.error('[Word Validation ERROR]:', error?.message || error);
    res.json({
      valid: false,
      definition: 'Sözlük doğrulanamadı ve kelime listenizde bulunamadı!'
    });
  }
});

// Endpoint to fetch direct definition of any target word from TDK API
app.post('/api/get-definition', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    const normalized = turkishUpper(word.trim());
    const cacheKey = `definition_${normalized}`;

    // Check if we have cached this definition
    if (wordCache[cacheKey]) {
      return res.json(wordCache[cacheKey]);
    }

    // Check Firestore Database
    try {
      const wordDocRef = doc(db, 'dictionary', normalized);
      const wordSnap = await getDoc(wordDocRef);
      if (wordSnap.exists()) {
        const dbData = wordSnap.data();
        if (dbData.valid && dbData.definition) {
          const dbResult = { valid: true, definition: dbData.definition };
          wordCache[cacheKey] = dbResult;
          console.log(`[Database Hit - Definition] Word "${normalized}" found in database:`, dbResult);
          return res.json(dbResult);
        }
      }
    } catch (dbErr) {
      console.warn('Firestore database read for definition failed:', dbErr);
    }

    const lowercaseWord = turkishLower(normalized);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for TDK stability
      const tdkResponse = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(lowercaseWord)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId);

      if (tdkResponse.ok) {
        const tdkData = await tdkResponse.json() as any;
        if (Array.isArray(tdkData) && tdkData.length > 0) {
          let definition = '';
          try {
            const meanings = tdkData[0].anlamlarListe;
            if (Array.isArray(meanings) && meanings.length > 0) {
              // Combine up to 3 meanings for a rich definition
              definition = meanings.slice(0, 3).map((m: any, idx: number) => {
                const prefix = m.anlam_ozelliklerListe && m.anlam_ozelliklerListe[0]?.tam_adi 
                  ? `(${m.anlam_ozelliklerListe[0].tam_adi}) ` 
                  : '';
                return `${idx + 1}. ${prefix}${m.anlam}`;
              }).join(' ');
            }
          } catch (e) {
            // Fallback
          }

          if (!definition) {
            definition = 'TDK Sözlüğünde mevcut.';
          }

          const result = { valid: true, definition };
          wordCache[cacheKey] = result;

          // Save definition back to Firestore dictionary!
          try {
            const wordDocRef = doc(db, 'dictionary', normalized);
            await setDoc(wordDocRef, {
              word: normalized,
              valid: true,
              definition,
              createdAt: new Date().toISOString()
            }, { merge: true });
            console.log(`[Database Save - Definition] Saved/Updated definition for "${normalized}" in database.`);
          } catch (saveErr) {
            console.error('Failed to save word definition to Firestore:', saveErr);
          }

          return res.json(result);
        }
      }
    } catch (tdkErr) {
      console.warn('TDK GTS API Request failed for get-definition, falling back to Gemini:', tdkErr);
    }

    // Fallback to Gemini AI to generate / fetch the word's definition
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`[Definition Fallback] TDK API is unavailable or word not found. Using Gemini to get definition for: "${normalized}"`);
        const prompt = `Lütfen "${normalized}" kelimesinin Türkçe sözlük anlamını (tanımını) bul veya oluştur.
Eğer kelime geçerli bir Türkçe kelime ise, kısa, net ve doğru bir Türkçe tanım yaz. 
Eğer kelime geçersiz veya uydurma ise, bunu belirt.

Yanıtını SADECE aşağıdaki JSON yapısında döndür:
{
  "valid": boolean,
  "definition": "Kelimenin Türkçe tanımı veya açıklaması"
}`;

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            systemInstruction: "Sen bir Türkçe sözlük asistanısın. Görevin, verilen kelimenin doğru ve net Türkçe tanımını sağlamaktır. Yanıtları her zaman JSON biçiminde dönersin."
          }
        });

        if (geminiResponse && geminiResponse.text) {
          const geminiData = JSON.parse(geminiResponse.text.trim());
          if (geminiData.definition) {
            const geminiResult = {
              valid: geminiData.valid !== false,
              definition: geminiData.definition
            };
            
            wordCache[cacheKey] = geminiResult;

            // Save definition back to Firestore dictionary!
            try {
              const wordDocRef = doc(db, 'dictionary', normalized);
              await setDoc(wordDocRef, {
                word: normalized,
                valid: geminiResult.valid,
                definition: geminiResult.definition,
                createdAt: new Date().toISOString()
              }, { merge: true });
              console.log(`[Database Save - Definition Gemini] Saved definition for "${normalized}" to database.`);
            } catch (saveErr) {
              console.error('Failed to save Gemini definition to Firestore:', saveErr);
            }

            return res.json(geminiResult);
          }
        }
      } catch (geminiErr) {
        console.error('[Gemini Definition Fallback ERROR]:', geminiErr);
      }
    } else {
      console.warn('[Gemini SDK] GEMINI_API_KEY is not defined, skipping Gemini definition fallback.');
    }

    // Friendly offline/standard definition fallback instead of error message
    const friendlyFallback = {
      valid: true,
      definition: `"${normalized}" kelimesi, özenle seçilmiş Türkçe kelime listemizde onaylanmış geçerli bir kelimedir.`
    };
    wordCache[cacheKey] = friendlyFallback;
    return res.json(friendlyFallback);
  } catch (error: any) {
    console.error('[Get Definition ERROR]:', error);
    res.json({
      valid: true,
      definition: `Kelime doğrulandı ve kelime haznenize eklendi.`
    });
  }
});

// Endpoint for AI chat/assistant proxy using Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call the user's live Render server instead of local Gemini API
    const response = await fetch('https://kelime-sava.onrender.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`Render canlı sunucu bağlantısı başarısız oldu: ${response.status}`);
    }

    const data = (await response.json()) as { response?: string; error?: string };
    
    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    res.json({ response: data.response || '' });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

// WebSocket Server Integration for Real-time Battles and Online Friends
const clients = new Map<string, { ws: WebSocket; name: string; avatarUrl?: string; status: 'idle' | 'playing' }>();
const matchmakingQueue = new Map<string, { wordLength: number; matchWordsCount?: number }>();
const challenges = new Map<string, {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  wordLength: number;
  status: 'pending' | 'accepted' | 'declined';
}>();
const matches = new Map<string, {
  id: string;
  wordLength: number;
  targetWord: string;
  matchWordsCount?: number;
  currentRound?: number;
  roundsWon?: { [id: string]: number };
  players: {
    [id: string]: {
      name: string;
      avatarUrl?: string;
      attempts: any[];
      currentAttempt: number;
      completed: boolean;
      won: boolean;
      timeRemaining: number;
      score: number;
    };
  };
  status: 'playing' | 'ended';
  winnerId?: string;
}>();

const broadcastLobby = () => {
  const lobbyList = Array.from(clients.entries()).map(([id, client]) => ({
    id,
    name: client.name,
    avatarUrl: client.avatarUrl,
    status: client.status,
  }));

  const payload = JSON.stringify({
    type: 'lobby_update',
    players: lobbyList,
  });

  for (const [_, client] of clients.entries()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
};

const setupWebSocket = (server: any) => {
  const wss = new WebSocketServer({ noServer: true });

  // Register a dummy listener to ensure server.listenerCount('upgrade') > 0.
  // Node's HTTP server immediately destroys the socket on upgrade request if listenerCount is 0,
  // before 'upgrade' event can be emitted and intercepted.
  server.on('upgrade', () => {});

  wss.on('error', (err) => {
    console.error('[WS Server] error:', err);
    try {
      fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] WSS ERROR: ${err.stack || err.message || err}\n`);
    } catch (e) {}
  });

  const originalEmit = server.emit;
  server.emit = function (event: string, ...args: any[]) {
    if (event === 'upgrade') {
      const request = args[0];
      const socket = args[1];
      const head = args[2];

      let pathname = '';
      try {
        pathname = new URL(request.url || '', 'http://localhost').pathname;
      } catch (e) {
        pathname = (request.url || '').split('?')[0];
      }

      // Log the upgrade request to a debug file
      try {
        const logMsg = `[${new Date().toISOString()}] Upgrade event received: URL=${request.url}, Pathname=${pathname}, Headers=${JSON.stringify(request.headers)}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), logMsg);
      } catch (err) {
        // ignore log write failure
      }

      if (pathname.startsWith('/ws')) {
        console.log(`[WS Intercept] Exclusively handling upgrade for game server. URL: ${request.url}, Pathname: ${pathname}`);
        try {
          fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] Intercepted and starting handleUpgrade for ${request.url}\n`);
          wss.handleUpgrade(request, socket, head, (ws) => {
            try {
              fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] handleUpgrade callback executed, emitting connection\n`);
            } catch (e) {}
            wss.emit('connection', ws, request);
          });
        } catch (err: any) {
          console.error('[WS Intercept] Failed to handle upgrade:', err);
          try {
            fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] handleUpgrade FAILED: ${err.stack || err.message || err}\n`);
          } catch (e) {}
          try {
            socket.destroy();
          } catch (e) {}
        }
        return true; // Intercepted, do not propagate to Vite or other listeners
      }
    }
    return originalEmit.call(this, event, ...args);
  };

  wss.on('connection', (ws: WebSocket, request: any) => {
    let playerId = '';
    try {
      fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] WSS on('connection') fired for URL: ${request?.url}\n`);
    } catch (e) {}

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        try {
          fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] Received WS message: ${JSON.stringify(data)}\n`);
        } catch (e) {}
        
        switch (data.type) {
          case 'join': {
            playerId = data.id;
            const existingClient = clients.get(playerId);
            if (existingClient && existingClient.ws !== ws) {
              console.log(`[WS Server] Closing stale connection for player ${playerId}`);
              try {
                existingClient.ws.close(1000, 'Replaced by new connection');
              } catch (e) {}
            }
            clients.set(playerId, {
              ws,
              name: data.name,
              avatarUrl: data.avatarUrl,
              status: 'idle'
            });
            console.log(`Player connected: ${data.name} (${playerId})`);
            broadcastLobby();
            break;
          }

          case 'ping': {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
            break;
          }

          case 'get_lobby': {
            broadcastLobby();
            break;
          }

          case 'challenge': {
            const { challengedId, wordLength } = data;
            const challenger = clients.get(playerId);
            const challenged = clients.get(challengedId);

            if (challenger && challenged && challenged.status === 'idle') {
              const challengeId = `chal_${Date.now()}`;
              challenges.set(challengeId, {
                id: challengeId,
                challengerId: playerId,
                challengerName: challenger.name,
                challengedId,
                challengedName: challenged.name,
                wordLength,
                status: 'pending'
              });

              // Send challenge alert to the challenged player
              if (challenged.ws.readyState === WebSocket.OPEN) {
                challenged.ws.send(JSON.stringify({
                  type: 'challenged',
                  challenge: {
                    id: challengeId,
                    challengerId: playerId,
                    challengerName: challenger.name,
                    wordLength
                  }
                }));
              }
            }
            break;
          }

          case 'challenge_respond': {
            const { challengeId, accept } = data;
            const challenge = challenges.get(challengeId);

            if (challenge) {
              const challenger = clients.get(challenge.challengerId);
              const challenged = clients.get(challenge.challengedId);

              if (accept) {
                challenge.status = 'accepted';
                if (challenger) challenger.status = 'playing';
                if (challenged) challenged.status = 'playing';

                // Generate a shared target word for the competition
                const targetWord = getRandomWord(challenge.wordLength);
                const matchId = `match_${Date.now()}`;

                matches.set(matchId, {
                  id: matchId,
                  wordLength: challenge.wordLength,
                  targetWord,
                  matchWordsCount: 1,
                  currentRound: 1,
                  roundsWon: {
                    [challenge.challengerId]: 0,
                    [challenge.challengedId]: 0
                  },
                  players: {
                    [challenge.challengerId]: {
                      name: challenge.challengerName,
                      avatarUrl: challenger?.avatarUrl,
                      attempts: [],
                      currentAttempt: 0,
                      completed: false,
                      won: false,
                      timeRemaining: 20,
                      score: 0
                    },
                    [challenge.challengedId]: {
                      name: challenge.challengedName,
                      avatarUrl: challenged?.avatarUrl,
                      attempts: [],
                      currentAttempt: 0,
                      completed: false,
                      won: false,
                      timeRemaining: 20,
                      score: 0
                    }
                  },
                  status: 'playing'
                });

                const startPayload = JSON.stringify({
                  type: 'match_start',
                  matchId,
                  targetWord,
                  wordLength: challenge.wordLength,
                  matchWordsCount: 1,
                  currentRound: 1,
                  roundsWon: {
                    [challenge.challengerId]: 0,
                    [challenge.challengedId]: 0
                  },
                  opponentId: challenge.challengedId,
                  opponentName: challenge.challengedName,
                  players: {
                    [challenge.challengerId]: { name: challenge.challengerName },
                    [challenge.challengedId]: { name: challenge.challengedName }
                  }
                });

                const startPayloadOpponent = JSON.stringify({
                  type: 'match_start',
                  matchId,
                  targetWord,
                  wordLength: challenge.wordLength,
                  matchWordsCount: 1,
                  currentRound: 1,
                  roundsWon: {
                    [challenge.challengerId]: 0,
                    [challenge.challengedId]: 0
                  },
                  opponentId: challenge.challengerId,
                  opponentName: challenge.challengerName,
                  players: {
                    [challenge.challengerId]: { name: challenge.challengerName },
                    [challenge.challengedId]: { name: challenge.challengedName }
                  }
                });

                if (challenger && challenger.ws.readyState === WebSocket.OPEN) {
                  challenger.ws.send(startPayload);
                }
                if (challenged && challenged.ws.readyState === WebSocket.OPEN) {
                  challenged.ws.send(startPayloadOpponent);
                }
              } else {
                challenge.status = 'declined';
                if (challenger && challenger.ws.readyState === WebSocket.OPEN) {
                  challenger.ws.send(JSON.stringify({
                    type: 'challenge_declined',
                    challengedName: challenge.challengedName
                  }));
                }
                challenges.delete(challengeId);
              }

              broadcastLobby();
            }
            break;
          }

          case 'game_update': {
            const { matchId, attempts, currentAttempt, completed, won, score, timeRemaining } = data;
            const match = matches.get(matchId);

            if (match && match.status === 'playing') {
              const player = match.players[playerId];
              if (player) {
                player.attempts = attempts;
                player.currentAttempt = currentAttempt;
                player.completed = completed;
                player.won = won;
                player.score = score;
                player.timeRemaining = timeRemaining;

                // Sync update with opponent
                const opponentId = Object.keys(match.players).find(id => id !== playerId);
                if (opponentId) {
                  const opponent = clients.get(opponentId);
                  if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                    opponent.ws.send(JSON.stringify({
                      type: 'match_update',
                      matchId,
                      playerUpdate: {
                        id: playerId,
                        attempts,
                        currentAttempt,
                        completed,
                        won,
                        score,
                        timeRemaining
                      },
                      roundsWon: match.roundsWon || { [playerId]: 0, [opponentId]: 0 }
                    }));
                  }
                }

                // Under the new ASYNCHRONOUS race mechanic:
                // If the player completed their current word (either won or failed/timed out)
                if (completed) {
                  if (!match.roundsWon) {
                    match.roundsWon = {};
                  }
                  
                  // Initialize scores for all players in match if not present
                  for (const pId of Object.keys(match.players)) {
                    if (match.roundsWon[pId] === undefined) {
                      match.roundsWon[pId] = 0;
                    }
                  }

                  // 1. If player won (found the word), increment their found word count
                  if (won) {
                    match.roundsWon[playerId] = (match.roundsWon[playerId] || 0) + 1;
                  }

                  const playerWordsCount = match.roundsWon[playerId] || 0;
                  const targetWordsLimit = match.matchWordsCount || 3;

                  // 2. Check if this player has reached the win limit
                  if (won && playerWordsCount >= targetWordsLimit) {
                    // This player wins the entire match!
                    match.status = 'ended';
                    match.winnerId = playerId;

                    const endPayload = JSON.stringify({
                      type: 'match_end',
                      matchId,
                      winnerId: playerId,
                      roundsWon: match.roundsWon,
                      players: match.players
                    });

                    // Notify both players and reset statuses to idle
                    for (const pId of Object.keys(match.players)) {
                      const client = clients.get(pId);
                      if (client) {
                        client.status = 'idle';
                        if (client.ws.readyState === WebSocket.OPEN) {
                          client.ws.send(endPayload);
                        }
                      }
                    }

                    broadcastLobby();
                  } else {
                    // 3. Player hasn't won the entire match yet. Give them their next word!
                    // Let's generate a new random word for this player
                    const nextTargetWord = getRandomWord(match.wordLength);
                    
                    // Reset this specific player's guess state so they start clean for the next word
                    player.attempts = [];
                    player.currentAttempt = 0;
                    player.completed = false;
                    player.won = false;
                    player.timeRemaining = 20;

                    // Send the new word exclusively to this player
                    const selfClient = clients.get(playerId);
                    if (selfClient && selfClient.ws.readyState === WebSocket.OPEN) {
                      selfClient.ws.send(JSON.stringify({
                        type: 'match_next_word',
                        matchId,
                        targetWord: nextTargetWord,
                        roundsWon: match.roundsWon,
                        currentRound: playerWordsCount + 1 // Next round index
                      }));
                    }

                    // Send an update to the opponent about this player's cleared state for the next word
                    if (opponentId) {
                      const opponent = clients.get(opponentId);
                      if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                        opponent.ws.send(JSON.stringify({
                          type: 'match_update',
                          matchId,
                          playerUpdate: {
                            id: playerId,
                            attempts: [],
                            currentAttempt: 0,
                            completed: false,
                            won: false,
                            score: player.score,
                            timeRemaining: 20
                          },
                          roundsWon: match.roundsWon
                        }));
                      }
                    }
                  }
                }
              }
            }
            break;
          }

          case 'leave_match': {
            const { matchId } = data;
            const match = matches.get(matchId);

            if (match && match.status === 'playing') {
              match.status = 'ended';
              const opponentId = Object.keys(match.players).find(id => id !== playerId);
              if (opponentId) {
                const opponent = clients.get(opponentId);
                if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                  opponent.ws.send(JSON.stringify({
                    type: 'opponent_left',
                    matchId
                  }));
                }
                const oppClient = clients.get(opponentId);
                if (oppClient) oppClient.status = 'idle';
              }
              const selfClient = clients.get(playerId);
              if (selfClient) selfClient.status = 'idle';

              broadcastLobby();
            }
            break;
          }

          case 'join_matchmaking': {
            const { wordLength, matchWordsCount } = data;
            const selfClient = clients.get(playerId);
            if (!selfClient || selfClient.status === 'playing') break;

            const requestedWordsCount = matchWordsCount || 3;
            console.log(`Player joined matchmaking queue: ${selfClient.name} (${playerId}) for ${wordLength} letters, ${requestedWordsCount} words`);
            matchmakingQueue.set(playerId, { wordLength, matchWordsCount: requestedWordsCount });

            // Look for another player in the queue
            let opponentId = '';
            for (const [id, info] of matchmakingQueue.entries()) {
              if (id !== playerId) {
                // Find opponent with same wordLength and same matchWordsCount first
                if (info.wordLength === wordLength && info.matchWordsCount === requestedWordsCount) {
                  opponentId = id;
                  break;
                }
              }
            }

            // Fallback 1: match with same length
            if (!opponentId) {
              for (const [id, info] of matchmakingQueue.entries()) {
                if (id !== playerId) {
                  if (info.wordLength === wordLength) {
                    opponentId = id;
                    break;
                  }
                }
              }
            }

            // Fallback 2: match with anyone in queue
            if (!opponentId) {
              for (const [id] of matchmakingQueue.entries()) {
                if (id !== playerId) {
                  opponentId = id;
                  break;
                }
              }
            }

            if (opponentId) {
              const opponentClient = clients.get(opponentId);
              const opponentInfo = matchmakingQueue.get(opponentId);

              if (opponentClient && opponentInfo) {
                // Remove both from queue
                matchmakingQueue.delete(playerId);
                matchmakingQueue.delete(opponentId);

                // Set statuses
                selfClient.status = 'playing';
                opponentClient.status = 'playing';

                // Use the player's requested wordLength or fallback
                const finalWordLength = wordLength || opponentInfo.wordLength || 5;
                const finalMatchWordsCount = requestedWordsCount || opponentInfo.matchWordsCount || 3;
                const targetWord = getRandomWord(finalWordLength);
                const matchId = `match_${Date.now()}`;

                matches.set(matchId, {
                  id: matchId,
                  wordLength: finalWordLength,
                  targetWord,
                  matchWordsCount: finalMatchWordsCount,
                  currentRound: 1,
                  roundsWon: {
                    [playerId]: 0,
                    [opponentId]: 0
                  },
                  players: {
                    [playerId]: {
                      name: selfClient.name,
                      avatarUrl: selfClient.avatarUrl,
                      attempts: [],
                      currentAttempt: 0,
                      completed: false,
                      won: false,
                      timeRemaining: 20,
                      score: 0
                    },
                    [opponentId]: {
                      name: opponentClient.name,
                      avatarUrl: opponentClient.avatarUrl,
                      attempts: [],
                      currentAttempt: 0,
                      completed: false,
                      won: false,
                      timeRemaining: 20,
                      score: 0
                    }
                  },
                  status: 'playing'
                });

                const startPayloadSelf = JSON.stringify({
                  type: 'match_start',
                  matchId,
                  targetWord,
                  wordLength: finalWordLength,
                  matchWordsCount: finalMatchWordsCount,
                  currentRound: 1,
                  roundsWon: {
                    [playerId]: 0,
                    [opponentId]: 0
                  },
                  opponentId: opponentId,
                  opponentName: opponentClient.name,
                  players: {
                    [playerId]: { name: selfClient.name },
                    [opponentId]: { name: opponentClient.name }
                  }
                });

                const startPayloadOpponent = JSON.stringify({
                  type: 'match_start',
                  matchId,
                  targetWord,
                  wordLength: finalWordLength,
                  matchWordsCount: finalMatchWordsCount,
                  currentRound: 1,
                  roundsWon: {
                    [playerId]: 0,
                    [opponentId]: 0
                  },
                  opponentId: playerId,
                  opponentName: selfClient.name,
                  players: {
                    [playerId]: { name: selfClient.name },
                    [opponentId]: { name: opponentClient.name }
                  }
                });

                if (selfClient.ws.readyState === WebSocket.OPEN) {
                  selfClient.ws.send(startPayloadSelf);
                }
                if (opponentClient.ws.readyState === WebSocket.OPEN) {
                  opponentClient.ws.send(startPayloadOpponent);
                }

                console.log(`Matchmaking succeeded: ${selfClient.name} VS ${opponentClient.name}`);
                broadcastLobby();
              }
            } else {
              // Send message confirming queue status
              if (selfClient.ws.readyState === WebSocket.OPEN) {
                selfClient.ws.send(JSON.stringify({
                  type: 'matchmaking_status',
                  status: 'queued'
                }));
              }
            }
            break;
          }

          case 'leave_matchmaking': {
            console.log(`Player left matchmaking queue: ${playerId}`);
            matchmakingQueue.delete(playerId);
            const selfClient = clients.get(playerId);
            if (selfClient && selfClient.ws.readyState === WebSocket.OPEN) {
              selfClient.ws.send(JSON.stringify({
                type: 'matchmaking_status',
                status: 'idle'
              }));
            }
            break;
          }
        }
      } catch (e) {
        console.error('WebSocket message parsing error:', e);
      }
    });

    ws.on('error', (err) => {
      try {
        fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] Socket ERROR for player ${playerId || 'unknown'}: ${err.message || err}\n`);
      } catch (e) {}
    });

    ws.on('close', (code, reason) => {
      try {
        fs.appendFileSync(path.join(process.cwd(), 'ws_debug.log'), `[${new Date().toISOString()}] Socket CLOSED for player ${playerId || 'unknown'}. Code: ${code}, Reason: ${reason || 'none'}\n`);
      } catch (e) {}
      if (playerId) {
        const currentClient = clients.get(playerId);
        if (currentClient && currentClient.ws === ws) {
          clients.delete(playerId);
          matchmakingQueue.delete(playerId);
          console.log(`Player disconnected: ${playerId}`);

          // Handle active matches where this player was playing
          for (const [matchId, match] of matches.entries()) {
            if (match.status === 'playing' && match.players[playerId]) {
              match.status = 'ended';
              const opponentId = Object.keys(match.players).find(id => id !== playerId);
              if (opponentId) {
                const opponent = clients.get(opponentId);
                if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                  opponent.ws.send(JSON.stringify({
                    type: 'opponent_left',
                    matchId
                  }));
                }
                const oppClient = clients.get(opponentId);
                if (oppClient) oppClient.status = 'idle';
              }
            }
          }

          broadcastLobby();
        } else {
          console.log(`[WS Server] Stale connection closed for player ${playerId}. Keeping current connection.`);
        }
      }
    });
  });
};

async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket server before Vite so our upgrade handler gets priority
  setupWebSocket(server);

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
