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
import { getRandomWord, isWordInCuratedList, getDailyWordAndLength } from './src/data/wordlist.js';
import { turkishUpper, turkishLower } from './src/utils/turkish.js';
import axios from 'axios';

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

// GET Daily Puzzle Status
app.get('/api/daily-puzzle', async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const { dateStr } = getDailyWordAndLength();
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = String(rawIp).replace(/[^a-zA-Z0-9]/g, '_');

    // Look up device-based document
    const deviceDocRef = doc(db, 'daily_puzzles', `${dateStr}_${deviceId}`);
    const deviceDocSnap = await getDoc(deviceDocRef);

    if (deviceDocSnap.exists()) {
      return res.json(deviceDocSnap.data());
    }

    // Fallback: look up IP-based document
    if (ip) {
      const ipDocRef = doc(db, 'daily_puzzles', `${dateStr}_${ip}`);
      const ipDocSnap = await getDoc(ipDocRef);
      if (ipDocSnap.exists()) {
        return res.json(ipDocSnap.data());
      }
    }

    // No existing attempts found, return clean initial state
    return res.json({
      dateStr,
      attempts: [],
      solved: false,
      failed: false
    });
  } catch (error) {
    console.error('Error fetching daily puzzle:', error);
    res.status(500).json({ error: 'Günlük bulmaca verisi alınamadı.' });
  }
});

// POST Save Daily Puzzle Progress
app.post('/api/daily-puzzle', async (req, res) => {
  try {
    const { deviceId, attempts, solved, failed } = req.body;
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const { dateStr } = getDailyWordAndLength();
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = String(rawIp).replace(/[^a-zA-Z0-9]/g, '_');

    const deviceDocRef = doc(db, 'daily_puzzles', `${dateStr}_${deviceId}`);
    
    // Check if a completed document already exists to prevent resets / replay hacks
    const existingSnap = await getDoc(deviceDocRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData.solved || existingData.failed || (existingData.attempts && existingData.attempts.length >= 6)) {
        return res.status(403).json({ error: 'Oyun tamamlandı, tekrar deneme yapılamaz.', dailyState: existingData });
      }
    }

    const dailyState = {
      dateStr,
      deviceId,
      ipAddress: String(rawIp),
      attempts: attempts || [],
      solved: !!solved,
      failed: !!failed,
      updatedAt: new Date().toISOString()
    };

    // Save to deviceId doc
    await setDoc(deviceDocRef, dailyState);

    // Save to IP doc for cheat/exploit protection
    if (ip) {
      const ipDocRef = doc(db, 'daily_puzzles', `${dateStr}_${ip}`);
      await setDoc(ipDocRef, dailyState);
    }

    res.json({ success: true, dailyState });
  } catch (error) {
    console.error('Error saving daily puzzle progress:', error);
    res.status(500).json({ error: 'Günlük bulmaca ilerlemesi kaydedilemedi.' });
  }
});

