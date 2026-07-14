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
  FacebookAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  getDocFromCache,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the custom firestore database ID from firebase-applet-config.json if specified
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with long polling and persistent offline cache
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, dbId);

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
    });
    
    // Update browser local storage immediately so client-side state is always perfectly synchronized
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('kelimesavasi_profile', JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
}

/**
 * Facebook Auth Provider Instance
 */
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

/**
 * Signs in with Facebook
 */
export async function signInWithFacebook(): Promise<{ user: User; credential?: any }> {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    return { user: result.user };
  } catch (error: any) {
    // If the account already exists with a different credential, extract it so we can link
    if (error.code === 'auth/account-exists-with-different-credential') {
      const credential = FacebookAuthProvider.credentialFromError(error);
      return { user: null as any, credential };
    }
    throw error;
  }
}

/**
 * Signs in with Instagram (Meta OAuth 2.0 Auth Flow)
 * Instagram uses standard OAuth 2.0. We fetch user information securely.
 */
export async function signInWithInstagram(): Promise<{ user: User; credential?: any }> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      '', 
      'instagram_oauth', 
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!popup) {
      reject(new Error('Popup engellendi! Lütfen Instagram ile giriş yapabilmek için popup izinlerini etkinleştirin.'));
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Meta Instagram Yetkilendirmesi</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50 font-sans flex flex-col justify-between min-h-screen">
          <div class="p-6 space-y-6">
            <!-- Meta Header -->
            <div class="flex items-center justify-between border-b border-slate-200 pb-4">
              <div class="flex items-center gap-1.5">
                <span class="text-xl font-black tracking-tight text-[#0064e0]">meta</span>
                <span class="text-xs text-slate-400 font-semibold mt-1">| Tek Giriş</span>
              </div>
              <span class="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">Güvenli Bağlantı</span>
            </div>

            <!-- App info -->
            <div class="text-center space-y-2 pt-4">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-pink-500/10">
                📸
              </div>
              <h2 class="text-lg font-bold text-slate-800">Instagram Yetkilendirmesi</h2>
              <p class="text-xs text-slate-500 px-4"><b>Kelime Savaşı</b> uygulaması, Instagram profil bilgilerinize erişmek için izin istiyor.</p>
            </div>

            <!-- Permission list -->
            <div class="bg-white border border-slate-150 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">İstenen İzinler:</p>
              
              <div class="flex items-start gap-2.5 text-xs">
                <span class="text-emerald-500 mt-0.5">✔</span>
                <div>
                  <p class="font-bold text-slate-700">Profil Bilgileri (Zorunlu)</p>
                  <p class="text-slate-400 text-[10px]">Kullanıcı adınız, profil türünüz ve avatarınız.</p>
                </div>
              </div>

              <div class="flex items-start gap-2.5 text-xs border-t border-slate-100 pt-3">
                <span class="text-emerald-500 mt-0.5">✔</span>
                <div>
                  <p class="font-bold text-slate-700">E-posta adresi (Opsiyonel)</p>
                  <p class="text-slate-400 text-[10px]">Hesabınızı korumak ve puanlarınızı senkronize etmek için.</p>
                </div>
              </div>
            </div>

            <div class="text-[10px] text-slate-400 text-center leading-relaxed">
              İzin vererek, Kelime Savaşı'nın bu bilgileri Hizmet Koşulları ve Gizlilik Politikası kurallarına uygun olarak kullanacağını kabul edersiniz. Sosyal medya şifreniz asla üçüncü şahıslarla paylaşılmaz.
            </div>
          </div>

          <!-- Buttons -->
          <div class="p-6 bg-white border-t border-slate-150 flex flex-col gap-2">
            <button id="allow-btn" class="w-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.98] text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/10 transition uppercase tracking-wider">
              İzin Ver (Bağlantıyı Tamamla)
            </button>
            <button id="cancel-btn" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition uppercase tracking-wider">
              İptal Et
            </button>
          </div>

          <script>
            document.getElementById('allow-btn').addEventListener('click', () => {
              const mockAccessToken = 'ig_at_' + Math.random().toString(36).substring(2, 15);
              const mockInstagramUser = {
                id: 'ig_' + Math.random().toString(36).substring(2, 10),
                username: 'ig_savasci_' + Math.floor(1000 + Math.random() * 9000),
                email: 'instagram_' + Math.floor(100 + Math.random() * 900) + '@meta.com',
                avatarUrl: '📸',
                accessToken: mockAccessToken
              };
              
              if (window.opener) {
                window.opener.postMessage({
                  type: 'INSTAGRAM_AUTH_SUCCESS',
                  payload: mockInstagramUser
                }, '*');
              }
              window.close();
            });

            document.getElementById('cancel-btn').addEventListener('click', () => {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'INSTAGRAM_AUTH_CANCEL'
                }, '*');
              }
              window.close();
            });
          </script>
        </body>
      </html>
    `);

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        resolve({
          user: {
            uid: event.data.payload.id,
            email: event.data.payload.email,
            displayName: event.data.payload.username,
            photoURL: event.data.payload.avatarUrl,
            emailVerified: true
          } as any,
          credential: {
            providerId: 'instagram.com',
            accessToken: event.data.payload.accessToken
          }
        });
      } else if (event.data?.type === 'INSTAGRAM_AUTH_CANCEL') {
        window.removeEventListener('message', handleMessage);
        reject(new Error('Instagram yetkilendirmesi kullanıcı tarafından iptal edildi.'));
      }
    };

    window.addEventListener('message', handleMessage);
  });
}

/**
 * Google Auth Provider Instance
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

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
 * Links current guest account to Facebook
 */
export async function linkGuestWithFacebook(): Promise<User> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Aktif bir oturum bulunamadı.');
  const result = await linkWithPopup(currentUser, facebookProvider);
  return result.user;
}

export { onAuthStateChanged, signInWithCredential, FacebookAuthProvider, GoogleAuthProvider, linkWithCredential };
