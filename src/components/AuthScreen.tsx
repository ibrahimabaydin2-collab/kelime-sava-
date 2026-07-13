import React, { useState } from 'react';
import { Sparkles, Swords, User, Mail, Lock, ShieldAlert, LogIn, AlertCircle, Facebook, Instagram } from 'lucide-react';
import { UserProfile, LobbyPlayer } from '../types.js';
import { validateUsername, validatePassword } from '../utils/usernameValidation.js';
import { 
  signInAsGuest, 
  registerWithEmailAndPassword, 
  loginWithEmailAndPassword,
  fetchUserProfile,
  saveUserProfileToFirestore,
  signInWithFacebook,
  signInWithInstagram,
  linkWithCredential
} from '../lib/firebase.js';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile, firebaseUser: any) => void;
  lobbyPlayers?: LobbyPlayer[];
}

const AVATAR_PRESETS = [
  '⚔️', '🧠', '🐺', '🦁', '🧙‍♂️', '🦊', 
  '👾', '🦄', '⚡', '👑', '🎯', '🚀', 
  '🔥', '🐉', '🐼', '🛡️', '🏆', '🦉'
];

type AuthMode = 'guest' | 'login' | 'register';

export default function AuthScreen({ onAuthComplete, lobbyPlayers = [] }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('guest');
  
  // Fields
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🧠');
  
  // Touched states for validations
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Social & Account Linking states
  const [pendingCredential, setPendingCredential] = useState<any>(null);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [linkingPassword, setLinkingPassword] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);

  // Validations
  const usernameError = isTouched && (mode === 'guest' || mode === 'register') 
    ? validateUsername(username, lobbyPlayers) 
    : null;
    
  const passwordError = isTouched && (mode === 'register') 
    ? validatePassword(password) 
    : null;

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 128;
          const MAX_HEIGHT = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setSelectedAvatar(dataUrl);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    if (code.includes('auth/email-already-in-use')) {
      return 'Bu e-posta adresi zaten kullanımda.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Geçersiz bir e-posta adresi girdiniz.';
    }
    if (code.includes('auth/weak-password')) {
      return 'Şifre çok zayıf. Lütfen daha güvenli bir şifre seçin.';
    }
    if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
      return 'Hatalı e-posta veya şifre girdiniz.';
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.';
    }
    if (code.includes('auth/admin-restricted-operation')) {
      return 'Firebase Console üzerinde "Anonymous Authentication" (Misafir Girişi) sağlayıcısı etkinleştirilmemiş. Lütfen Firebase Console -> Authentication -> Sign-in method sekmesinden "Anonymous" (Anonim) seçeneğini aktif hale getirin.';
    }
    if (code.includes('auth/operation-not-allowed')) {
      return 'Misafir girişi (Anonymous Auth) şu an için devre dışı bırakılmış. Lütfen Firebase Console -> Authentication sayfasından "Anonymous" sağlayıcısını aktif hale getirin.';
    }
    if (code.includes('auth/network-request-failed') || message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return 'Şu an bağlanılamıyor, lütfen internet bağlantınızı kontrol edip tekrar deneyin.';
    }
    return 'Şu an bağlanılamıyor, lütfen tekrar deneyin.';
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setFirebaseError(null);
    try {
      const { user, credential } = await signInWithFacebook();
      if (credential) {
        setPendingCredential(credential);
        setPendingEmail(credential.email || '');
        setLinkingError(null);
        return;
      }

      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          onAuthComplete(profile, user);
        } else {
          const initialProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Facebook Savaşçısı',
            avatarUrl: user.photoURL || '🧠',
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              currentStreak: 0,
              maxStreak: 0,
              winDistribution: [0, 0, 0, 0, 0, 0],
            },
            badges: [],
            missions: [],
            dailyScore: 0,
            lastUpdated: new Date().toISOString(),
            nameSet: true
          };
          await saveUserProfileToFirestore(initialProfile);
          onAuthComplete(initialProfile, user);
        }
      }
    } catch (err: any) {
      console.error('Facebook login error:', err);
      setFirebaseError('Giriş yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramLogin = async () => {
    setLoading(true);
    setFirebaseError(null);
    try {
      const { user, credential } = await signInWithInstagram();
      
      // Since simulated/real Meta credentials could match an existing email if registered, check if user exists
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          onAuthComplete(profile, user);
        } else {
          const initialProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || 'Instagram Savaşçısı',
            avatarUrl: user.photoURL || '🧠',
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              currentStreak: 0,
              maxStreak: 0,
              winDistribution: [0, 0, 0, 0, 0, 0],
            },
            badges: [],
            missions: [],
            dailyScore: 0,
            lastUpdated: new Date().toISOString(),
            nameSet: true
          };
          await saveUserProfileToFirestore(initialProfile);
          onAuthComplete(initialProfile, user);
        }
      }
    } catch (err: any) {
      console.error('Instagram login error:', err);
      setFirebaseError('Giriş yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTouched(true);
    setFirebaseError(null);

    // Validate based on mode
    if (mode === 'guest' || mode === 'register') {
      const uErr = validateUsername(username, lobbyPlayers);
      if (uErr) return;
    }
    if (mode === 'register') {
      const pErr = validatePassword(password);
      if (pErr) return;
    }

    setLoading(true);

    try {
      if (mode === 'guest') {
        // 1. Play as Guest (Anonymous Auth)
        const firebaseUser = await signInAsGuest();
        
        // Create initial guest profile
        const initialProfile: UserProfile = {
          id: firebaseUser.uid,
          name: username.trim(),
          avatarUrl: selectedAvatar,
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            winDistribution: [0, 0, 0, 0, 0, 0],
          },
          badges: [],
          missions: [],
          dailyScore: 0,
          lastUpdated: new Date().toISOString(),
          nameSet: true
        };

        // Save to Firestore & local storage
        await saveUserProfileToFirestore(initialProfile);
        onAuthComplete(initialProfile, firebaseUser);

      } else if (mode === 'register') {
        // 2. Register with Email/Password
        const firebaseUser = await registerWithEmailAndPassword(email, password);
        
        // Create initial email profile
        const initialProfile: UserProfile = {
          id: firebaseUser.uid,
          name: username.trim(),
          avatarUrl: selectedAvatar,
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            winDistribution: [0, 0, 0, 0, 0, 0],
          },
          badges: [],
          missions: [],
          dailyScore: 0,
          lastUpdated: new Date().toISOString(),
          nameSet: true
        };

        await saveUserProfileToFirestore(initialProfile);
        onAuthComplete(initialProfile, firebaseUser);

      } else if (mode === 'login') {
        // 3. Login with Email/Password
        const firebaseUser = await loginWithEmailAndPassword(email, password);
        
        // Fetch existing profile from Firestore
        const fetchedProfile = await fetchUserProfile(firebaseUser.uid);
        
        if (fetchedProfile) {
          onAuthComplete(fetchedProfile, firebaseUser);
        } else {
          // If no profile exists (unlikely, but fallback), generate a basic one
          const fallbackProfile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.email?.split('@')[0] || 'Oyuncu',
            avatarUrl: '🧠',
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              currentStreak: 0,
              maxStreak: 0,
              winDistribution: [0, 0, 0, 0, 0, 0],
            },
            badges: [],
            missions: [],
            dailyScore: 0,
            lastUpdated: new Date().toISOString(),
            nameSet: false
          };
          onAuthComplete(fallbackProfile, firebaseUser);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setFirebaseError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (pendingCredential) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col gap-5 animate-scale-up" id="auth-linking-card">
        {/* Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-amber-500/15">
            ⚠️
          </div>
          <h2 className="text-lg font-serif font-semibold tracking-widest text-[#FAF6E9] uppercase">Hesap Birleştirme</h2>
          <p className="text-xs text-gray-400 leading-normal max-w-xs mx-auto">
            <b>{pendingEmail}</b> e-posta adresi ile zaten bir savaşçı hesabınız bulunuyor. 
            Sosyal medya hesabınızı bağlayarak puanlarınızı tek hesapta toplamak için şifrenizi girin.
          </p>
        </div>

        {linkingError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-300 flex items-start gap-2 animate-fade-in relative z-10">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{linkingError}</span>
          </div>
        )}

        <div className="space-y-4 text-left relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">Mevcut Şifreniz</label>
            <input
              type="password"
              placeholder="••••••"
              value={linkingPassword}
              onChange={(e) => setLinkingPassword(e.target.value)}
              className="w-full bg-[#3D4756]/40 border border-[#3E485A] rounded-2xl px-4 py-3 text-sm font-bold text-[#FAF6E9] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                if (!linkingPassword) {
                  setLinkingError('Lütfen şifrenizi girin.');
                  return;
                }
                setIsLinking(true);
                setLinkingError(null);
                try {
                  // 1. Sign in with the existing account
                  const user = await loginWithEmailAndPassword(pendingEmail, linkingPassword);
                  // 2. Link the credential
                  await linkWithCredential(user, pendingCredential);
                  
                  // 3. Sync profile
                  const profile = await fetchUserProfile(user.uid);
                  if (profile) {
                    onAuthComplete(profile, user);
                  } else {
                    const fallbackProfile: UserProfile = {
                      id: user.uid,
                      name: user.displayName || pendingEmail.split('@')[0] || 'Oyuncu',
                      avatarUrl: user.photoURL || '🧠',
                      stats: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        currentStreak: 0,
                        maxStreak: 0,
                        winDistribution: [0, 0, 0, 0, 0, 0],
                      },
                      badges: [],
                      missions: [],
                      dailyScore: 0,
                      lastUpdated: new Date().toISOString(),
                      nameSet: true
                    };
                    await saveUserProfileToFirestore(fallbackProfile);
                    onAuthComplete(fallbackProfile, user);
                  }
                } catch (err: any) {
                  console.error('Account linking error:', err);
                  if (err.code?.includes('wrong-password') || err.code?.includes('invalid-credential')) {
                    setLinkingError('Hatalı şifre girdiniz.');
                  } else {
                    setLinkingError(err.message || 'Hesaplar birleştirilemedi. Lütfen tekrar deneyin.');
                  }
                } finally {
                  setIsLinking(false);
                }
              }}
              disabled={isLinking}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs py-3.5 px-4 rounded-xl transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer border border-emerald-500/20"
            >
              {isLinking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Hesapları Güvenle Birleştir'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingCredential(null);
                setPendingEmail('');
                setLinkingPassword('');
                setLinkingError(null);
              }}
              disabled={isLinking}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs py-3.5 px-4 rounded-xl transition active:scale-95 uppercase cursor-pointer border border-white/5"
            >
              İptal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto bg-[#2E3748] rounded-[2.5rem] border border-[#3E485A] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white flex flex-col gap-6 animate-scale-up" id="auth-screen-card">
      {/* Ambient glow inside the card */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center relative z-10 space-y-1">
        <div className="relative flex justify-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 text-3xl">
            ⚔️
          </div>
          <span className="absolute top-0 right-[40%] text-amber-200 animate-pulse text-xs">✦</span>
        </div>
        <h1 className="text-2xl font-serif font-medium tracking-widest text-[#FAF6E9] uppercase">
          KELİME SAVAŞI
        </h1>
        <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
          {mode === 'guest' && 'Sadece bir takma ad belirleyerek hemen misafir olarak başla!'}
          {mode === 'register' && 'E-posta ile kayıt ol, tüm puanlarını ve rütbeni koruma altına al!'}
          {mode === 'login' && 'Eski rütbelerin, puanların ve savaşçı bilgilerinle kaldığın yerden devam et!'}
        </p>
      </div>

      {/* Auth Tabs */}
      <div className="flex bg-[#232B39]/80 p-1.5 rounded-2xl border border-white/5 relative z-10">
        <button
          type="button"
          onClick={() => {
            setMode('guest');
            setFirebaseError(null);
            setIsTouched(false);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider transition uppercase cursor-pointer ${
            mode === 'guest' 
              ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Misafir Olarak
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setFirebaseError(null);
            setIsTouched(false);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider transition uppercase cursor-pointer ${
            mode === 'register' 
              ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Kayıt Ol
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setFirebaseError(null);
            setIsTouched(false);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider transition uppercase cursor-pointer ${
            mode === 'login' 
              ? 'bg-[#FAF6E9] text-[#2E3748] shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Giriş Yap
        </button>
      </div>

      {firebaseError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in relative z-10">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          <span>{firebaseError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10 text-left">
        
        {/* Username field (Guest & Register mode) */}
        {(mode === 'guest' || mode === 'register') && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">
              Savaşçı Adın (Username)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <User size={15} />
              </span>
              <input
                type="text"
                maxLength={26}
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setIsTouched(true);
                }}
                placeholder="Savaşçı adını belirle..."
                className={`w-full bg-[#3D4756]/40 border ${usernameError ? 'border-rose-500 focus:ring-rose-400/40 focus:border-rose-400/40' : 'border-[#3E485A] focus:ring-amber-400/40 focus:border-amber-400/40'} rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 transition`}
              />
            </div>
            {usernameError && (
              <p className="text-xs text-rose-400 font-semibold px-1 mt-1 leading-normal">
                ⚠️ {usernameError}
              </p>
            )}
          </div>
        )}

        {/* Email field (Login & Register mode) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">
              E-Posta Adresiniz
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@domain.com"
                className="w-full bg-[#3D4756]/40 border border-[#3E485A] rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition"
              />
            </div>
          </div>
        )}

        {/* Password field (Login & Register mode) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">
              Şifreniz
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Lock size={15} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIsTouched(true);
                }}
                placeholder="••••••"
                className={`w-full bg-[#3D4756]/40 border ${passwordError ? 'border-rose-500 focus:ring-rose-400/40 focus:border-rose-400/40' : 'border-[#3E485A] focus:ring-amber-400/40 focus:border-amber-400/40'} rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 transition`}
              />
            </div>
            {passwordError ? (
              <p className="text-xs text-rose-400 font-semibold px-1 mt-1 leading-normal">
                ⚠️ {passwordError}
              </p>
            ) : mode === 'register' && (
              <p className="text-[10px] text-gray-400 px-1 mt-0.5 font-medium">
                * Şifreniz en az 6 karakterden oluşmalı, en az bir harf ve bir sayı içermelidir.
              </p>
            )}
          </div>
        )}

        {/* Avatar selection (Guest & Register mode) */}
        {(mode === 'guest' || mode === 'register') && (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-wider block font-sans">
                Savaşçı Avatarını Seç
              </label>
              
              {/* Custom Image Upload Button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="custom-avatar-upload-auth"
                  className="hidden"
                  onChange={handleCustomAvatarUpload}
                />
                <label 
                  htmlFor="custom-avatar-upload-auth"
                  className="text-[10px] bg-[#3D4756]/60 hover:bg-[#3D4756]/90 text-amber-200 border border-white/5 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-md font-bold"
                >
                  <Sparkles size={11} className="text-amber-400" />
                  Kendi Fotoğrafını Yükle
                </label>
              </div>
            </div>

            <div className="flex gap-4 items-center bg-[#232B39]/50 p-3 rounded-2xl border border-white/5">
              {/* Preview */}
              <div className="w-14 h-14 rounded-full bg-[#3D4756] border-2 border-amber-200/60 shadow-[0_0_15px_rgba(251,191,36,0.25)] flex items-center justify-center text-2xl overflow-hidden shrink-0">
                {selectedAvatar && selectedAvatar.length > 3 ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="select-none">{selectedAvatar}</span>
                )}
              </div>

              {/* Presets Slider */}
              <div className="flex-1 overflow-x-auto py-1 flex gap-2 scrollbar-none">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedAvatar(preset)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition duration-150 shrink-0 active:scale-90 hover:bg-white/10 ${
                      selectedAvatar === preset 
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-900 scale-105 shadow-md' 
                        : 'bg-[#2E3748]/50 text-white border border-white/5'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || (mode === 'guest' && !username.trim()) || (mode === 'register' && (!username.trim() || !email || !password)) || (mode === 'login' && (!email || !password)) || !!usernameError || !!passwordError}
          className="w-full bg-[#FAF6E9] hover:bg-[#F3EFE0] active:scale-[0.98] active:translate-y-0.5 text-[#2E3748] font-black text-sm py-4 px-6 rounded-2xl shadow-[0_4px_0_#D9D4C3,0_6px_10px_rgba(0,0,0,0.15)] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center uppercase tracking-wider cursor-pointer border border-[#EBE6D5] mt-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {mode === 'guest' && (
                <>
                  <Swords size={15} className="mr-2 text-[#2E3748]" />
                  <span>Misafir Olarak Oyna</span>
                </>
              )}
              {mode === 'register' && (
                <>
                  <Sparkles size={15} className="mr-2 text-amber-500 fill-amber-500" />
                  <span>Kayıt Ol ve Savaşçı Ol</span>
                </>
              )}
              {mode === 'login' && (
                <>
                  <LogIn size={15} className="mr-2 text-[#2E3748]" />
                  <span>E-posta İle Giriş Yap</span>
                </>
              )}
            </>
          )}
        </button>

        {/* Social logins */}
        <div className="relative flex py-2 items-center" id="social-auth-separator">
          <div className="flex-grow border-t border-white/5" />
          <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-widest font-sans">Veya Sosyal Medya İle</span>
          <div className="flex-grow border-t border-white/5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="social-auth-buttons">
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#182C25]/45 hover:bg-[#1E3A2F]/60 disabled:opacity-50 text-[#FAF6E9] border border-emerald-500/20 hover:border-emerald-400/40 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md cursor-pointer"
          >
            <Facebook size={14} className="text-[#3B82F6] fill-[#3B82F6] shrink-0" />
            <span>Facebook ile Giriş</span>
          </button>

          <button
            type="button"
            onClick={handleInstagramLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#182C25]/45 hover:bg-[#1E3A2F]/60 disabled:opacity-50 text-[#FAF6E9] border border-emerald-500/20 hover:border-emerald-400/40 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md cursor-pointer"
          >
            <Instagram size={14} className="text-[#EC4899] shrink-0" />
            <span>Instagram ile Giriş</span>
          </button>
        </div>

      </form>
    </div>
  );
}