// Helper to extract a clean definition from Wikisözlük (Wiktionary) wikitext content
function extractWiktionaryDefinition(content: string, word: string): string | null {
  if (!content) return null;
  
  // Find the Turkish section index
  const trIndex = content.indexOf('== Türkçe ==') !== -1 ? content.indexOf('== Türkçe ==') : content.indexOf('==Türkçe==');
  let turkishContent = content;
  if (trIndex !== -1) {
    turkishContent = content.substring(trIndex);
    // Limit content to only the Turkish section, in case there are subsequent language sections
    const nextLangIndex = turkishContent.indexOf('==', 12);
    if (nextLangIndex !== -1) {
      turkishContent = turkishContent.substring(0, nextLangIndex);
    }
  }

  const lines = turkishContent.split('\n');
  for (const line of lines) {
    // Look for lines starting with '#' (definition lines), but skip sub-definitions (##), examples/notes (#* or #:)
    if (line.startsWith('#') && !line.startsWith('##') && !line.startsWith('#*') && !line.startsWith('#:') && line.length > 4) {
      let cleanLine = line.substring(1).trim();
      
      // Remove mediawiki links: [[meyve|meyveler]] -> meyveler, [[elma]] -> elma
      cleanLine = cleanLine.replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, p1, p2) => p2 || p1);
      
      // Remove templates: {{belediye|Türkiye}} -> "", {{Sözlük|Türkçe}} -> ""
      cleanLine = cleanLine.replace(/\{\{[^}]+\}\}/g, '');
      
      // Remove triple/double quotes for bold/italic formatting
      cleanLine = cleanLine.replace(/'''?/g, '');
      
      cleanLine = cleanLine.trim();
      if (cleanLine.length > 2) {
        return cleanLine;
      }
    }
  }
  return null;
}

// Core hybrid validation function
async function validateWordHybrid(word: string, skipLocalCheck = false): Promise<{ valid: boolean; definition: string }> {
  try {
    // 1. Türkçe kurallarına göre küçük harfe çevir
    const lowerWord = word.trim().toLocaleLowerCase('tr-TR');
    console.log(`[Hybrid Validation] Validating word: "${word}" (normalized lower: "${lowerWord}")`);

    // 2. İlk olarak bu kelimeyi bizim yerel kelime listemizde ara. Eğer yerel listede varsa doğrudan geçerli say ve internete hiç sorma.
    if (!skipLocalCheck) {
      const inCurated = isWordInCuratedList(lowerWord, lowerWord.length);
      if (inCurated) {
        console.log(`[Hybrid Validation Result] Word "${lowerWord}" found in local list. Directly VALID.`);
        return {
          valid: true,
          definition: 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.'
        };
      }
    }

    // 3. Eğer yerel listede yoksa, doğrudan Axios kullanarak Wikisözlük API'sine sorgu gönder.
    // Sorgu adresi: https://tr.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=kelime
    const url = `https://tr.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(lowerWord)}`;
    
    console.log(`[Wiktionary Query] Sending request for: "${lowerWord}"`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    const data = response.data;
    if (!data || !data.query || !data.query.pages) {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is INVALID (No query or pages found in response)`);
      return {
        valid: false,
        definition: 'Kelime Wikisözlük\'te bulunamadı.'
      };
    }

    const pages = data.query.pages;
    const pageKeys = Object.keys(pages);
    if (pageKeys.length === 0 || pageKeys[0] === '-1') {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is INVALID (Page not found / missing)`);
      return {
        valid: false,
        definition: 'Kelime Wikisözlük\'te bulunamadı.'
      };
    }

    const page = pages[pageKeys[0]];
    if (page.missing !== undefined) {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is INVALID (Page has missing property)`);
      return {
        valid: false,
        definition: 'Kelime Wikisözlük\'te bulunamadı.'
      };
    }

    if (!page.revisions || !Array.isArray(page.revisions) || page.revisions.length === 0) {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is INVALID (No revisions found)`);
      return {
        valid: false,
        definition: 'Kelime Wikisözlük\'te bulunamadı.'
      };
    }

    const content = page.revisions[0]['*'] || '';
    
    // Check if Turkish header or template exists in the content:
    // "Gelen içerik içinde dil|tr veya Türkçe kelimeleri geçiyorsa kelimeyi doğrudan geçerli say."
    const hasTurkishHeader = content.includes('dil|tr') || content.includes('Türkçe') || /==\s*Türkçe\s*==/.test(content);
    
    if (hasTurkishHeader) {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is VALID (Found Turkish section)`);
      
      // Try to extract a clean definition from the wikitext content for display
      const definition = extractWiktionaryDefinition(content, lowerWord) || 'Wikisözlük\'te kayıtlı geçerli bir Türkçe sözcüktür.';

      return {
        valid: true,
        definition
      };
    } else {
      console.log(`[Wiktionary Result] Word "${lowerWord}" is INVALID (No Turkish section found in contents)`);
      return {
        valid: false,
        definition: 'Kelime Wikisözlük\'te mevcut fakat Türkçe dilinde değil.'
      };
    }

  } catch (err: any) {
    console.error(`[Hybrid Validation Error] Failed for "${word}":`, err?.message || err);
    return {
      valid: false,
      definition: 'Sözlük doğrulama servisine şu anda erişilemiyor.'
    };
  }
}

// Endpoint to validate if a word is valid
app.post('/api/validate-word', async (req, res) => {
  try {
    const { word, length } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    // 1. Türkçe kurallarına göre küçük harfe çevir
    const lowerWord = word.trim().toLocaleLowerCase('tr-TR');
    const normalized = turkishUpper(word.trim());
    const wordLength = Number(length) || normalized.length;

    if (normalized.length !== wordLength) {
      return res.json({ valid: false, reason: 'Harf sayısı uyuşmuyor' });
    }

    // 1.1 Heuristic linguistic validation (blocks keyboard smash, repetitive letters like rrrrr before cache or API calls)
    const linguisticCheck = validateTurkishLinguistics(normalized, wordLength);
    if (!linguisticCheck.valid) {
      return res.json({
        valid: false,
        definition: linguisticCheck.reason
      });
    }

    // 2. İlk olarak bu kelimeyi bizim yerel kelime listemizde ara. Eğer yerel listede varsa doğrudan geçerli say ve internete hiç sorma.
    const inCurated = isWordInCuratedList(lowerWord, wordLength);
    if (inCurated) {
      console.log(`[Hybrid Validation - Route] Word "${lowerWord}" found in local list. Directly VALID.`);
      return res.json({
        valid: true,
        definition: 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.'
      });
    }

    // 3. Eğer yerel listede yoksa, Wikisözlük öncesi Cache / Firestore kontrol et
    const cacheKey = `${normalized}_${wordLength}`;
    if (wordCache[cacheKey]) {
      return res.json(wordCache[cacheKey]);
    }

    // Check Firestore Database
    try {
      const wordDocRef = doc(db, 'dictionary', normalized);
      const wordSnap = await Promise.race([
        getDoc(wordDocRef),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 2000))
      ]);
      if (wordSnap && wordSnap.exists()) {
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
      console.warn('Firestore database read failed/timed out:', dbErr);
    }

    // 4. Wikisözlük (Wiktionary) sorgusu
    const validationResult = await validateWordHybrid(normalized);
    wordCache[cacheKey] = validationResult;

    // Automatically save to database (non-blocking in background)
    try {
      const wordDocRef = doc(db, 'dictionary', normalized);
      setDoc(wordDocRef, {
        word: normalized,
        valid: validationResult.valid,
        definition: validationResult.definition,
        createdAt: new Date().toISOString()
      }, { merge: true }).catch(saveErr => {
        console.error('Failed to save word to Firestore in background:', saveErr);
      });
      console.log(`[Database Save] Queued word "${normalized}" (valid: ${validationResult.valid}) to save in background.`);
    } catch (saveErr) {
      console.error('Failed to save word to Firestore:', saveErr);
    }

    return res.json(validationResult);
  } catch (error: any) {
    console.error('[Word Validation ERROR]:', error?.message || error);
    res.json({
      valid: false,
      definition: 'Sözlük doğrulanamadı ve kelime listenizde bulunamadı!'
    });
  }
});

// Helper function to fetch word definition using TDK API (sozluk.gov.tr)
async function getDefinitionFromTDK(word: string): Promise<string | null> {
  try {
    const cleanWord = word.trim().toLocaleLowerCase('tr-TR');
    const url = `https://sozluk.gov.tr/goster?kemles=${encodeURIComponent(cleanWord)}`;
    console.log(`[TDK Definition] Fetching definition for: "${cleanWord}"`);
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const entry = response.data[0];
      if (entry.anlamlarListe && Array.isArray(entry.anlamlarListe) && entry.anlamlarListe.length > 0) {
        const anlam = entry.anlamlarListe[0].anlam;
        if (anlam) {
          const cleanAnlam = anlam.trim();
          if (cleanAnlam.length > 1) {
            console.log(`[TDK Definition Success] Found meaning for "${word}": ${cleanAnlam}`);
            return cleanAnlam;
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`[TDK Definition Error] Failed to get definition for "${word}" from TDK:`, err?.message || err);
  }
  return null;
}

// Helper function to fetch word definition using Gemini API
async function getDefinitionFromGemini(word: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Gemini Definition] GEMINI_API_KEY is not defined, skipping.');
    return null;
  }
  try {
    console.log(`[Gemini Definition] Fetching definition for: "${word}"`);
    
    const prompt = `Sen Türkçe dilinde bir kelime oyunu sözlük asistanısın. 
"${word}" Türkçe kelimesinin kısa, net ve tam sözlük tanımını (anlamını) ver.
Sadece kelimenin anlamını içeren tek bir açıklayıcı cümle veya kısa bir cümle grubu dön. 
Örnek cümle ekleme, başka ek açıklama yapma. Yanıt doğrudan kelimenin tanımı olsun.
Eğer kelime argo veya küfür değilse, kesinlikle anlamını açıkla. 
Örnek format: "Bir yerin veya bir şeyin sınırları dışında kalan kısım, dışarı."`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 100
      }
    });

    if (response && response.text) {
      const def = response.text.trim().replace(/^"|"$/g, '');
      if (def && def.length > 3 && !def.toLowerCase().includes('üzgünüm') && !def.toLowerCase().includes('hata')) {
        return def;
      }
    }
  } catch (err: any) {
    console.error(`[Gemini Definition Error] Failed to generate definition for "${word}":`, err?.message || err);
  }
  return null;
}

// Endpoint to fetch direct definition of any target word
app.post('/api/get-definition', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    const normalized = turkishUpper(word.trim());
    const lowerWord = word.trim().toLocaleLowerCase('tr-TR');
    const cacheKey = `definition_${normalized}`;

    // Check cache (ignore if cached definition is a generic placeholder or fallback)
    if (wordCache[cacheKey]) {
      const cachedDef = wordCache[cacheKey].definition;
      const isGeneric = !cachedDef ||
                        cachedDef === 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.' ||
                        cachedDef === 'Wikisözlük\'te kayıtlı geçerli bir Türkçe sözcüktür.' ||
                        cachedDef.includes('yüklenemedi') ||
                        cachedDef.includes('erişilemiyor') ||
                        cachedDef.includes('oyunda yer alan') ||
                        cachedDef.includes('kelime haznenizde yer alan') ||
                        cachedDef.includes('resmi sözlük tanımına şu an ulaşılamıyor');
      if (!isGeneric) {
        return res.json(wordCache[cacheKey]);
      }
    }

    // Check Firestore (ignore if database definition is a generic placeholder or fallback)
    try {
      const wordDocRef = doc(db, 'dictionary', normalized);
      const wordSnap = await Promise.race([
        getDoc(wordDocRef),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 4000))
      ]);
      if (wordSnap && wordSnap.exists()) {
        const dbData = wordSnap.data();
        if (dbData.definition) {
          const dbDef = dbData.definition;
          const isGeneric = !dbDef ||
                            dbDef === 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.' ||
                            dbDef === 'Wikisözlük\'te kayıtlı geçerli bir Türkçe sözcüktür.' ||
                            dbDef.includes('yüklenemedi') ||
                            dbDef.includes('erişilemiyor') ||
                            dbDef.includes('oyunda yer alan') ||
                            dbDef.includes('kelime haznenizde yer alan') ||
                            dbDef.includes('resmi sözlük tanımına şu an ulaşılamıyor');
          
          if (!isGeneric) {
            const dbResult = { valid: true, definition: dbDef };
            wordCache[cacheKey] = dbResult;
            console.log(`[Database Hit - Definition] Word "${normalized}" found in database:`, dbResult);
            return res.json(dbResult);
          }
        }
      }
    } catch (dbErr) {
      console.warn('Firestore database read for definition failed/timed out:', dbErr);
    }

    // 1. Fetch definition directly from word validation source (Wiktionary/Local) FIRST
    console.log(`[Get Definition] Fetching definition directly from word validation source (Wiktionary/Local) for: "${normalized}"`);
    const validationResult = await validateWordHybrid(normalized, true); // skipLocalCheck=true to force querying Wiktionary content
    let definition = validationResult.definition;

    let isGeneric = !definition ||
                    definition === 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.' ||
                    definition === 'Wikisözlük\'te kayıtlı geçerli bir Türkçe sözcüktür.' ||
                    definition.includes('doğrulandı') ||
                    definition.includes('bulunamadı') ||
                    definition.includes('yüklenemedi') ||
                    definition.includes('erişilemiyor') ||
                    definition.includes('Hata');

    // 2. Fallback to Gemini if wiktionary definition was not found or was generic, ensuring we always have a good definition
    if (isGeneric || !definition) {
      console.log(`[Get Definition] Word validation source returned generic or missing definition for "${normalized}". Trying Gemini as fallback...`);
      const geminiDef = await getDefinitionFromGemini(normalized);
      if (geminiDef) {
        definition = geminiDef;
        isGeneric = false;
      }
    }

    // Use a clean custom fallback sentence if definition is missing or generic/not found
    const isFallback = isGeneric || !definition || 
                      definition === 'Yerel kelime listesinde kayıtlı geçerli bir Türkçe sözcüktür.' ||
                      definition === 'Wikisözlük\'te kayıtlı geçerli bir Türkçe sözcüktür.' ||
                      definition.includes('bulunamadı') || 
                      definition.includes('yüklenemedi') || 
                      definition.includes('erişilemiyor') ||
                      definition.includes('oyunda yer alan') ||
                      definition.includes('kelime haznenizde yer alan') ||
                      definition.includes('resmi sözlük tanımına şu an ulaşılamıyor');

    if (isFallback) {
      definition = 'Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.';
    }

    const finalResult = {
      valid: true, // Target words are always valid in game contexts
      definition
    };

    wordCache[cacheKey] = finalResult;

    // Only save to Firestore if it's not the failure fallback
    if (definition !== 'Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.') {
      // Save definition back to Firestore dictionary (non-blocking in background)
      try {
        const wordDocRef = doc(db, 'dictionary', normalized);
        setDoc(wordDocRef, {
          word: normalized,
          valid: true,
          definition: finalResult.definition,
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(saveErr => {
          console.error('Failed to save word definition to Firestore in background:', saveErr);
        });
        console.log(`[Database Save - Definition] Queued definition for "${normalized}" to save in background.`);
      } catch (saveErr) {
        console.error('Failed to save word definition to Firestore:', saveErr);
      }
    }

    return res.json(finalResult);
  } catch (error: any) {
    console.error('[Get Definition ERROR]:', error);
    res.json({
      valid: true,
      definition: 'Bu kelimenin resmi sözlük tanımına şu an ulaşılamıyor.'
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

// Endpoint for secure user support messages / contact form (Google Play Compliance)
app.post('/api/support', async (req, res) => {
  try {
    const { email, category, message, username, userId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mesaj alanı zorunludur.' });
    }

    const ticketId = 'ticket_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const docRef = doc(db, 'support_messages', ticketId);

    const supportPayload = {
      id: ticketId,
      email: email || 'anonymous',
      category: category || 'general',
      message: message,
      username: username || 'Guest',
      userId: userId || 'unknown',
      createdAt: new Date().toISOString(),
      status: 'new'
    };

    await setDoc(docRef, supportPayload);
    console.log(`[Support Message Saved] ID: ${ticketId}, Category: ${category}, Email: ${email}`);

    res.json({ success: true, ticketId });
  } catch (error: any) {
    console.error('Support API Error:', error);
    res.status(500).json({ error: 'Mesaj iletilemedi. Sunucu hatası oluştu.' });
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
  targetWords?: string[];
  matchWordsCount?: number;
  currentRound?: number;
  roundsWon?: { [id: string]: number };
  roundsPlayed?: { [id: string]: number };
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
  rematchRequests?: Set<string>;
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
                  roundsPlayed: {
                    [challenge.challengerId]: 1,
                    [challenge.challengedId]: 1
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
            const { matchId, attempts, currentAttempt, completed, won, score, timeRemaining, kelime_bulundu_zamani, currentWordIndex } = data;
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
                if (currentWordIndex !== undefined) {
                  (player as any).currentWordIndex = currentWordIndex;
                }
                if (won) {
                  (player as any).kelime_bulundu_zamani = kelime_bulundu_zamani || Date.now();
                }

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
                        timeRemaining,
                        currentWordIndex,
                        kelime_bulundu_zamani: won ? (kelime_bulundu_zamani || Date.now()) : null
                      },
                      roundsWon: match.roundsWon || { [playerId]: 0, [opponentId]: 0 }
                    }));
                  }
                }

                if (match.matchWordsCount === 3) {
                  // Real-time 3-Round Series Match Logic (Best of 3 - First to 2 rounds won)
                  if (completed && won) {
                    if (!match.roundsWon) {
                      match.roundsWon = {};
                    }
                    for (const pId of Object.keys(match.players)) {
                      if (match.roundsWon[pId] === undefined) {
                        match.roundsWon[pId] = 0;
                      }
                    }

                    // Increment this player's round wins
                    match.roundsWon[playerId] = (match.roundsWon[playerId] || 0) + 1;

                    const pIds = Object.keys(match.players);
                    const opponentId = pIds.find(id => id !== playerId);
                    const currentRound = match.currentRound || 1;

                    const playerWinsMatch = (match.roundsWon[playerId] >= 2);
                    const opponentWinsMatch = opponentId ? ((match.roundsWon[opponentId] || 0) >= 2) : false;
                    const isLastRound = (currentRound === 3);

                    if (playerWinsMatch || opponentWinsMatch || isLastRound) {
                      // Series has ended! Compute winner based on rounds won
                      let winnerId = 'draw';
                      const r1 = match.roundsWon[pIds[0]] || 0;
                      const r2 = match.roundsWon[pIds[1]] || 0;
                      if (r1 > r2) {
                        winnerId = pIds[0];
                      } else if (r2 > r1) {
                        winnerId = pIds[1];
                      }

                      match.status = 'ended';
                      match.winnerId = winnerId;
                      (match as any).kelime_bulundu_zamani = Date.now();

                      const endPayload = JSON.stringify({
                        type: 'match_end',
                        matchId,
                        winnerId,
                        roundsWon: match.roundsWon,
                        players: match.players,
                        kelime_bulundu_zamani: (match as any).kelime_bulundu_zamani
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
                      // Advance to next round!
                      match.currentRound = currentRound + 1;
                      const nextWord = getRandomWord(match.wordLength);
                      match.targetWord = nextWord;

                      // Reset player state for the new round
                      for (const pId of Object.keys(match.players)) {
                        const p = match.players[pId];
                        p.attempts = [];
                        p.currentAttempt = 0;
                        p.completed = false;
                        p.won = false;
                        p.timeRemaining = 20;
                        p.score = 0;
                      }

                      const nextRoundPayload = JSON.stringify({
                        type: 'match_round_start',
                        matchId,
                        targetWord: nextWord,
                        currentRound: match.currentRound,
                        matchWordsCount: 3,
                        roundsWon: match.roundsWon
                      });

                      for (const pId of Object.keys(match.players)) {
                        const client = clients.get(pId);
                        if (client && client.ws.readyState === WebSocket.OPEN) {
                          client.ws.send(nextRoundPayload);
                        }
                      }
                    }
                  } else {
                    // Check for Draw (both completed and neither won)
                    const allCompleted = Object.values(match.players).every(p => p.completed);
                    const anyWon = Object.values(match.players).some(p => p.won);

                    if (allCompleted && !anyWon) {
                      if (!match.roundsWon) {
                        match.roundsWon = {};
                      }
                      for (const pId of Object.keys(match.players)) {
                        if (match.roundsWon[pId] === undefined) {
                          match.roundsWon[pId] = 0;
                        }
                      }

                      const currentRound = match.currentRound || 1;

                      if (currentRound === 3) {
                        // End of series
                        let winnerId = 'draw';
                        const pIds = Object.keys(match.players);
                        const r1 = match.roundsWon[pIds[0]] || 0;
                        const r2 = match.roundsWon[pIds[1]] || 0;
                        if (r1 > r2) {
                          winnerId = pIds[0];
                        } else if (r2 > r1) {
                          winnerId = pIds[1];
                        }

                        match.status = 'ended';
                        match.winnerId = winnerId;
                        (match as any).kelime_bulundu_zamani = Date.now();

                        const endPayload = JSON.stringify({
                          type: 'match_end',
                          matchId,
                          winnerId,
                          roundsWon: match.roundsWon,
                          players: match.players,
                          kelime_bulundu_zamani: (match as any).kelime_bulundu_zamani
                        });

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
                        // Advance to next round (draw round)
                        match.currentRound = currentRound + 1;
                        const nextWord = getRandomWord(match.wordLength);
                        match.targetWord = nextWord;

                        for (const pId of Object.keys(match.players)) {
                          const p = match.players[pId];
                          p.attempts = [];
                          p.currentAttempt = 0;
                          p.completed = false;
                          p.won = false;
                          p.timeRemaining = 20;
                          p.score = 0;
                        }

                        const nextRoundPayload = JSON.stringify({
                          type: 'match_round_start',
                          matchId,
                          targetWord: nextWord,
                          currentRound: match.currentRound,
                          matchWordsCount: 3,
                          roundsWon: match.roundsWon
                        });

                        for (const pId of Object.keys(match.players)) {
                          const client = clients.get(pId);
                          if (client && client.ws.readyState === WebSocket.OPEN) {
                            client.ws.send(nextRoundPayload);
                          }
                        }
                      }
                    }
                  }
                } else {
                  // Standard 1-Round Duel Win/Draw Conditions
                  if (completed && won) {
                    if (!match.roundsWon) {
                      match.roundsWon = {};
                    }
                    
                    // Initialize scores for all players in match if not present
                    for (const pId of Object.keys(match.players)) {
                      if (match.roundsWon[pId] === undefined) {
                        match.roundsWon[pId] = 0;
                      }
                    }

                    match.roundsWon[playerId] = (match.roundsWon[playerId] || 0) + 1;
                    match.status = 'ended';
                    match.winnerId = playerId;
                    (match as any).kelime_bulundu_zamani = kelime_bulundu_zamani || Date.now();

                    const endPayload = JSON.stringify({
                      type: 'match_end',
                      matchId,
                      winnerId: playerId,
                      roundsWon: match.roundsWon,
                      players: match.players,
                      kelime_bulundu_zamani: (match as any).kelime_bulundu_zamani
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
                    // Her iki oyuncu da 6 tahmin hakkını tamamlamış ve kimse kazanamamışsa yeni bir kelime ile oyunu devam ettir.
                    const allCompleted = Object.values(match.players).every(p => p.completed);
                    const anyWon = Object.values(match.players).some(p => p.won);

                    if (allCompleted && !anyWon) {
                      if (!match.roundsWon) {
                        match.roundsWon = {};
                      }
                      for (const pId of Object.keys(match.players)) {
                        if (match.roundsWon[pId] === undefined) {
                          match.roundsWon[pId] = 0;
                        }
                      }

                      match.status = 'ended';
                      match.winnerId = 'draw';

                      const endPayload = JSON.stringify({
                        type: 'match_end',
                        matchId,
                        winnerId: 'draw',
                        roundsWon: match.roundsWon,
                        players: match.players,
                        kelime_bulundu_zamani: null
                      });

                      // Her iki oyuncuya da bildir ve durumlarını boşta yap
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
                    }
                  }
                }
              }
            }
            break;
          }

          case 'request_rematch': {
            const { matchId } = data;
            const match = matches.get(matchId);

            if (match) {
              if (!match.rematchRequests) {
                match.rematchRequests = new Set();
              }
              match.rematchRequests.add(playerId);

              // Notify the other player
              const opponentId = Object.keys(match.players).find(id => id !== playerId);
              if (opponentId) {
                const opponent = clients.get(opponentId);
                if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                  opponent.ws.send(JSON.stringify({
                    type: 'rematch_requested',
                    by: playerId
                  }));
                }
              }

              // If both players agreed to rematch, start a new duel!
              if (match.rematchRequests.size === 2) {
                match.rematchRequests.clear();

                const newMatchId = 'match_' + Math.random().toString(36).substring(2, 9);
                const finalWordLength = match.wordLength || 5;
                const targetWord = getRandomWord(finalWordLength);
                const matchWordsCount = match.matchWordsCount || 1;

                const playerIds = Object.keys(match.players);
                const p1Id = playerIds[0];
                const p2Id = playerIds[1];

                const p1Client = clients.get(p1Id);
                const p2Client = clients.get(p2Id);

                if (p1Client && p2Client) {
                  p1Client.status = 'playing';
                  p2Client.status = 'playing';

                  const newMatch = {
                    id: newMatchId,
                    wordLength: finalWordLength,
                    targetWord,
                    matchWordsCount,
                    currentRound: 1,
                    roundsWon: {
                      [p1Id]: 0,
                      [p2Id]: 0
                    },
                    roundsPlayed: {
                      [p1Id]: 1,
                      [p2Id]: 1
                    },
                    players: {
                      [p1Id]: {
                        name: p1Client.name,
                        avatarUrl: p1Client.avatarUrl,
                        attempts: [],
                        currentAttempt: 0,
                        completed: false,
                        won: false,
                        timeRemaining: 20,
                        score: 0
                      },
                      [p2Id]: {
                        name: p2Client.name,
                        avatarUrl: p2Client.avatarUrl,
                        attempts: [],
                        currentAttempt: 0,
                        completed: false,
                        won: false,
                        timeRemaining: 20,
                        score: 0
                      }
                    },
                    status: 'playing' as const
                  };

                  matches.set(newMatchId, newMatch);

                  const startPayloadP1 = JSON.stringify({
                    type: 'match_start',
                    matchId: newMatchId,
                    targetWord,
                    wordLength: finalWordLength,
                    matchWordsCount,
                    currentRound: 1,
                    roundsWon: {
                      [p1Id]: 0,
                      [p2Id]: 0
                    },
                    opponentId: p2Id,
                    opponentName: p2Client.name,
                    players: {
                      [p1Id]: { name: p1Client.name },
                      [p2Id]: { name: p2Client.name }
                    }
                  });

                  const startPayloadP2 = JSON.stringify({
                    type: 'match_start',
                    matchId: newMatchId,
                    targetWord,
                    wordLength: finalWordLength,
                    matchWordsCount,
                    currentRound: 1,
                    roundsWon: {
                      [p1Id]: 0,
                      [p2Id]: 0
                    },
                    opponentId: p1Id,
                    opponentName: p1Client.name,
                    players: {
                      [p1Id]: { name: p1Client.name },
                      [p2Id]: { name: p2Client.name }
                    }
                  });

                  if (p1Client.ws.readyState === WebSocket.OPEN) p1Client.ws.send(startPayloadP1);
                  if (p2Client.ws.readyState === WebSocket.OPEN) p2Client.ws.send(startPayloadP2);

                  broadcastLobby();
                }
              }
            }
            break;
          }

          case 'leave_match': {
            const { matchId } = data;
            const match = matches.get(matchId);

            if (match) {
              if (match.status === 'playing') {
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
            const selfClient = clients.get(playerId);
            if (selfClient) {
              selfClient.status = 'idle';
            }

            broadcastLobby();
            break;
          }

          case 'join_matchmaking': {
            const { wordLength, matchWordsCount } = data;
            const selfClient = clients.get(playerId);
            if (!selfClient) break;

            // Radically and unconditionally reset player state and remove them from any old queue/match before joining matchmaking queue
            selfClient.status = 'idle';
            matchmakingQueue.delete(playerId);

            const requestedWordsCount = matchWordsCount || 1;
            console.log(`Player joined matchmaking queue: ${selfClient.name} (${playerId}) for ${wordLength} letters, ${requestedWordsCount} words`);
            matchmakingQueue.set(playerId, { wordLength, matchWordsCount: requestedWordsCount });

            // Look for another player in the queue with the EXACT same matchWordsCount
            let opponentId = '';
            for (const [id, info] of matchmakingQueue.entries()) {
              if (id !== playerId) {
                if (info.matchWordsCount === requestedWordsCount && info.wordLength === wordLength) {
                  opponentId = id;
                  break;
                }
              }
            }

            // Fallback: match with same matchWordsCount, even if wordLength is different
            if (!opponentId) {
              for (const [id, info] of matchmakingQueue.entries()) {
                if (id !== playerId) {
                  if (info.matchWordsCount === requestedWordsCount) {
                    opponentId = id;
                    break;
                  }
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
                const finalMatchWordsCount = requestedWordsCount || opponentInfo.matchWordsCount || 1;
                
                let targetWord = getRandomWord(finalWordLength);
                let targetWords: string[] = [targetWord];
                if (finalMatchWordsCount === 3) {
                  let w2 = getRandomWord(finalWordLength);
                  while (w2 === targetWord) {
                    w2 = getRandomWord(finalWordLength);
                  }
                  let w3 = getRandomWord(finalWordLength);
                  while (w3 === targetWord || w3 === w2) {
                    w3 = getRandomWord(finalWordLength);
                  }
                  targetWords.push(w2);
                  targetWords.push(w3);
                }
                const matchId = `match_${Date.now()}`;

                matches.set(matchId, {
                  id: matchId,
                  wordLength: finalWordLength,
                  targetWord,
                  targetWords,
                  matchWordsCount: finalMatchWordsCount,
                  currentRound: 1,
                  roundsWon: {
                    [playerId]: 0,
                    [opponentId]: 0
                  },
                  roundsPlayed: {
                    [playerId]: 1,
                    [opponentId]: 1
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
                  targetWords,
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
                  targetWords,
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
