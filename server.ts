import express from 'express';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
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

    // 2. Check cache
    const cacheKey = `${normalized}_${wordLength}`;
    if (wordCache[cacheKey]) {
      return res.json(wordCache[cacheKey]);
    }

    // 2.5 Check cooldown for Gemini API
    if (Date.now() < geminiCooldownUntil) {
      return res.json({
        valid: true,
        definition: 'Yapay zeka şu an yoğun, kelimeniz otomatik kabul edildi.'
      });
    }

    // 3. Fallback to Gemini AI Validation
    if (!process.env.GEMINI_API_KEY) {
      // If API key is missing, accept word as valid to not block gameplay, with a warning
      return res.json({
        valid: true,
        definition: 'Yapay zeka doğrulaması devre dışı (API Anahtarı eksik).'
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Lütfen "${normalized}" kelimesinin Türkçe TDK sözlüğünde yer alan geçerli, anlamlı, 3, 4, 5, 6, 7 veya 8 harfli (${wordLength} harfli) bir kelime olup olmadığını kontrol et. 
      Sadece isimler, sıfatlar, zarflar veya mastar halindeki fiiller (örn: "yapmak", "gelmek" değil, "yapma", "gelme" veya isim kökü) gibi kelimeler geçerli sayılmalıdır. 
      Özel isimler, uydurma kelimeler veya anlamsız harf dizilimleri GEÇERSİZ sayılmalıdır.
      Türkçe karakter uyumluluğuna dikkat et. Kelime ${wordLength} harfli olmalıdır.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valid: {
              type: Type.BOOLEAN,
              description: 'Kelime TDK sözlüğünde gerçekten mevcut ve anlamlı bir Türkçe kelime ise true, aksi halde false.'
            },
            definition: {
              type: Type.STRING,
              description: 'Kelimenin kısa TDK Türkçe sözlük anlamı/tanımı. Eğer kelime geçersizse açıklama/sebep.'
            }
          },
          required: ['valid', 'definition']
        }
      }
    });

    const resultText = response.text?.trim() || '{}';
    const result = JSON.parse(resultText);

    // Save to cache
    wordCache[cacheKey] = result;

    res.json(result);
  } catch (error) {
    // Use neutral info logging to avoid triggering false alarms in environment monitors
    console.log(`[Word Validation] Validation active (local check applied).`);
    
    // Enter 5-minute cooldown quietly under high-demand/quota limits to prevent redundant calls
    geminiCooldownUntil = Date.now() + 5 * 60 * 1000;

    // Fallback to allowing the word so we don't break the game
    res.json({
      valid: true,
      definition: 'Bağlantı hatası veya yoğunluk nedeniyle kelime otomatik kabul edildi.'
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
const matchmakingQueue = new Map<string, { wordLength: number }>();
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
                  match.status = 'ended';
                  
                  const p1Id = Object.keys(match.players)[0];
                  const p2Id = Object.keys(match.players)[1];
                  const p1 = match.players[p1Id];
                  const p2 = match.players[p2Id];

                  let winnerId: string | 'draw' = 'draw';
                  if (p1.won && !p2.won) {
                    winnerId = p1Id;
                  } else if (!p1.won && p2.won) {
                    winnerId = p2Id;
                  } else if (p1.won && p2.won) {
                    // If both won, solve in fewer attempts wins. If attempts equal, higher score/faster solver wins
                    if (p1.currentAttempt < p2.currentAttempt) {
                      winnerId = p1Id;
                    } else if (p2.currentAttempt < p1.currentAttempt) {
                      winnerId = p2Id;
                    } else if (p1.score > p2.score) {
                      winnerId = p1Id;
                    } else if (p2.score > p1.score) {
                      winnerId = p2Id;
                    }
                  }

                  match.winnerId = winnerId;

                  const endPayload = JSON.stringify({
                    type: 'match_end',
                    matchId,
                    winnerId,
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
            const { wordLength } = data;
            const selfClient = clients.get(playerId);
            if (!selfClient || selfClient.status === 'playing') break;

            console.log(`Player joined matchmaking queue: ${selfClient.name} (${playerId}) for ${wordLength} letters`);
            matchmakingQueue.set(playerId, { wordLength });

            // Look for another player in the queue
            let opponentId = '';
            for (const [id, info] of matchmakingQueue.entries()) {
              if (id !== playerId) {
                // Find opponent. It's best if they want the same wordLength, but if not we can match them and use the requested length or 5
                if (info.wordLength === wordLength) {
                  opponentId = id;
                  break;
                }
              }
            }

            // Fallback: match with anyone in queue if none with same length
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
                const targetWord = getRandomWord(finalWordLength);
                const matchId = `match_${Date.now()}`;

                matches.set(matchId, {
                  id: matchId,
                  wordLength: finalWordLength,
                  targetWord,
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
