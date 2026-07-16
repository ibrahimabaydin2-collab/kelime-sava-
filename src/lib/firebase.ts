import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously as firebaseSignInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  sendEmailVerification as firebaseSendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDocFromCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection,
  query,
  where,
  getDocs,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the custom firestore database ID from firebase-applet-config.json if specified
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

// Check if localStorage is supported and accessible
let usePersistentCache = false;
try {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem('__fs_test_key', 'test');
    window.localStorage.removeItem('__fs_test_key');
    usePersistentCache = true;
  }
} catch (e) {
  usePersistentCache = false;
}

// Initialize Firestore with auto-detect long polling and cache configuration
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: usePersistentCache 
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache()
}, dbId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on startup as required by the Firebase Integration skill
async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    console.log('Successfully checked Cloud Firestore connection (cached or online).');
  } catch (error) {
    console.warn("Firestore connection check:", error);
  }
}
testConnection();

/**
 * Signs in anonymously (Guest Mode)
 */
export async function signInAsGuest(): Promise<User> {
  const result = await firebaseSignInAnonymously(auth);
  return result.user;
}

/**
 * Registers a new user with Email and Password
 */
export async function registerWithEmailAndPassword(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Send email verification automatically
  await firebaseSendEmailVerification(result.user);
  return result.user;
}

/**
 * Logs in with Email and Password
 */
export async function loginWithEmailAndPassword(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Links an anonymous guest account to an Email & Password
 */
export async function linkGuestToEmailAndPassword(email: string, password: string): Promise<User> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Giriş yapmış aktif bir misafir oturumu bulunamadı.');
  }
  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(currentUser, credential);
  // Send verification email automatically
  await firebaseSendEmailVerification(result.user);
  return result.user;
}

/**
 * Sends a verification email to the current user
 */
export async function sendVerificationEmail(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Giriş yapmış aktif bir kullanıcı bulunamadı.');
  }
  await firebaseSendEmailVerification(currentUser);
}

/**
 * Signs out the current user
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Fetches the user profile from Firestore matching a specific Device ID
 */
export async function fetchUserProfileByDeviceId(deviceId: string): Promise<UserProfile | null> {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('deviceId', '==', deviceId), limit(1));
    const querySnapshot = await Promise.race([
      getDocs(q),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Firestore Fetch Timeout')), 4000))
    ]) as any;

    if (querySnapshot && !querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return docSnap.data() as UserProfile;
    }
  } catch (error) {
    console.warn('Failed to fetch user profile by deviceId:', error);
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('Permission'))) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  }
  return null;
}

/**
 * Deletes a user profile document from Firestore
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error('Failed to delete user profile:', error);
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

/**
 * Fetches the user profile from Firestore
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  try {
    // 1. Try to fetch from server with a timeout
    const userSnap = await Promise.race([
      getDoc(userDocRef),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Firestore Fetch Timeout')), 4000))
    ]) as any;
    
    if (userSnap && userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
  } catch (error) {
    console.warn('Failed to fetch user profile from server, trying offline cache:', error);
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('Permission'))) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
    try {
      // 2. Try to fetch from local Firestore cache
      const userSnap = await getDocFromCache(userDocRef);
      if (userSnap && userSnap.exists()) {
        console.log('Successfully fetched user profile from Firestore offline cache.');
        return userSnap.data() as UserProfile;
      }
    } catch (cacheError) {
      console.warn('Failed to fetch from Firestore offline cache:', cacheError);
    }
  }
  
  // 3. Fallback to localStorage if Firestore is completely unreachable and cache is empty
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const localSaved = window.localStorage.getItem('kelimesavasi_profile');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (parsed && (parsed.id === uid || parsed.uid === uid || parsed.id)) {
          console.log('Restored user profile from localStorage fallback.');
          return parsed as UserProfile;
        }
      }
    }
  } catch (localError) {
    console.warn('Failed to restore from localStorage:', localError);
  }

  return null;
}

/**
 * Saves or updates the user profile in Firestore
 */
export async function saveUserProfileToFirestore(profile: UserProfile): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', profile.id);
    
    // Attempt background save to Firestore (without hard-failing the app if network is slow/offline)
    setDoc(userDocRef, {
      ...profile,
      lastUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(error => {
      console.warn('Background Firestore profile save queued/deferred:', error);
      if (error instanceof Error && (error.message.includes('permission') || error.message.includes('Permission'))) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.id}`);
      }
    });
    
    // Update browser local storage immediately so client-side state is always perfectly synchronized
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('kelimesavasi_profile', JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Failed to save user profile:', error);
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.id}`);
  }
}

/**
 * Google Auth Provider Instance
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Signs in with Google
 */
export async function signInWithGoogle(): Promise<{ user: User; credential?: any }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const credential = GoogleAuthProvider.credentialFromError(error);
      return { user: null as any, credential };
    }
    throw error;
  }
}

/**
 * Links current guest account to Google
 */
export async function linkGuestWithGoogle(): Promise<User> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Aktif bir oturum bulunamadı.');
  const result = await linkWithPopup(currentUser, googleProvider);
  return result.user;
}

/**
 * Fetches user profiles of users who have added the current user to their friends list
 */
export async function fetchUsersWhoAddedMe(uid: string): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('friends', 'array-contains', uid));
    const querySnapshot = await getDocs(q);
    const results: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as UserProfile);
    });
    return results;
  } catch (error) {
    console.error('Failed to fetch users who added me:', error);
    return [];
  }
}

/**
 * Searches for user profiles matching a specific username exactly
 */
export async function searchUserByName(name: string): Promise<UserProfile[]> {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    const results: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as UserProfile);
    });
    return results;
  } catch (error) {
    console.error('Failed to search user by name:', error);
    return [];
  }
}

export { onAuthStateChanged, signInWithCredential, GoogleAuthProvider, linkWithCredential, PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber };
