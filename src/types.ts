export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  winDistribution: number[]; // Index 0 to 5 corresponds to solve in 1 to 6 attempts
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  type: 'play' | 'win' | 'streak' | 'fast_solve' | 'perfect' | 'solve_3' | 'solve_4' | 'solve_5' | 'solve_6' | 'solve_7' | 'solve_8';
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string; // Base64 or Preset image URL
  stats: UserStats;
  badges: Badge[];
  missions: DailyMission[];
  dailyScore: number;
  lastUpdated: string;
}

export interface GameAttempt {
  word: string;
  feedback: ('green' | 'orange' | 'grey')[];
}

export interface Challenge {
  id: string;
  challenger: { id: string; name: string };
  challenged: { id: string; name: string };
  wordLength: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  gameId?: string;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'idle' | 'challenging' | 'playing';
}

export interface RealtimeMatch {
  id: string;
  wordLength: number;
  targetWord: string;
  players: {
    [id: string]: {
      name: string;
      attempts: GameAttempt[];
      currentAttempt: number;
      completed: boolean;
      timeRemaining: number; // For the current turn
      score: number;
      won: boolean;
    };
  };
  status: 'playing' | 'ended';
  winnerId?: string | 'draw';
}
