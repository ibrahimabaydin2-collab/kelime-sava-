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
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout

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
Klavye tuşlamaları (asd, asdf, jkl, qwe, asda, dfg vb.), rastgele yan yana gelen uyumsuz harfler veya uydurma kelimeler kesinlikle GEÇERSİZ (valid: false) olmalıdır. 
Eğer kelime gerçek, anlamlı bir Türkçe kelime ise "valid" değerini true yap ve kısa bir Türkçe tanım ("definition") ekle.
Kelime uydurmaysa veya klavye mıncıklaması ise "valid" değerini false yap.

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
          systemInstruction: "Sen Türkçe kelime doğrulama sistemisin. Görevin, verilen kelimenin uydurma veya klavye tuşlaması (gibberish/nonsense) olmayıp, gerçek bir Türkçe sözlük kelimesi olduğunu onaylamaktır. Sadece gerçek ve anlamlı kelimeleri onaylarsın. Sonuçları her zaman JSON olarak dönersin."
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
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for TDK
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

    // Fallback if both failed
    return res.json({
      valid: false,
      definition: 'Bu kelimenin anlamı TDK sözlüğünde bulunamadı.'
    });
  } catch (error: any) {
    console.error('[Get Definition ERROR]:', error);
    res.json({
      valid: false,
      definition: 'Sözlükten anlam yüklenirken bir hata oluştu.'
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
                      }
                    }));
                  }
                }

                // Check if match should end (both players completed)
                const allCompleted = Object.values(match.players).every(p => p.completed);
                if (allCompleted) {
                  const p1Id = Object.keys(match.players)[0];
                  const p2Id = Object.keys(match.players)[1];
                  const p1 = match.players[p1Id];
                  const p2 = match.players[p2Id];

                  // Determine current round winner
                  let roundWinnerId: string | 'draw' = 'draw';
                  if (p1.won && !p2.won) {
                    roundWinnerId = p1Id;
                  } else if (!p1.won && p2.won) {
                    roundWinnerId = p2Id;
                  } else if (p1.won && p2.won) {
                    // If both won, solve in fewer attempts wins. If attempts equal, higher score/faster solver wins
                    if (p1.currentAttempt < p2.currentAttempt) {
                      roundWinnerId = p1Id;
                    } else if (p2.currentAttempt < p1.currentAttempt) {
                      roundWinnerId = p2Id;
                    } else if (p1.score > p2.score) {
                      roundWinnerId = p1Id;
                    } else if (p2.score > p1.score) {
                      roundWinnerId = p2Id;
                    }
                  }

                  // Record round win
                  if (!match.roundsWon) {
                    match.roundsWon = {
                      [p1Id]: 0,
                      [p2Id]: 0
                    };
                  }
                  if (roundWinnerId !== 'draw') {
                    match.roundsWon[roundWinnerId] = (match.roundsWon[roundWinnerId] || 0) + 1;
                  }

                  const currentRound = match.currentRound || 1;
                  const totalRounds = match.matchWordsCount || 1;

                  if (currentRound < totalRounds) {
                    // Advance to next round!
                    match.currentRound = currentRound + 1;
                    const nextTargetWord = getRandomWord(match.wordLength);
                    match.targetWord = nextTargetWord;

                    // Reset players round-specific states
                    for (const pId of [p1Id, p2Id]) {
                      match.players[pId].attempts = [];
                      match.players[pId].currentAttempt = 0;
                      match.players[pId].completed = false;
                      match.players[pId].won = false;
                      match.players[pId].timeRemaining = 20;
                    }

                    // Notify both players of the round completion and new round details
                    const nextRoundPayload = JSON.stringify({
                      type: 'match_round_start',
                      matchId,
                      targetWord: nextTargetWord,
                      currentRound: match.currentRound,
                      matchWordsCount: totalRounds,
                      roundsWon: match.roundsWon,
                      roundWinnerId,
                      players: match.players
                    });

                    const p1Client = clients.get(p1Id);
                    const p2Client = clients.get(p2Id);
                    if (p1Client && p1Client.ws.readyState === WebSocket.OPEN) {
                      p1Client.ws.send(nextRoundPayload);
                    }
                    if (p2Client && p2Client.ws.readyState === WebSocket.OPEN) {
                      p2Client.ws.send(nextRoundPayload);
                    }
                  } else {
                    // End the match!
                    match.status = 'ended';

                    // Determine overall winner based on roundsWon
                    let finalWinnerId: string | 'draw' = 'draw';
                    const r1Wins = match.roundsWon[p1Id] || 0;
                    const r2Wins = match.roundsWon[p2Id] || 0;

                    if (r1Wins > r2Wins) {
                      finalWinnerId = p1Id;
                    } else if (r2Wins > r1Wins) {
                      finalWinnerId = p2Id;
                    } else {
                      // Fallback if round wins are equal
                      finalWinnerId = roundWinnerId;
                    }

                    match.winnerId = finalWinnerId;

                    const endPayload = JSON.stringify({
                      type: 'match_end',
                      matchId,
                      winnerId: finalWinnerId,
                      roundsWon: match.roundsWon,
                      players: match.players
                    });

                    // Notify both players
                    const p1Client = clients.get(p1Id);
                    const p2Client = clients.get(p2Id);
                    if (p1Client) {
                      p1Client.status = 'idle';
                      if (p1Client.ws.readyState === WebSocket.OPEN) p1Client.ws.send(endPayload);
                    }
                    if (p2Client) {
                      p2Client.status = 'idle';
                      if (p2Client.ws.readyState === WebSocket.OPEN) p2Client.ws.send(endPayload);
                    }

                    broadcastLobby();
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
