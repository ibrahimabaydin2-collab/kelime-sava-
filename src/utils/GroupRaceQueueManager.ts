import { 
  collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, increment, deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { UserProfile } from '../types.js';

export class GroupRaceQueueManager {
  // Helper: Generate a random 6-character room code
  private static generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Tries to find an existing open matchmaking lobby (created less than 60 seconds ago, playerCount < 20).
   * If none exists, creates a new one.
   * Joins the player to this lobby and updates playerCount.
   */
  public static async joinGroupRaceQueue(profile: UserProfile): Promise<{ roomId: string; isHost: boolean }> {
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('isGroupRaceMatchmaking', '==', true),
      where('status', '==', 'lobby')
    );

    try {
      const querySnapshot = await getDocs(q);
      let targetRoomId = '';
      let isHost = false;

      // Filter rooms in memory to ensure we choose one with playerCount < 20 and not expired (created within last 60 seconds)
      const now = Date.now();
      const validRooms = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(room => {
          const count = room.playerCount || 0;
          const createdAt = room.createdAt ? new Date(room.createdAt).getTime() : 0;
          const elapsed = (now - createdAt) / 1000;
          // Room must have less than 20 players, and not have been running for more than 60s
          return count < 20 && elapsed < 60;
        })
        // Prefer room with the most players to fill it up faster
        .sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0));

      if (validRooms.length > 0) {
        // Join the best match!
        const room = validRooms[0];
        targetRoomId = room.id;
        isHost = false;

        // Add player to the lobby
        const playerRef = doc(db, 'rooms', targetRoomId, 'players', profile.id);
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

        // Increment player count in the room document
        const roomRef = doc(db, 'rooms', targetRoomId);
        await updateDoc(roomRef, {
          playerCount: increment(1)
        });

      } else {
        // Create a new matchmaking lobby
        const code = this.generateRoomCode();
        targetRoomId = code;
        isHost = true;

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
          createdAt: new Date().toISOString(),
          isGroupRaceMatchmaking: true,
          playerCount: 1
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
      }

      return { roomId: targetRoomId, isHost };
    } catch (err) {
      console.error('GroupRaceQueueManager join error:', err);
      throw err;
    }
  }

  /**
   * Helper to leave the matchmaking lobby (if user leaves before it starts)
   */
  public static async leaveGroupRaceQueue(roomId: string, playerId: string, isHost: boolean): Promise<void> {
    try {
      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
      await deleteDoc(playerRef);

      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const currentCount = data.playerCount || 1;
        if (currentCount <= 1) {
          // If last player left, delete or close room
          await setDoc(roomRef, { status: 'closed' }, { merge: true });
        } else {
          // Decrement player count
          await updateDoc(roomRef, {
            playerCount: increment(-1),
            ...(isHost ? { hostId: '', hostName: '' } : {})
          });
        }
      }
    } catch (err) {
      console.error('GroupRaceQueueManager leave error:', err);
    }
  }
}
