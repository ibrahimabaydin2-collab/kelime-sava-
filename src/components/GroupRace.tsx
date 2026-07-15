import React, { useState, useEffect, useRef } from 'react';
import { 
  Swords, Trophy, Users, Clock, Zap, ArrowRight, Home, Play,
  Check, AlertCircle, Sparkles, Award, RotateCcw, ShieldAlert,
  Globe, Copy, ArrowLeft, Bot
} from 'lucide-react';
import { UserProfile } from '../types.js';
import { getRandomWord, isWordInCuratedList } from '../data/wordlist.js';
import { turkishUpper, turkishLower, validateTurkishLinguistics } from '../utils/turkish.js';
import { getApiUrl } from '../utils/api.js';
import { getCachedWord, setCachedWord } from '../utils/wordCache.js';
import { 
  collection, doc, setDoc, getDoc, updateDoc, onSnapshot, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { GroupRaceQueueManager } from '../utils/GroupRaceQueueManager.js';
import BottomBar from './BottomBar.js';

interface GroupRaceProps {
  profile: UserProfile;
  onUpdateScore: (points: number) => void;
  onExit: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  dictionaryMode: 'tdk_online' | 'no_validation';
  initialMode?: 'online' | 'offline';
}

interface Competitor {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isUser: boolean;
  solved: boolean;
  solvedRound: number; // which attempt solved
  solveTime?: number;  // seconds remaining when solved
  currentAttempt: number;
  attemptsFeedback: ('green' | 'orange' | 'grey')[][];
  eliminated: boolean;
  speedFactor: number; // multiplier for action speeds
  targetSolveAttempt: number; // 1-6, or 0 if they fail to solve
}

const TURKISH_BOTS = [
  { name: 'Ahmet 🦁', avatar: '🦁' },
  { name: 'Buse 🐥', avatar: '🐥' },
  { name: 'Kerem 🦊', avatar: '🦊' },
  { name: 'Zeynep 🦄', avatar: '🦄' },
  { name: 'Mert 🐨', avatar: '🐨' },
  { name: 'Defne 🌸', avatar: '🌸' },
  { name: 'Selin 🐸', avatar: '🐸' },
  { name: 'Oktay 🦅', avatar: '🦅' },
  { name: 'Canan 🐼', avatar: '🐼' },
  { name: 'Rüzgar ⚡', avatar: '⚡' },
  { name: 'Ege 🌊', avatar: '🌊' },
  { name: 'Ada 🌴', avatar: '🌴' },
  { name: 'Cem 🚀', avatar: '🚀' },
  { name: 'Elif 🎨', avatar: '🎨' },
  { name: 'Hakan ⚔️', avatar: '⚔️' },
  { name: 'İrem 💎', avatar: '💎' },
  { name: 'Barış 🕊️', avatar: '🕊️' },
  { name: 'Gözde ✨', avatar: '✨' },
  { name: 'Kaan 🔱', avatar: '🔱' },
  { name: 'Aslı 🍀', avatar: '🍀' }
];

export default function GroupRace({
  profile,
  onUpdateScore,
  onExit,
  showToast,
  dictionaryMode,
  initialMode
}: GroupRaceProps) {
  // Game phases: 'mode_selection' | 'online_lobby_selection' | 'lobby' | 'online_lobby' | 'playing' | 'elimination' | 'ended'
  const [phase, setPhase] = useState<'mode_selection' | 'online_lobby_selection' | 'lobby' | 'online_lobby' | 'playing' | 'elimination' | 'ended'>('mode_selection');
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);

  useEffect(() => {
    if (initialMode === 'online') {
      setIsOnlineMode(true);
      joinMatchmakingQueue();
    } else if (initialMode === 'offline') {
      setIsOnlineMode(false);
      setPhase('lobby');
    }
  }, [initialMode]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);

  const [lobbyCountdown, setLobbyCountdown] = useState<number>(15); // Quick 15s join countdown to keep user action intense, but user can skip!
  const [lobbyPlayers, setLobbyPlayers] = useState<{ name: string; avatar: string; isUser: boolean; ready: boolean }[]>([]);
  
  // Tournament details
  const [currentRound, setCurrentRound] = useState<number>(1); // 1, 2, 3, 4
  const [wordLength, setWordLength] = useState<number>(5); // 5 -> 6 -> 7 -> 8
  const [targetWord, setTargetWord] = useState<string>('');
  const [wordDefinition, setWordDefinition] = useState<string>('');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [roundTimer, setRoundTimer] = useState<number>(45);
  
  // User game play state
  const [userGuesses, setUserGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [letterStatuses, setLetterStatuses] = useState<{ [key: string]: 'green' | 'orange' | 'grey' }>({});
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [userFinished, setUserFinished] = useState<boolean>(false);
  const [userSolved, setUserSolved] = useState<boolean>(false);

  // Live feed log
  const [liveLogs, setLiveLogs] = useState<{ time: string; text: string; icon?: string }[]>([]);
  const [isRivalsOpen, setIsRivalsOpen] = useState<boolean>(false);
  const [rivalsTab, setRivalsTab] = useState<'standings' | 'feed'>('standings');
  const [previousUserRank, setPreviousUserRank] = useState<number | null>(null);
  
  const [onlineLobbyCountdown, setOnlineLobbyCountdown] = useState<number>(60);
  const [roomCreatedAt, setRoomCreatedAt] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState<boolean>(false);

  const joinMatchmakingQueue = async () => {
    setIsQueueing(true);
    try {
      const { roomId: joinedRoomId, isHost: hostStatus } = await GroupRaceQueueManager.joinGroupRaceQueue(profile);
      setRoomId(joinedRoomId);
      setRoomCode(joinedRoomId);
      setIsHost(hostStatus);
      setPhase('online_lobby');
      showToast(
        hostStatus 
          ? 'Battle Royale araması başladı! Lobi kuruldu.' 
          : 'Battle Royale lobisine başarıyla katıldınız!', 
        'success'
      );
    } catch (err) {
      console.error('Queue join error:', err);
      showToast('Eşleşme sırasına girilirken bir hata oluştu.', 'error');
      onExit();
    } finally {
      setIsQueueing(false);
    }
  };
  const competitorsRef = useRef<Competitor[]>([]);

  useEffect(() => {
    competitorsRef.current = competitors;
  }, [competitors]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Real-time log synchronization for other players and bots (Online & Offline)
  const previousCompetitorsState = useRef<Record<string, { currentAttempt: number; solved: boolean; eliminated: boolean }>>({});

  useEffect(() => {
    if (phase !== 'playing') {
      previousCompetitorsState.current = {};
      return;
    }

    const logsToAdd: { time: string; text: string; icon?: string }[] = [];
    const timeElapsed = 45 - roundTimer;
    const timeString = `00:${String(timeElapsed).padStart(2, '0')}`;

    competitors.forEach((c) => {
      if (c.isUser) return; // Already logged locally
      
      const prev = previousCompetitorsState.current[c.id];
      if (!prev) {
        // Initialize state
        previousCompetitorsState.current[c.id] = {
          currentAttempt: c.currentAttempt,
          solved: c.solved,
          eliminated: c.eliminated
        };
        return;
      }

      // Check if attempt increased or solved status changed
      if (c.currentAttempt > prev.currentAttempt) {
        if (c.solved && !prev.solved) {
          logsToAdd.push({
            time: timeString,
            text: `${c.name} Kelimeyi ÇÖZDÜ! 🎉 (${c.currentAttempt}. denemede)`,
            icon: '🎉'
          });
        } else if (c.currentAttempt >= 6 && !c.solved) {
          logsToAdd.push({
            time: timeString,
            text: `${c.name} hakkını doldurdu ve elendi! ❌`,
            icon: '❌'
          });
        } else {
          logsToAdd.push({
            time: timeString,
            text: `${c.name} ${c.currentAttempt}. tahminini yaptı...`
          });
        }
      } else if (c.solved && !prev.solved) {
        logsToAdd.push({
          time: timeString,
          text: `${c.name} Kelimeyi ÇÖZDÜ! 🎉`,
          icon: '🎉'
        });
      }

      // Update ref
      previousCompetitorsState.current[c.id] = {
        currentAttempt: c.currentAttempt,
        solved: c.solved,
        eliminated: c.eliminated
      };
    });

    if (logsToAdd.length > 0) {
      setLiveLogs((prev) => [...prev, ...logsToAdd]);
    }
  }, [competitors, phase, roundTimer]);

  // Track user's ranking in real time to show non-intrusive toast notification on improvement
  useEffect(() => {
    if (phase !== 'playing') return;

    const sorted = [...competitors].filter(c => !c.eliminated || c.isUser).sort((a, b) => {
      if (a.solved && !b.solved) return -1;
      if (!a.solved && b.solved) return 1;
      if (a.solved && b.solved) {
        if (a.currentAttempt !== b.currentAttempt) {
          return a.currentAttempt - b.currentAttempt;
        }
      }
      return b.score - a.score;
    });

    const userIdx = sorted.findIndex(c => c.isUser);
    const currentRank = userIdx + 1; // 1-indexed

    if (previousUserRank !== null && currentRank < previousUserRank) {
      if (currentRank === 1) {
        showToast('Tebrikler! Liderliğe yükseldiniz! 👑', 'success');
      } else if (currentRank <= 3) {
        showToast(`Müthiş hamle! ${currentRank}. sıraya yükseldiniz! 🚀`, 'info');
      }
    }

    setPreviousUserRank(currentRank);
  }, [competitors, phase]);

  // Keyboard layout for TR
  const KEYBOARD_ROWS = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
  ];

  // Helper: Generate a random room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create an online multiplayer room
  const createOnlineRoom = async () => {
    setIsCreatingRoom(true);
    try {
      const code = generateRoomCode();
      setRoomId(code);
      setRoomCode(code);
      setIsHost(true);

      const roomRef = doc(db, 'rooms', code);
      await setDoc(roomRef, {
        id: code,
        code: code,
        hostId: profile.id,
        hostName: profile.name,
        status: 'lobby',
        currentRound: 1,
        wordLength: 5,
        targetWord: '',
        createdAt: new Date().toISOString()
      });

      const playerRef = doc(db, 'rooms', code, 'players', profile.id);
      await setDoc(playerRef, {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatarUrl || '👤',
        solved: false,
        solvedRound: 0,
        solveTime: 0,
        currentAttempt: 0,
        attemptsFeedback: [],
        eliminated: false,
        score: 0,
        ready: true,
        joinedAt: new Date().toISOString()
      });

      setPhase('online_lobby');
      showToast('Oda başarıyla oluşturuldu! Arkadaşlarını davet et.', 'success');
    } catch (err) {
      console.error('Room creation error:', err);
      showToast('Oda oluşturulurken bir hata oluştu.', 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join an online multiplayer room
  const joinOnlineRoom = async () => {
    const trimmedCode = joinCodeInput.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      showToast('Lütfen geçerli bir 6 haneli oda kodu girin!', 'error');
      return;
    }

    setIsJoiningRoom(true);
    try {
      const roomRef = doc(db, 'rooms', trimmedCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        showToast('Oda bulunamadı! Kodu kontrol edin.', 'error');
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.status !== 'lobby') {
        showToast('Bu oyun zaten başladı veya kapandı!', 'error');
        return;
      }

      setRoomId(trimmedCode);
      setRoomCode(trimmedCode);
      setIsHost(false);

      const playerRef = doc(db, 'rooms', trimmedCode, 'players', profile.id);
      await setDoc(playerRef, {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatarUrl || '👤',
        solved: false,
        solvedRound: 0,
        solveTime: 0,
        currentAttempt: 0,
        attemptsFeedback: [],
        eliminated: false,
        score: 0,
        ready: true,
        joinedAt: new Date().toISOString()
      });

      setPhase('online_lobby');
      showToast('Odaya başarıyla katıldınız! Oyunun başlaması bekleniyor.', 'success');
    } catch (err) {
      console.error('Room joining error:', err);
      showToast('Odaya katılırken bir hata oluştu.', 'error');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Battle Royale Auto Start with Bots (Host only)
  const autoStartOnlineTournamentWithBots = async () => {
    if (!isHost || !roomId) return;
    
    try {
      showToast('Battle Royale Başlıyor! Botlar dolduruluyor...', 'info');

      // 1. Fill missing players with Bots in Firestore up to 20 players
      const currentList = [...roomPlayers];
      const needed = 20 - currentList.length;
      
      if (needed > 0) {
        const availableBots = TURKISH_BOTS.filter(b => !currentList.some(p => p.name === b.name));
        
        for (let i = 0; i < Math.min(needed, availableBots.length); i++) {
          const botId = `bot_${i}_${Math.random().toString(36).substr(2, 5)}`;
          const botRef = doc(db, 'rooms', roomId, 'players', botId);
          
          // Allocate bots into difficulty tiers based on index (Nerfed to a humane level)
          let speedFactor = 1.0;
          let targetSolveAttempt = 4;
          if (i < 5) {
            // Usta (Pro)
            speedFactor = 0.7 + Math.random() * 0.25;
            targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 3) + 3 : 0;
          } else if (i < 13) {
            // Standart (Average)
            speedFactor = 0.45 + Math.random() * 0.25;
            targetSolveAttempt = Math.random() > 0.25 ? Math.floor(Math.random() * 3) + 4 : 0;
          } else {
            // Acemi (Novice)
            speedFactor = 0.2 + Math.random() * 0.15;
            targetSolveAttempt = Math.random() > 0.45 ? Math.floor(Math.random() * 2) + 5 : 0;
          }

          await setDoc(botRef, {
            id: botId,
            name: availableBots[i].name,
            avatar: availableBots[i].avatar,
            isBot: true,
            solved: false,
            solvedRound: 0,
            solveTime: 0,
            currentAttempt: 0,
            attemptsFeedback: [],
            eliminated: false,
            score: 0,
            ready: true,
            speedFactor,
            targetSolveAttempt,
            joinedAt: new Date(Date.now() + i * 50).toISOString() // stagger joinedAt slightly
          });
        }
      }

      // 2. Choose first word instantly from the local curated wordlist to eliminate startup lag
      const length = 5;
      let pickedWord = getRandomWord(length);

      // 3. Update room status to playing
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'playing',
        currentRound: 1,
        wordLength: length,
        targetWord: pickedWord
      });
    } catch (err) {
      console.error('Error starting Battle Royale:', err);
      showToast('Battle Royale başlatılamadı!', 'error');
    }
  };

  // Online Battle Royale Lobby Countdown & Auto-start check
  useEffect(() => {
    if (phase !== 'online_lobby' || !isOnlineMode || !roomId || !roomCreatedAt) return;

    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - new Date(roomCreatedAt).getTime()) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setOnlineLobbyCountdown(remaining);

      // Only the host is in charge of mutating Firestore to start the game
      if (isHost) {
        // 1. Auto-start if 20 players reached
        if (roomPlayers.length >= 20) {
          clearInterval(interval);
          await autoStartOnlineTournamentWithBots();
        }
        // 2. Auto-start if countdown expired
        else if (remaining <= 0) {
          clearInterval(interval);
          await autoStartOnlineTournamentWithBots();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isOnlineMode, roomId, roomCreatedAt, roomPlayers, isHost]);

  // Synchronize Firestore room state and player list in Online Mode
  useEffect(() => {
    if (!isOnlineMode || !roomId) return;

    // 1. Listen to Room document
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        showToast('Oda kapatıldı veya bulunamadı.', 'error');
        setPhase('mode_selection');
        return;
      }
      const data = snapshot.data();
      setTargetWord(data.targetWord || '');
      setWordLength(data.wordLength || 5);
      setCurrentRound(data.currentRound || 1);
      if (data.createdAt) {
        setRoomCreatedAt(data.createdAt);
      }

      // Sync isHost state with the database hostId
      if (data.hostId === profile.id && !isHost) {
        setIsHost(true);
      }

      if (data.status === 'playing' && phase !== 'playing') {
        setupOnlinePlayingRound(data.currentRound, data.wordLength || 5, data.targetWord || '');
      } else if (data.status === 'elimination' && phase !== 'elimination') {
        setPhase('elimination');
      } else if (data.status === 'ended' && phase !== 'ended') {
        setPhase('ended');
      } else if (data.status === 'lobby' && phase !== 'online_lobby') {
        setPhase('online_lobby');
      }
    }, (error) => {
      console.error("Firestore room snap error:", error);
    });

    // 2. Listen to players subcollection
    const playersColRef = collection(db, 'rooms', roomId, 'players');
    const unsubPlayers = onSnapshot(playersColRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      list.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      setRoomPlayers(list);

      // Convert to competitors structure
      const mapped = list.map((p) => {
        const isBot = p.isBot || p.id.startsWith('bot_');
        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: isBot,
          isUser: p.id === profile.id,
          solved: p.solved || false,
          solvedRound: p.solvedRound || 0,
          solveTime: p.solveTime || 0,
          currentAttempt: p.currentAttempt || 0,
          attemptsFeedback: p.attemptsFeedback || [],
          eliminated: p.eliminated || false,
          speedFactor: isBot ? (p.speedFactor || 1.0) : 1.0,
          targetSolveAttempt: isBot ? (p.targetSolveAttempt || 4) : 0
        };
      });
      setCompetitors(mapped);

      // Claim host status if previous host left (hostId is empty)
      getDoc(roomRef).then((roomSnap) => {
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          if (roomData.isGroupRaceMatchmaking && !roomData.hostId) {
            const humanPlayers = list.filter(p => !p.isBot);
            if (humanPlayers.length > 0 && humanPlayers[0].id === profile.id) {
              updateDoc(roomRef, {
                hostId: profile.id,
                hostName: profile.name
              }).then(() => {
                setIsHost(true);
              }).catch(err => console.error("Error setting host takeover:", err));
            }
          }
        }
      }).catch(err => console.error("Claim host check error:", err));
    }, (error) => {
      console.error("Firestore players subcol snap error:", error);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomId, isOnlineMode, phase, isHost]);

  // Setup the online round
  const setupOnlinePlayingRound = (roundNum: number, length: number, word: string) => {
    setWordLength(length);
    setCurrentRound(roundNum);
    setRoundTimer(45);
    setUserGuesses([]);
    setCurrentGuess('');
    setLetterStatuses({});
    setUserFinished(false);
    setUserSolved(false);
    setPhase('playing');
    setLiveLogs([{ time: '00:00', text: `🚩 Çevrimiçi Düello Başladı! ${length} harfli gizemli kelimeyi en hızlı bulan üst tura çıkar.` }]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRoundTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleOnlineLocalRoundFinished(roundNum, false, 0, []);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (isHost) {
      startBotSimulation(length);
    }
  };

  // Local finished handler for Online Mode
  const handleOnlineLocalRoundFinished = async (roundNum: number, solved: boolean, solvedRound: number, finalGuesses: string[]) => {
    setUserFinished(true);
    setUserSolved(solved);
    
    // Save state to firestore player document
    try {
      const playerRef = doc(db, 'rooms', roomId, 'players', profile.id);
      await updateDoc(playerRef, {
        solved,
        solvedRound: solved ? solvedRound : 0,
        solveTime: solved ? roundTimer : 0,
        currentAttempt: finalGuesses.length,
        attemptsFeedback: finalGuesses.map(g => evaluateGuessLocally(g, targetWord))
      });
    } catch (err) {
      console.error("Error writing local end round results to Firestore:", err);
    }
  };

  // Host end-round monitor
  useEffect(() => {
    if (isOnlineMode && isHost && phase === 'playing') {
      const activeOnlinePlayers = competitors.filter(c => !c.eliminated);
      const allFinished = activeOnlinePlayers.length > 0 && activeOnlinePlayers.every(p => p.solved || p.currentAttempt >= 6);
      
      if (allFinished) {
        const delayEnd = setTimeout(() => {
          endOnlineRound();
        }, 2500);
        return () => clearTimeout(delayEnd);
      }
    }
  }, [competitors, isOnlineMode, isHost, phase]);

  // Host end online round calculations
  const endOnlineRound = async () => {
    if (!isHost) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const activeOnlinePlayers = competitors.filter(c => !c.eliminated);
      
      const sorted = [...activeOnlinePlayers].sort((a, b) => {
        if (a.solved && !b.solved) return -1;
        if (!a.solved && b.solved) return 1;
        if (a.solved && b.solved) {
          if (a.solvedRound !== b.solvedRound) return a.solvedRound - b.solvedRound;
          return b.solveTime - a.solveTime;
        }
        return b.currentAttempt - a.currentAttempt;
      });

      let targetSurvivors = 1;
      if (activeOnlinePlayers.length >= 4) {
        targetSurvivors = Math.ceil(activeOnlinePlayers.length / 2);
      } else if (activeOnlinePlayers.length === 3) {
        targetSurvivors = 2;
      } else {
        targetSurvivors = 1;
      }

      const survivorIds = sorted.slice(0, targetSurvivors).map(s => s.id);

      for (const p of activeOnlinePlayers) {
        const playerRef = doc(db, 'rooms', roomId, 'players', p.id);
        const isEliminatedNow = !survivorIds.includes(p.id);
        
        let scoreIncrement = 0;
        if (!isEliminatedNow) {
          scoreIncrement = currentRound * 15;
          if (targetSurvivors === 1 && activeOnlinePlayers.length > 1) {
            scoreIncrement += 100; // Champion bonus
          }
        }

        await updateDoc(playerRef, {
          eliminated: isEliminatedNow,
          score: p.score + scoreIncrement
        });
      }

      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: currentRound === 4 || targetSurvivors === 1 ? 'ended' : 'elimination'
      });
    } catch (err) {
      console.error("Error ending online round:", err);
    }
  };

  // Host advance online round
  const startNextOnlineRound = async () => {
    if (!isHost) return;
    try {
      const activeOnlinePlayers = competitors.filter(c => !c.eliminated);
      
      for (let i = 0; i < activeOnlinePlayers.length; i++) {
        const p = activeOnlinePlayers[i];
        const playerRef = doc(db, 'rooms', roomId, 'players', p.id);
        
        const updateData: any = {
          solved: false,
          solvedRound: 0,
          solveTime: 0,
          currentAttempt: 0,
          attemptsFeedback: []
        };

        if (p.isBot) {
          // Re-randomize bot targets for the new word size based on active count index (Nerfed to a humane level)
          let targetSolveAttempt = 4;
          if (i < 5) {
            targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 3) + 3 : 0;
          } else if (i < 13) {
            targetSolveAttempt = Math.random() > 0.25 ? Math.floor(Math.random() * 3) + 4 : 0;
          } else {
            targetSolveAttempt = Math.random() > 0.45 ? Math.floor(Math.random() * 2) + 5 : 0;
          }
          updateData.targetSolveAttempt = targetSolveAttempt;
        }

        await updateDoc(playerRef, updateData);
      }

      const nextRoundNum = currentRound + 1;
      const nextWordLength = nextRoundNum === 2 ? 6 : nextRoundNum === 3 ? 7 : 8;
      let newWord = getRandomWord(nextWordLength);

      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'playing',
        currentRound: nextRoundNum,
        wordLength: nextWordLength,
        targetWord: newWord
      });
    } catch (err) {
      console.error("Error starting next online round:", err);
      showToast('Sıraki tur başlatılamadı!', 'error');
    }
  };

  // Safe exit helper
  const handleExitGame = async () => {
    if (isOnlineMode && roomId) {
      try {
        const playerRef = doc(db, 'rooms', roomId, 'players', profile.id);
        await deleteDoc(playerRef);
        
        if (isHost) {
          const roomRef = doc(db, 'rooms', roomId);
          await updateDoc(roomRef, {
            status: 'ended'
          });
        }
      } catch (e) {
        console.error("Error cleaning player room document on exit:", e);
      }
    }
    onExit();
  };

  // Initialize lobby with joining players (Offline Mode)
  useEffect(() => {
    if (phase === 'lobby' && !isOnlineMode) {
      // Add user first
      setLobbyPlayers([{ name: profile.name, avatar: profile.avatarUrl || '👤', isUser: true, ready: true }]);
      setLobbyCountdown(15);
      
      const botJoinInterval = setInterval(() => {
        setLobbyPlayers((prev) => {
          if (prev.length >= 20) {
            clearInterval(botJoinInterval);
            return prev;
          }
          // Pick a random bot that isn't already in
          const availableBots = TURKISH_BOTS.filter(b => !prev.some(p => p.name === b.name));
          if (availableBots.length === 0) return prev;
          
          const newBot = availableBots[Math.floor(Math.random() * availableBots.length)];
          
          // Log join event
          const randomStatus = Math.random() > 0.3;
          return [...prev, { ...newBot, isUser: false, ready: randomStatus }];
        });
      }, 700);

      const countInterval = setInterval(() => {
        setLobbyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countInterval);
            clearInterval(botJoinInterval);
            // Auto start
            startTournament();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(botJoinInterval);
        clearInterval(countInterval);
      };
    }
  }, [phase, isOnlineMode]);

  // Handle scrolling of logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs]);

  // Start the actual tournament rounds
  const startTournament = () => {
    // We make sure the lobby has exactly 20 players. If less, backfill
    setLobbyPlayers((prev) => {
      let currentList = [...prev];
      const needed = 20 - currentList.length;
      if (needed > 0) {
        const availableBots = TURKISH_BOTS.filter(b => !currentList.some(p => p.name === b.name));
        for (let i = 0; i < Math.min(needed, availableBots.length); i++) {
          currentList.push({ ...availableBots[i], isUser: false, ready: true });
        }
      }
      
      // Map them to competitors
      const mappedCompetitors: Competitor[] = currentList.map((p, index) => {
        const isUser = p.isUser;
        let speedFactor = 1.0;
        let targetSolveAttempt = 4;
        
        if (!isUser) {
          // Allocate bots into tiers (Nerfed to a humane level):
          if (index < 5) {
            // Usta (Pro)
            speedFactor = 0.7 + Math.random() * 0.25; // 0.7 to 0.95
            targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 3) + 3 : 0; // Solves 3-5 or rarely fails
          } else if (index < 13) {
            // Standart (Average)
            speedFactor = 0.45 + Math.random() * 0.25; // 0.45 to 0.7
            targetSolveAttempt = Math.random() > 0.25 ? Math.floor(Math.random() * 3) + 4 : 0; // Solves 4-6 or fails
          } else {
            // Acemi (Novice)
            speedFactor = 0.2 + Math.random() * 0.15; // 0.2 to 0.35
            targetSolveAttempt = Math.random() > 0.45 ? Math.floor(Math.random() * 2) + 5 : 0; // Solves 5-6 or fails frequently
          }
        }
        
        return {
          id: isUser ? 'user' : `bot_${index}`,
          name: p.name,
          avatar: p.avatar,
          isBot: !isUser,
          isUser,
          solved: false,
          solvedRound: 0,
          currentAttempt: 0,
          attemptsFeedback: [],
          eliminated: false,
          speedFactor,
          targetSolveAttempt
        };
      });

      setCompetitors(mappedCompetitors);
      return currentList;
    });

    setCurrentRound(1);
    setupRound(1, 20);
  };

  // Setup the words and values for a round
  const setupRound = async (roundNum: number, activeCount: number) => {
    const nextWordLength = roundNum === 1 ? 5 : roundNum === 2 ? 6 : roundNum === 3 ? 7 : 8;
    setWordLength(nextWordLength);
    setCurrentRound(roundNum);
    setRoundTimer(45);
    setUserGuesses([]);
    setCurrentGuess('');
    setLetterStatuses({});
    setUserFinished(false);
    setUserSolved(false);
    setPhase('playing');
    setLiveLogs([{ time: '00:00', text: `🚩 Tur ${roundNum} Başladı! ${nextWordLength} harfli gizemli kelimeyi en hızlı bulan üst tura çıkar.` }]);

    setTargetWord(getRandomWord(nextWordLength));

    // Initialize competitor states for this round
    setCompetitors((prev) => {
      return prev.map((c, index) => {
        if (c.eliminated) return c;
        
        // Re-randomize bot targets for the new word based on tiers (Nerfed to a humane level)
        let targetSolveAttempt = 4;
        if (!c.isUser) {
          if (index < 5) {
            // Usta
            targetSolveAttempt = Math.random() > 0.15 ? Math.floor(Math.random() * 3) + 3 : 0;
          } else if (index < 13) {
            // Standart
            targetSolveAttempt = Math.random() > 0.25 ? Math.floor(Math.random() * 3) + 4 : 0;
          } else {
            // Acemi
            targetSolveAttempt = Math.random() > 0.45 ? Math.floor(Math.random() * 2) + 5 : 0;
          }
        }

        return {
          ...c,
          solved: false,
          solvedRound: 0,
          solveTime: undefined,
          currentAttempt: 0,
          attemptsFeedback: [],
          targetSolveAttempt
        };
      });
    });

    // Start timer & bot simulator
    startRoundTimer();
    startBotSimulation(nextWordLength);
  };

  // Timer loop
  const startRoundTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRoundTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (simulationRef.current) clearInterval(simulationRef.current);
          endRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const roundTimerRef = useRef<number>(45);
  useEffect(() => {
    roundTimerRef.current = roundTimer;
  }, [roundTimer]);

  // Simulation of other players' actions in real-time
  const startBotSimulation = (len: number) => {
    if (simulationRef.current) clearInterval(simulationRef.current);
    
    // Check state and trigger periodic bot actions
    simulationRef.current = setInterval(() => {
      const currentCompetitors = isOnlineMode ? competitorsRef.current : competitors;
      const currentTimer = roundTimerRef.current;
      
      // Calculate speed modifier based on user's progress/speed
      const userComp = currentCompetitors.find(c => c.isUser);
      let speedModifier = 1.0;
      if (userComp) {
        if (userComp.solved) {
          speedModifier = userComp.solvedRound <= 2 ? 1.35 : 1.1;
        } else if (userComp.currentAttempt >= 4) {
          speedModifier = 0.75;
        }
      }

      if (isOnlineMode) {
        if (!isHost || !roomId) return; // Only host simulates bots in online mode
        
        const activeBots = currentCompetitors.filter(c => c.isBot && !c.eliminated && !c.solved);
        
        activeBots.forEach(async (c) => {
          const actionChance = 0.12 * c.speedFactor * speedModifier;
          if (Math.random() < actionChance) {
            const nextAttemptNum = c.currentAttempt + 1;
            const playerRef = doc(db, 'rooms', roomId, 'players', c.id);
            
            if (c.targetSolveAttempt > 0 && nextAttemptNum >= c.targetSolveAttempt) {
              // Bot solved!
              const feedback = Array(len).fill('green');
              await updateDoc(playerRef, {
                solved: true,
                solvedRound: nextAttemptNum,
                solveTime: currentTimer,
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback]
              });
            } else if (nextAttemptNum >= 6) {
              // Bot failed
              const feedback = Array(len).fill('grey');
              await updateDoc(playerRef, {
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback],
                solved: false
              });
            } else {
              // Intermediate attempt
              const feedback = Array(len).fill('grey').map(() => {
                const r = Math.random();
                if (r < 0.25) return 'green';
                if (r < 0.5) return 'orange';
                return 'grey';
              });
              await updateDoc(playerRef, {
                currentAttempt: nextAttemptNum,
                attemptsFeedback: [...c.attemptsFeedback, feedback]
              });
            }
          }
        });
      } else {
        // Offline mode: update local state directly
        setCompetitors((prevCompetitors) => {
          const nextList = prevCompetitors.map((c) => {
            if (c.eliminated || c.isUser || c.solved) return c;

            const actionChance = 0.12 * c.speedFactor * speedModifier;
            if (Math.random() < actionChance) {
              const nextAttemptNum = c.currentAttempt + 1;
              
              if (c.targetSolveAttempt > 0 && nextAttemptNum >= c.targetSolveAttempt) {
                // Bot solved!
                const feedback = Array(len).fill('green');
                return {
                  ...c,
                  solved: true,
                  solvedRound: nextAttemptNum,
                  solveTime: currentTimer,
                  currentAttempt: nextAttemptNum,
                  attemptsFeedback: [...c.attemptsFeedback, feedback]
                };
              } else if (nextAttemptNum >= 6) {
                // Bot failed all attempts
                const feedback = Array(len).fill('grey');
                return {
                  ...c,
                  currentAttempt: nextAttemptNum,
                  attemptsFeedback: [...c.attemptsFeedback, feedback],
                  solved: false
                };
              } else {
                // Intermediate attempt
                const feedback = Array(len).fill('grey').map(() => {
                  const r = Math.random();
                  if (r < 0.25) return 'green';
                  if (r < 0.5) return 'orange';
                  return 'grey';
                });

                return {
                  ...c,
                  currentAttempt: nextAttemptNum,
                  attemptsFeedback: [...c.attemptsFeedback, feedback]
                };
              }
            }
            return c;
          });

          return nextList;
        });
      }
    }, 1100);
  };

  // End of the current round
  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (simulationRef.current) clearInterval(simulationRef.current);
    
    setPhase('elimination');
    
    // Sort survivors
    setCompetitors((prev) => {
      // Calculate results
      const userCompIndex = prev.findIndex(c => c.isUser);
      let updated = [...prev];
      
      // Update user state inside competitors list
      if (userCompIndex !== -1) {
        updated[userCompIndex] = {
          ...updated[userCompIndex],
          solved: userSolved,
          solvedRound: userSolved ? userGuesses.length : 0,
          solveTime: userSolved ? roundTimer : undefined,
          currentAttempt: userGuesses.length,
          attemptsFeedback: userGuesses.map(g => evaluateGuessLocally(g, targetWord))
        };
      }

      // Determine who gets eliminated in this round
      // Rules:
      // Tur 1 (20 players) -> Top 10 advance
      // Tur 2 (10 players) -> Top 5 advance
      // Tur 3 (5 players) -> Top 2 advance
      // Tur 4 (2 players) -> Winner takes all
      const targetSurvivors = currentRound === 1 ? 10 : currentRound === 2 ? 5 : currentRound === 3 ? 2 : 1;
      
      // Filter out players who were already eliminated in previous rounds
      const roundParticipants = updated.filter(c => !c.eliminated);
      
      // Sort round participants
      // 1. Solved: fewer attempts first, then more time remaining (higher solveTime) first
      // 2. Unsolved: higher currentAttempt (more effort) first
      const sortedParticipants = [...roundParticipants].sort((a, b) => {
        if (a.solved && !b.solved) return -1;
        if (!a.solved && b.solved) return 1;
        
        if (a.solved && b.solved) {
          if (a.solvedRound !== b.solvedRound) {
            return a.solvedRound - b.solvedRound; // Less attempts wins
          }
          return (b.solveTime || 0) - (a.solveTime || 0); // More seconds left wins
        }
        
        // Neither solved
        return b.currentAttempt - a.currentAttempt;
      });

      // Mark elminated
      const survivorIds = sortedParticipants.slice(0, targetSurvivors).map(s => s.id);
      
      const finalCompetitors = updated.map(c => {
        if (c.eliminated) return c; // Already out
        if (!survivorIds.includes(c.id)) {
          return { ...c, eliminated: true };
        }
        return c;
      });

      // Check user survival
      const userComp = finalCompetitors.find(c => c.isUser);
      if (userComp) {
        if (userComp.eliminated) {
          showToast('Bu turda elendiniz!', 'error');
        } else {
          showToast('Tebrikler, üst tura yükseldiniz! 🎉', 'success');
          // Update score slightly for surviving a round
          onUpdateScore(currentRound * 15);
        }
      }

      // If round is 4, end the tournament
      if (currentRound === 4) {
        setPhase('ended');
        // Give heavy bonus points to final champion
        const champion = finalCompetitors.find(c => !c.eliminated);
        if (champion && champion.isUser) {
          onUpdateScore(100); // 100 bonus tournament win points!
        }
      }

      return finalCompetitors;
    });
  };

  // Locally evaluate guess for rendering competitor grids
  const evaluateGuessLocally = (guess: string, target: string): ('green' | 'orange' | 'grey')[] => {
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const feedback: ('green' | 'orange' | 'grey')[] = Array(wordLength).fill('grey');
    const used = Array(wordLength).fill(false);

    for (let i = 0; i < wordLength; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        feedback[i] = 'green';
        used[i] = true;
      }
    }

    for (let i = 0; i < wordLength; i++) {
      if (feedback[i] === 'green') continue;
      for (let j = 0; j < wordLength; j++) {
        if (!used[j] && targetLetters[j] === guessLetters[i]) {
          feedback[i] = 'orange';
          used[j] = true;
          break;
        }
      }
    }

    return feedback;
  };

  // Keyboard press handler
  const handleKeyPress = (key: string) => {
    if (userFinished) return;

    if (key === 'ENTER') {
      submitUserGuess();
    } else if (key === 'BACK' || key === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength && /^[a-zA-ZğüşıöçĞÜŞİÖÇ]$/.test(key)) {
      setCurrentGuess((prev) => turkishUpper(prev + key));
    }
  };

  // Submit guess
  const submitUserGuess = async () => {
    if (currentGuess.length !== wordLength) {
      showToast(`Lütfen ${wordLength} harfli bir kelime girin!`, 'error');
      return;
    }

    setIsValidating(true);
    let isValid = false;
    let isConnectionError = false;

    if (dictionaryMode === 'no_validation') {
      isValid = true;
    } else {
      // 1. Check local persistent cache
      const cached = getCachedWord(currentGuess, wordLength);
      if (cached) {
        isValid = cached.valid;
      } else {
        // 2. FAST LOCAL CHECK: Validate instantly if in curated list
        if (isWordInCuratedList(currentGuess, wordLength)) {
          isValid = true;
          // Cache it locally
          setCachedWord(currentGuess, wordLength, { 
            valid: true, 
            definition: 'Türkçe sözlükte geçerli kelime.' 
          });
        } else {
          // 3. Not in curated list. Let's do heuristic linguistic check first
          const linguisticCheck = validateTurkishLinguistics(currentGuess, wordLength);
          if (!linguisticCheck.valid) {
            isValid = false;
            setCachedWord(currentGuess, wordLength, { valid: false, definition: linguisticCheck.reason });
          } else {
            // 4. Fetch server validation with timeout
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seconds timeout

              const response = await fetch(getApiUrl('/api/validate-word'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: currentGuess, length: wordLength }),
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                let valResult = data.valid;
                const defText = data.definition || '';
                const lowerDef = defText.toLowerCase();
                if (lowerDef.includes('error') || lowerDef.includes('bulunamadı') || lowerDef.includes('bulunamadi')) {
                  valResult = false;
                }
                isValid = valResult;
                setCachedWord(currentGuess, wordLength, { valid: valResult, definition: defText });
              } else {
                throw new Error('Server returned non-ok status');
              }
            } catch (e) {
              console.warn('GroupRace Yapay Zeka validation failed or timed out:', e);
              isConnectionError = true;
              
              // Heuristic fallback
              isValid = true;
              showToast('Bağlantı hatası oluştu. Çevrimdışı kurallarla onaylandı.', 'info');
            }
          }
        }
      }
    }

    if (!isValid) {
      if (isConnectionError) {
        showToast('Bağlantı hatası oluştu.', 'error');
      } else {
        showToast('Kelime sözlükte bulunamadı.', 'error');
      }
      setIsValidating(false);
      return;
    }

    // Process guess
    const feedback = evaluateGuessLocally(currentGuess, targetWord);
    const updatedGuesses = [...userGuesses, currentGuess];
    setUserGuesses(updatedGuesses);
    setCurrentGuess('');
    setIsValidating(false);

    // Update keys color status
    const newKeys = { ...letterStatuses };
    currentGuess.split('').forEach((char, idx) => {
      const color = feedback[idx];
      const prev = newKeys[char];
      if (color === 'green') newKeys[char] = 'green';
      else if (color === 'orange' && prev !== 'green') newKeys[char] = 'orange';
      else if (color === 'grey' && !prev) newKeys[char] = 'grey';
    });
    setLetterStatuses(newKeys);

    // Check if won
    const isSolved = currentGuess === targetWord;
    const isFinished = isSolved || updatedGuesses.length >= 6;

    if (isOnlineMode) {
      // Write current guess progress in real-time to Firestore
      handleOnlineLocalRoundFinished(currentRound, isSolved, updatedGuesses.length, updatedGuesses);
    }

    if (isSolved) {
      setUserSolved(true);
      setUserFinished(true);
      showToast('Kelimeyi doğru çözdünüz! Rakipleri bekleyin.', 'success');
      
      setLiveLogs((prev) => [
        ...prev,
        {
          time: `00:${String(45 - roundTimer).padStart(2, '0')}`,
          text: `SİZ (${profile.name}) Kelimeyi çözdünüz! 🌟 (${updatedGuesses.length}. deneme)`,
          icon: '🌟'
        }
      ]);

      if (!isOnlineMode) {
        // If all other active bots are already finished or solved, fast-forward round end
        const otherActive = competitors.filter(c => !c.eliminated && !c.isUser && !c.solved);
        if (otherActive.length === 0) {
          setTimeout(endRound, 2000);
        }
      }
    } else if (isFinished) {
      setUserFinished(true);
      showToast('Hakkınız bitti! Tur sonunu bekleyin.', 'error');
      
      setLiveLogs((prev) => [
        ...prev,
        {
          time: `00:${String(45 - roundTimer).padStart(2, '0')}`,
          text: `SİZ (${profile.name}) elendiniz! 💀`,
          icon: '💀'
        }
      ]);
      
      if (!isOnlineMode) {
        // If all other active bots are already finished or solved, fast-forward round end
        const otherActive = competitors.filter(c => !c.eliminated && !c.isUser && !c.solved);
        if (otherActive.length === 0) {
          setTimeout(endRound, 2000);
        }
      }
    }
  };

  // Keyboard physical mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      
      if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACK');
      } else {
        handleKeyPress(turkishUpper(e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, userFinished, phase, wordLength]);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  // Filter survivors and eliminated
  const activeCompetitors = competitors.filter(c => !c.eliminated || c.isUser);
  const userCompetitor = competitors.find(c => c.isUser);
  const isUserEliminated = userCompetitor?.eliminated;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-6 animate-fade-in" id="group-race-main-container">
      
      {/* MATCHMAKING QUEUE LOADER SCREEN */}
      {isQueueing && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-8 sm:p-16 text-center text-white shadow-2xl space-y-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin flex items-center justify-center">
              <Globe size={32} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="absolute top-0 left-0 w-full h-full rounded-full border border-teal-500/30 animate-ping opacity-40"></div>
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            <h3 className="text-2xl font-black text-[#FAF6E9] tracking-tight">
              Eşleşme Aranıyor...
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Battle Royale arenasına giriş yapıyorsunuz. Sizinle aynı anda butona basan diğer oyuncular taranıyor...
            </p>
          </div>

          <div className="flex justify-center items-center gap-1.5 px-4 py-2 bg-[#1E2532]/60 rounded-xl border border-slate-600/30 max-w-[240px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider font-mono">KUYRUKTA BEKLENİYOR</span>
          </div>

          <div className="pt-4">
            <button
              onClick={handleExitGame}
              className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 font-extrabold rounded-xl text-xs transition uppercase tracking-wider"
            >
              Kuyruktan Çık / Vazgeç ❌
            </button>
          </div>
        </div>
      )}

      {/* MODE SELECTION SCREEN */}
      {phase === 'mode_selection' && !isQueueing && (
        <div className="bg-[#2E3748]/70 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-10 relative overflow-hidden text-center animate-scale-up" id="mode-selection-card">
          {/* Ambient Glowing Backdrops */}
          <div className="absolute top-0 left-0 -translate-y-24 -translate-x-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-0 right-0 translate-y-24 translate-x-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          
          <div className="space-y-4 max-w-xl mx-auto relative z-10">
            <div className="inline-flex p-4 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 shadow-inner transform rotate-1 hover:rotate-3 transition duration-300">
              <Swords size={44} className="stroke-[2]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#FAF6E9]">
              Grup Yarışı <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400">Arenası</span>
            </h1>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Mücadeleye nasıl katılmak istersiniz? Çevrimiçi lobide arkadaşlarınızla yarışın ya da anında 19 akıllı bota karşı turnuvaya başlayın.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-2 relative z-10">
            {/* ONLINE MULTIPLAYER CARD */}
            <button
              onClick={() => {
                setIsOnlineMode(true);
                joinMatchmakingQueue();
              }}
              className="group text-left bg-gradient-to-br from-[#1E2532]/90 to-[#242C3D]/90 border border-white/10 hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] rounded-[2rem] p-6 sm:p-8 space-y-6 transition duration-300 active:scale-[0.98] shadow-2xl relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-24 h-24 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-xl transition duration-300"></div>
              
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 group-hover:text-emerald-300 transition duration-300">
                  <Globe size={26} className="stroke-[2.2]" />
                </div>
                <span className="text-[9px] uppercase font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 tracking-widest font-mono">
                  MULTIPLE OYUN
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#FAF6E9] group-hover:text-emerald-300 transition duration-300 flex items-center gap-2">
                  Çevrimiçi Savaş
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Hızlı lobi eşleşmesi ile 20 kişilik Battle Royale arenasına anında katılın. Diğer oyuncularla veya eksik yerleri tamamlayan botlarla yarışın!
                </p>
              </div>
            </button>

            {/* OFFLINE BOT CARD */}
            <button
              onClick={() => {
                setIsOnlineMode(false);
                setPhase('lobby');
              }}
              className="group text-left bg-gradient-to-br from-[#1E2532]/90 to-[#242C3D]/90 border border-white/10 hover:border-amber-500 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] rounded-[2rem] p-6 sm:p-8 space-y-6 transition duration-300 active:scale-[0.98] shadow-2xl relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-24 h-24 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full blur-xl transition duration-300"></div>
              
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400 group-hover:scale-110 group-hover:text-amber-300 transition duration-300">
                  <Bot size={26} className="stroke-[2.2]" />
                </div>
                <span className="text-[9px] uppercase font-black bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 tracking-widest font-mono">
                  YAPAY ZEKA
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#FAF6E9] group-hover:text-amber-300 transition duration-300">
                  Yapay Zekaya Karşı
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Bekleme süresi olmadan hemen oyuna başlayın! Çeşitli zorluk seviyelerinde 19 akıllı bota karşı kıyasıya bir turnuvaya adım atın.
                </p>
              </div>
            </button>
          </div>

          <div className="pt-4 relative z-10">
            <button
              onClick={onExit}
              className="px-6 py-3 bg-[#3D4756] hover:bg-[#485365] active:scale-[0.97] text-[#FAF6E9] rounded-xl text-xs font-bold transition duration-150 shadow-md border border-white/5 cursor-pointer uppercase tracking-wider"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}

      {/* ONLINE LOBBY SELECTION */}
      {phase === 'online_lobby_selection' && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 sm:p-12 text-white shadow-2xl space-y-8 relative overflow-hidden" id="online-selection-card">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FAF6E9]">
              Çevrimiçi <span className="text-emerald-400">Lobi</span> Kur & Katıl
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Bir lobi kodu girerek arkadaşlarının odasına bağlan veya yeni bir oda açarak şampiyonluk yolunu kendin çiz!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto pt-4">
            {/* JOIN ODA */}
            <div className="bg-[#1E2532]/65 border border-[#3E485A] p-6 sm:p-8 rounded-[2rem] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold text-[#FAF6E9] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Var Olan Odaya Katıl
                </h3>
                <p className="text-xs text-slate-400">
                  Arkadaşının seninle paylaştığı 6 haneli benzersiz oda kodunu buraya girerek lobiye dahil ol.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="ODA KODU (örn. XR9T2W)"
                  className="w-full bg-[#1A202C] border-2 border-[#3E485A] focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-center text-lg font-extrabold font-mono tracking-widest text-[#FAF6E9] placeholder:text-gray-500 placeholder:text-xs"
                />

                <button
                  onClick={joinOnlineRoom}
                  disabled={isJoiningRoom}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white rounded-xl text-xs font-black tracking-wider uppercase transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  {isJoiningRoom ? 'Odaya Katılınıyor...' : 'Odaya Katıl 🚀'}
                </button>
              </div>
            </div>

            {/* CREATE ODA */}
            <div className="bg-[#1E2532]/65 border border-[#3E485A] p-6 sm:p-8 rounded-[2rem] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-extrabold text-[#FAF6E9] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  Yeni Bir Oda Kur
                </h3>
                <p className="text-xs text-slate-400">
                  Ev sahibi olarak yeni bir lobi kur ve arkadaşlarına dağıtabileceğin oda koduna anında sahip ol.
                </p>
              </div>

              <div className="space-y-3">
                <div className="border border-dashed border-[#3E485A] rounded-xl p-3.5 text-center text-xs text-slate-400 font-mono">
                  Ev Sahibi (Lider): {profile.name}
                </div>

                <button
                  onClick={createOnlineRoom}
                  disabled={isCreatingRoom}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-teal-500/40 text-white rounded-xl text-xs font-black tracking-wider uppercase transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2"
                >
                  {isCreatingRoom ? 'Oda Kuruluyor...' : 'Oda Kur & Kod Üret 👑'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setPhase('mode_selection')}
              className="px-5 py-2 bg-[#3D4756] hover:bg-[#485365] text-[#FAF6E9] rounded-xl text-xs font-bold transition"
            >
              Geri Dön
            </button>
          </div>
        </div>
      )}

      {/* ONLINE LOBBY ROOM SCREEN */}
      {phase === 'online_lobby' && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden" id="online-lobby-card">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1E2532]/65 border border-[#3E485A] p-6 rounded-2xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">DAVET KODU</span>
              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <span className="text-3xl font-black font-mono text-white tracking-widest">
                  {roomCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    showToast('Oda kodu panoya kopyalandı!', 'success');
                  }}
                  className="p-1.5 bg-[#3D4756] hover:bg-[#485365] text-emerald-400 rounded-lg transition"
                  title="Kodu Kopyala"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-2">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">BATTLE ROYALE GERİ SAYIMI</span>
              <div className="flex flex-col items-center sm:items-end gap-1">
                <span className="text-2xl font-black font-mono text-amber-400 animate-pulse">
                  {onlineLobbyCountdown} sn
                </span>
                <div className="w-32 bg-slate-700 h-1.5 rounded-full overflow-hidden border border-slate-600">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (onlineLobbyCountdown / 60) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-medium">
                  {roomPlayers.length}/20 Oyuncu veya Süre Dolunca Başlar
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} />
                Lobideki Oyuncular ({roomPlayers.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roomPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition ${
                    player.id === profile.id
                      ? 'bg-[#3D4756] border-emerald-400/40 shadow-md'
                      : 'bg-black/20 border-[#3E485A]/70'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-[#1E2532] flex items-center justify-center text-xl shrink-0">
                    {player.avatar || '👤'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold truncate block text-[#FAF6E9]">
                      {player.name} {player.id === profile.id && '(Siz)'}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-bold">
                      {player.isBot ? '🤖 Yapay Zeka Bot' : (player.id === roomPlayers[0]?.id ? '👑 Ev Sahibi' : '✔ Katıldı')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-[#3E485A]/30 pt-6">
            <button
              onClick={handleExitGame}
              className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold rounded-xl text-xs transition uppercase"
            >
              Lobiyi Terket / Çık
            </button>

            {isHost ? (
              <button
                onClick={autoStartOnlineTournamentWithBots}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/15"
              >
                Savaşı Başlat ⚔
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-400 animate-pulse">
                Ev sahibinin oyunu başlatması bekleniyor...
              </span>
            )}
          </div>
        </div>
      )}

      {/* 1. PHASE: LOBBY */}
      {phase === 'lobby' && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl space-y-8 relative overflow-hidden" id="group-lobby-card">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 transform rotate-6 animate-pulse">
              <Swords size={40} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Botlara Karşı <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Grup Yarışı</span> Turnuvası
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Sınır 20 kişidir. 1 dakika içinde düello alanında toplanan tüm oyuncular aynı anda, aynı gizli kelimelerle elenerek finale doğru kıyasıya yarışır!
            </p>
          </div>

          {/* Countdown timer & launch button */}
          <div className="bg-[#1E2532]/65 border border-[#3E485A] rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto">
            <div className="flex justify-center items-center gap-3">
              <Clock size={20} className="text-amber-500 animate-spin" />
              <span className="text-sm font-bold text-[#FAF6E9]/90">Geri Sayım Başladı:</span>
              <span className="text-2xl font-extrabold font-mono text-amber-500">{lobbyCountdown} saniye</span>
            </div>
            
            <div className="w-full bg-[#1A202C] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${(lobbyCountdown / 15) * 100}%` }}
              ></div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleExitGame}
                className="px-5 py-2.5 bg-[#3D4756] hover:bg-[#3D4756]/80 text-[#FAF6E9] rounded-xl text-xs font-bold transition"
              >
                Vazgeç / Çık
              </button>
              <button
                onClick={() => startTournament()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/15"
              >
                Süre Beklemeden Başlat
              </button>
            </div>
          </div>

          {/* Connected players grid (Up to 20 players) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} />
                Düello Alanındaki Oyuncular ({lobbyPlayers.length}/20)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">
                Aktif Katılım Sürüyor
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {lobbyPlayers.map((player, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 transition transform hover:scale-105 duration-150 ${
                    player.isUser 
                      ? 'bg-[#3D4756] border-amber-300/65' 
                      : 'bg-black/25 border-[#3E485A]/85'
                  }`}
                >
                  <span className="w-9 h-9 rounded-full bg-[#3D4756] flex items-center justify-center text-xl shadow-inner shrink-0">
                    {player.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold truncate block text-[#FAF6E9]">
                      {player.name}
                    </span>
                    <span className={`text-[9px] font-bold block ${player.ready ? 'text-emerald-400' : 'text-gray-400 animate-pulse'}`}>
                      {player.ready ? 'HAZIR ✔' : 'KATILIYOR...'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Placeholder slots to show 20 size limit */}
              {Array.from({ length: Math.max(0, 20 - lobbyPlayers.length) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="border border-dashed border-[#3E485A] p-3 rounded-2xl flex items-center justify-center text-gray-400 min-h-[58px]">
                  <span className="text-[10px] font-mono tracking-wider">Açık Slot #{lobbyPlayers.length + idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. PHASE: ACTIVE TOURNAMENT PLAYING */}
      {phase === 'playing' && (
        <div className="max-w-md mx-auto space-y-6" id="group-race-battlefield">
          
          {/* Top Row: Back button, Title / Round info, Rivals drawer trigger button */}
          <div className="flex justify-between items-center bg-[#2E3748] border border-[#3E485A] p-4 rounded-[1.8rem] shadow-lg text-white">
            <button
              onClick={handleExitGame}
              className="p-2.5 bg-[#3D4756] hover:bg-rose-500 hover:text-white text-[#FAF6E9] rounded-xl transition duration-150 border border-[#3E485A] cursor-pointer"
              title="Oyundan Çık"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="text-center">
              <h2 className="text-xs font-black text-[#FAF6E9] uppercase tracking-widest">
                TUR #{currentRound} <span className="text-amber-400">({wordLength} Harf)</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                Kalan: {competitors.filter(c => !c.eliminated).length} / 20
              </p>
            </div>

            <button
              onClick={() => {
                setRivalsTab('standings');
                setIsRivalsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-extrabold transition shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Users size={14} />
              <span>Yarışçılar</span>
            </button>
          </div>

          {/* TIMER ROW */}
          <div className="bg-[#2E3748] border border-[#3E485A] px-5 py-3 rounded-2xl flex items-center justify-between shadow-md">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wide">Kalan Süre:</span>
            <div className="flex items-center gap-2.5 bg-black/25 px-3 py-1.5 rounded-xl border border-[#3E485A]">
              <Clock size={15} className={`animate-pulse ${roundTimer < 15 ? 'text-rose-500' : 'text-emerald-500'}`} />
              <span className={`font-mono text-sm font-extrabold ${roundTimer < 15 ? 'text-rose-500' : 'text-[#FAF6E9]'}`}>
                00:{String(roundTimer).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Wordle Grid block */}
          <div className="bg-[#2E3748] border border-[#3E485A] p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center space-y-5 relative text-white">
            {isUserEliminated && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-3xl z-40 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <ShieldAlert size={48} className="text-rose-500" />
                <h3 className="text-xl font-bold text-white">Yarıştan Elendiniz!</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Bu turda elendiniz ancak diğer oyuncuların kıyasıya düellosunu canlı olarak izleyip kimin kazanacağını görebilirsiniz!
                </p>
                <button
                  onClick={() => {
                    setRivalsTab('standings');
                    setIsRivalsOpen(true);
                  }}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-rose-500/10"
                >
                  Canlı Sıralamayı Gör
                </button>
              </div>
            )}

            {/* Grid representation */}
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, rowIdx) => {
                const guess = userGuesses[rowIdx] || '';
                const isCurrent = rowIdx === userGuesses.length && !userFinished;
                const feedback = userGuesses[rowIdx] ? evaluateGuessLocally(guess, targetWord) : [];

                return (
                  <div key={rowIdx} className="flex gap-2 justify-center">
                    {Array.from({ length: wordLength }).map((_, colIdx) => {
                      let letter = '';
                      if (isCurrent) {
                        letter = currentGuess[colIdx] || '';
                      } else if (userGuesses[rowIdx]) {
                        letter = guess[colIdx] || '';
                      }

                      const status = feedback[colIdx];
                      let bgClass = 'bg-[#222B3A]/45 border-[#3E485A] text-[#FAF6E9]';
                      if (status === 'green') bgClass = 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/10';
                      else if (status === 'orange') bgClass = 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/10';
                      else if (status === 'grey') bgClass = 'bg-slate-500 border-[#3E485A] text-white';

                      return (
                        <div
                          key={colIdx}
                          className={`w-10 h-10 sm:w-12 sm:h-12 border-[3px] rounded-xl flex items-center justify-center text-sm sm:text-base font-extrabold select-none transition-all duration-300 ${bgClass} ${
                            isCurrent && letter ? 'scale-105 border-emerald-500 ring-2 ring-emerald-500/15' : ''
                          }`}
                        >
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Guesses loader indicator */}
            {isValidating && (
              <div className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                Sözlükte Kelime Sorgulanıyor...
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          {!isUserEliminated && (
            <BottomBar
              currentGuess={currentGuess}
              wordLength={wordLength}
              isValidating={isValidating}
              onClear={() => {
                if (currentGuess.length > 0) {
                  setCurrentGuess('');
                }
              }}
              onSubmit={submitUserGuess}
            />
          )}

          {/* Virtual Keyboard */}
          {!isUserEliminated && (
            <div className="bg-[#2E3748] border border-[#3E485A] p-4 sm:p-5 rounded-[2rem] shadow-lg">
              <div className="space-y-1.5 sm:space-y-2 max-w-2xl mx-auto">
                {KEYBOARD_ROWS.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1 sm:gap-1.5 justify-center">
                    {rowIdx === 2 && (
                      <button
                        onClick={() => handleKeyPress('ENTER')}
                        className="flex-1 sm:flex-none px-3 py-3 rounded-xl bg-[#3D4756] hover:bg-[#3D4756]/80 text-[#FAF6E9] font-bold text-[10px] sm:text-xs transition active:scale-95 border border-[#3E485A] cursor-pointer"
                      >
                        GİRİŞ
                      </button>
                    )}
                    
                    {row.map((char) => {
                      const status = letterStatuses[char];
                      let bgClass = 'bg-[#3D4756] hover:bg-[#3D4756]/80 text-[#FAF6E9] border border-[#3E485A] cursor-pointer';
                      if (status === 'green') bgClass = 'bg-emerald-500 text-white shadow-sm cursor-pointer';
                      else if (status === 'orange') bgClass = 'bg-amber-500 text-white shadow-sm cursor-pointer';
                      else if (status === 'grey') bgClass = 'bg-[#1E2532] text-gray-500 border border-[#3E485A]/50 cursor-pointer';

                      return (
                        <button
                          key={char}
                          onClick={() => handleKeyPress(char)}
                          className={`h-9 sm:h-12 w-8 sm:w-10 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center transition active:scale-95 ${bgClass}`}
                        >
                          {char}
                        </button>
                      );
                    })}

                    {rowIdx === 2 && (
                      <button
                        onClick={() => handleKeyPress('BACK')}
                        className="flex-1 sm:flex-none px-3 py-3 rounded-xl bg-[#3D4756] hover:bg-[#3D4756]/80 text-[#FAF6E9] font-bold text-[10px] sm:text-xs transition active:scale-95 border border-[#3E485A] cursor-pointer"
                      >
                        SİL
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rivals & Live Feed Drawer Modal */}
          {isRivalsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-end animate-fade-in">
              {/* Backdrop */}
              <div 
                onClick={() => setIsRivalsOpen(false)} 
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
              />
              
              {/* Content panel */}
              <div className="relative w-full max-w-md h-full bg-[#2E3748] border-l border-[#3E485A] shadow-2xl flex flex-col text-white animate-scale-up">
                
                {/* Header */}
                <div className="p-5 border-b border-[#3E485A] flex justify-between items-center bg-[#242C3D]">
                  <div className="flex items-center gap-2">
                    <Users className="text-emerald-400" size={18} />
                    <h3 className="text-sm font-black tracking-wider uppercase text-[#FAF6E9]">Yarışçılar & Akış</h3>
                  </div>
                  <button 
                    onClick={() => setIsRivalsOpen(false)}
                    className="p-1.5 hover:bg-[#3D4756] rounded-lg transition text-slate-400 hover:text-white"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 border-b border-[#3E485A] bg-[#1E2532]/40">
                  <button
                    onClick={() => setRivalsTab('standings')}
                    className={`py-3.5 text-xs font-black uppercase tracking-wider text-center transition border-b-2 ${
                      rivalsTab === 'standings' 
                        ? 'border-emerald-500 text-emerald-400 bg-white/5' 
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Sıralama ({competitors.filter(c => !c.eliminated).length}/20)
                  </button>
                  <button
                    onClick={() => setRivalsTab('feed')}
                    className={`py-3.5 text-xs font-black uppercase tracking-wider text-center transition border-b-2 relative ${
                      rivalsTab === 'feed' 
                        ? 'border-emerald-500 text-emerald-400 bg-white/5' 
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Canlı Akış
                    {liveLogs.length > 0 && (
                      <span className="absolute top-2.5 right-6 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {rivalsTab === 'standings' ? (
                    <div className="space-y-2.5">
                      {/* Sort players for better UX inside standings tab */}
                      {[...activeCompetitors].sort((a, b) => {
                        if (a.solved && !b.solved) return -1;
                        if (!a.solved && b.solved) return 1;
                        if (a.solved && b.solved) {
                          if (a.currentAttempt !== b.currentAttempt) {
                            return a.currentAttempt - b.currentAttempt;
                          }
                        }
                        return b.score - a.score;
                      }).map((c) => (
                        <div 
                          key={c.id} 
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition duration-150 ${
                            c.isUser 
                              ? 'bg-[#3D4756] border-emerald-500/40 shadow-sm' 
                              : c.eliminated 
                              ? 'bg-black/20 border-[#3E485A]/55 opacity-40' 
                              : 'bg-black/15 border-[#3E485A]/45'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-full bg-[#3D4756] border border-[#3E485A] flex items-center justify-center text-base shadow-inner shrink-0">
                              {c.avatar}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs font-extrabold truncate block ${c.isUser ? 'text-emerald-400' : 'text-[#FAF6E9]'}`}>
                                {c.name} {c.isUser && '(SİZ)'}
                              </span>
                              
                              {/* visual guessing squares representing effort */}
                              <div className="flex gap-0.5 mt-0.5">
                                {Array.from({ length: 6 }).map((_, i) => {
                                  const attempted = i < c.currentAttempt;
                                  const solvedRow = c.solved && i === c.currentAttempt - 1;
                                  return (
                                    <div 
                                      key={i} 
                                      className={`w-2.5 h-2.5 rounded-sm ${
                                        solvedRow 
                                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/10' 
                                          : attempted 
                                          ? 'bg-amber-500' 
                                          : 'bg-[#1E2532]'
                                      }`}
                                    ></div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {c.solved ? (
                              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                                Çözdü ✔
                              </span>
                            ) : c.eliminated ? (
                              <span className="text-[10px] font-semibold text-rose-400">
                                Elendi
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-gray-400">
                                {c.currentAttempt}/6 Tahmin
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl min-h-[300px] max-h-full overflow-y-auto font-mono text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Savaş Harekat Logu</span>
                        <span className="text-rose-500 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                          CANLI
                        </span>
                      </div>

                      <div ref={logContainerRef} className="space-y-2 max-h-[450px] overflow-y-auto">
                        {liveLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 items-start leading-tight">
                            <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                            <p className="flex-1 text-[11px] text-slate-300">
                              {log.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#242C3D]/60 border-t border-[#3E485A] text-center">
                  <button 
                    onClick={() => setIsRivalsOpen(false)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    Oyuna Geri Dön 🎮
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PHASE: ELIMINATION SUMMARY */}
      {phase === 'elimination' && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-6 text-center text-white" id="elimination-results">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FAF6E9] tracking-tight">
              Tur #{currentRound} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Tur Raporu</span>
            </h1>
            <p className="text-xs text-gray-300 font-semibold uppercase">
              Gizli Kelime: <span className="text-emerald-400 font-extrabold underline">{targetWord}</span>
            </p>
          </div>

          {/* Results dashboard list */}
          <div className="max-w-2xl mx-auto border border-[#3E485A] rounded-2xl overflow-hidden shadow-sm text-left">
            <div className="bg-black/25 px-4 py-2 text-left border-b border-[#3E485A] flex justify-between text-xs font-bold text-gray-300 uppercase tracking-wider">
              <span>Oyuncu Adı</span>
              <span>Tur Skoru / Durumu</span>
            </div>

            <div className="divide-y divide-[#3E485A]/40 max-h-80 overflow-y-auto">
              {[...competitors].sort((a, b) => {
                // Survivors first, then elminated
                if (!a.eliminated && b.eliminated) return -1;
                if (a.eliminated && !b.eliminated) return 1;
                
                // If both same state, sort by performance
                if (a.solved && !b.solved) return -1;
                if (!a.solved && b.solved) return 1;
                
                if (a.solved && b.solved) {
                  if (a.solvedRound !== b.solvedRound) return a.solvedRound - b.solvedRound;
                  return (b.solveTime || 0) - (a.solveTime || 0);
                }
                return b.currentAttempt - a.currentAttempt;
              }).map((c, idx) => {
                return (
                  <div 
                    key={c.id} 
                    className={`px-4 py-3 flex justify-between items-center text-left ${
                      c.isUser ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{c.avatar}</span>
                      <div>
                        <span className={`text-xs font-extrabold block ${c.isUser ? 'text-emerald-400' : 'text-[#FAF6E9]'}`}>
                          {c.name} {c.isUser && '(SİZ)'}
                        </span>
                        <span className="text-[10px] text-gray-300 block font-medium">
                          {c.solved ? `${c.solvedRound}. denemede çözdü` : 'Çözemedi'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {c.eliminated ? (
                        <span className="text-[10px] font-extrabold bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full border border-rose-500/15 uppercase">
                          Elendi 💀
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/15 uppercase">
                          Tur Atladı 🚀
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Survival banner controls */}
          <div className="pt-4 max-w-md mx-auto space-y-4">
            {isUserEliminated ? (
              <div className="space-y-3 p-4 bg-rose-500/5 border border-rose-200 dark:border-rose-900 rounded-2xl">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  Maalesef elendiniz ancak diğer robotların turlarını izleyip şampiyonu görebilirsiniz!
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={onExit}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Lobiye Dön / Çık
                  </button>
                  <button
                    onClick={() => {
                      // Let them advance as spectator
                      const nextRoundNum = currentRound + 1;
                      setupRound(nextRoundNum, competitors.filter(c => !c.eliminated).length);
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-md shadow-amber-500/10"
                  >
                    Turu İzle (Seyirci)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  Harika performans! Bir sonraki {currentRound === 3 ? 'Şampiyonluk' : 'Eleme'} Turuna yükseldiniz.
                </p>
                <button
                  onClick={() => {
                    const nextRoundNum = currentRound + 1;
                    setupRound(nextRoundNum, competitors.filter(c => !c.eliminated).length);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition shadow-md shadow-emerald-500/15"
                >
                  <span>Sonraki Tur ({currentRound === 3 ? 'BÜYÜK FİNAL!' : 'Zorlu Eşleşme'})</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PHASE: END OF TOURNAMENT */}
      {phase === 'ended' && (
        <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl space-y-8 text-center relative overflow-hidden animate-fade-in" id="tournament-champion-board">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Winner announcement */}
          <div className="space-y-4 max-w-md mx-auto">
            <div className="inline-flex p-5 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full shadow-lg shadow-amber-500/15 text-white animate-bounce">
              <Trophy size={48} />
            </div>

            {(() => {
              const champion = competitors.find(c => !c.eliminated);
              const isUserChampion = champion?.isUser;

              if (isUserChampion) {
                return (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-[#3E485A]/50 uppercase tracking-widest">
                      🏆 TURNUVA ŞAMPİYONU 🏆
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#FAF6E9] tracking-tight">
                      Büyük Zafer!
                    </h1>
                    <p className="text-xs text-gray-350">
                      Tüm rakiplerinizi elenerek geride bıraktınız ve kupayı kaldırdınız! <strong>+100 Savaş Puanı</strong> hanenize eklendi.
                    </p>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 bg-[#3D4756] px-3 py-1 rounded-full border border-[#3E485A]/50 uppercase tracking-widest">
                      TURNUVA SONA ERDİ
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FAF6E9] tracking-tight">
                      Şampiyon: {champion?.name || 'Bilinmiyor'}
                    </h1>
                    <p className="text-xs text-gray-400 font-medium">
                      Turnuva finalinde rakibiniz zafere ulaştı. Antrenman yapıp bir dahaki sefere kupayı siz kazanın!
                    </p>
                  </div>
                );
              }
            })()}
          </div>

          {/* Tournament Summary Grid */}
          <div className="max-w-xl mx-auto bg-[#1E2532] border border-[#3E485A] p-4 rounded-2xl text-left space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Yarış Sonuç Özet Raporu</span>
            
            <div className="space-y-2 text-[#FAF6E9]">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#3E485A]/30">
                <span className="text-gray-400">Toplam Oyuncu Limiti</span>
                <span className="font-bold text-[#FAF6E9]">20 Kişi</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#3E485A]/30">
                <span className="text-gray-400">Elenme Turları</span>
                <span className="font-bold text-[#FAF6E9]">4 Eleme Aşaması</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-gray-400">Sizin Ulaştığınız Aşama</span>
                <span className="font-extrabold text-emerald-400 uppercase">
                  {isUserEliminated ? `Tur ${currentRound} (Elenildi)` : 'ŞAMPİYONLUK (KAZANDINIZ)'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-2 max-w-sm mx-auto">
            <button
              onClick={onExit}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Home size={14} />
              <span>Ana Sayfaya Dön</span>
            </button>
            <button
              onClick={() => {
                setPhase('lobby');
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15"
            >
              <RotateCcw size={14} />
              <span>Yeni Grup Yarışı Aç</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
