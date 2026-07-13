import React, { useState } from 'react';
import { X, Sliders, Palette, Layout, Volume2, VolumeX, Check, Smartphone, Sun, Moon, BarChart2, Type, User, Edit2, Shield, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { UserProfile, LobbyPlayer } from '../types.js';
import { validateUsername, validatePassword } from '../utils/usernameValidation.js';
import { auth, linkGuestToEmailAndPassword, sendVerificationEmail } from '../lib/firebase.js';


export interface AppSettings {
  boardTheme: 'classic' | 'ocean' | 'neon' | 'autumn' | 'pastel';
  bgTheme: 'default' | 'sapphire' | 'forest' | 'amethyst' | 'nord';
  keyboardLayout: 'Q' | 'F';
  soundEnabled: boolean;
  hapticEnabled: boolean;
  fontFamily?: 'poppins' | 'montserrat' | 'fredoka' | 'inter' | 'pacifico' | 'roboto-mono';
}

interface SettingsModalProps {
  settings: AppSettings;
  onChangeSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenStats?: () => void;
  profile: UserProfile;
  lobbyPlayers?: LobbyPlayer[];
  onUpdateProfile: (name: string, avatarUrl?: string) => void;
}

export default function SettingsModal({
  settings,
  onChangeSettings,
  onClose,
  darkMode,
  onToggleDarkMode,
  onOpenStats,
  profile,
  lobbyPlayers = [],
  onUpdateProfile
}: SettingsModalProps) {
  const [editName, setEditName] = useState<string>(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatarUrl || '🧠');
  const [showAvatarPresets, setShowAvatarPresets] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  // Account Security state
  const [secureEmail, setSecureEmail] = useState<string>('');
  const [securePassword, setSecurePassword] = useState<string>('');
  const [securePasswordConfirm, setSecurePasswordConfirm] = useState<string>('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [resendingVerification, setResendingVerification] = useState<boolean>(false);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);

  const error = isTouched || editName !== profile.name ? validateUsername(editName, lobbyPlayers, profile.id) : null;

  const AVATAR_PRESETS = [
    '⚔️', '🧠', '🐺', '🦁', '🧙‍♂️', '🦊', 
    '👾', '🦄', '⚡', '👑', '🎯', '🚀', 
    '🔥', '🐉', '🐼', '🛡️', '🏆', '🦉'
  ];

  const handleSaveProfile = (): boolean => {
    setIsTouched(true);
    const validationError = validateUsername(editName, lobbyPlayers, profile.id);
    if (validationError) return false;

    if (editName.trim() && (editName.trim() !== profile.name || selectedAvatar !== profile.avatarUrl)) {
      onUpdateProfile(editName.trim(), selectedAvatar);
    }
    return true;
  };

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
            onUpdateProfile(editName.trim(), dataUrl);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value
    });
  };

  const boardThemes = [
    { id: 'classic', name: 'Klasik Yeşil', desc: 'Yeşil, Turuncu, Gri', preview: ['bg-emerald-500', 'bg-amber-500', 'bg-gray-400'] },
    { id: 'ocean', name: 'Okyanus Mavisi', desc: 'Mavi, Gök Mavisi, Koyu Gri', preview: ['bg-blue-600', 'bg-sky-400', 'bg-slate-400'] },
    { id: 'neon', name: 'Neon Rüya', desc: 'Fuya, Camgöbeği, Koyu Gri', preview: ['bg-fuchsia-500', 'bg-cyan-400', 'bg-zinc-600'] },
    { id: 'autumn', name: 'Sıcak Sonbahar', desc: 'Kızıl, Turuncu, Kahve', preview: ['bg-orange-600', 'bg-amber-600', 'bg-stone-500'] },
    { id: 'pastel', name: 'Şirin Pastel', desc: 'Yumuşak Tonlar', preview: ['bg-teal-300', 'bg-rose-300', 'bg-slate-200'] },
  ];

  const bgThemes = [
    { id: 'default', name: 'Standart Gri', class: 'bg-slate-100 dark:bg-slate-900 border-slate-300' },
    { id: 'sapphire', name: 'Safir Gece', class: 'bg-gradient-to-r from-blue-900 to-indigo-950 border-blue-800' },
    { id: 'forest', name: 'Zümrüt Ormanı', class: 'bg-gradient-to-r from-emerald-900 to-teal-950 border-emerald-800' },
    { id: 'amethyst', name: 'Mistik Mor', class: 'bg-gradient-to-r from-purple-900 to-fuchsia-950 border-purple-800' },
    { id: 'nord', name: 'Nord Kuzey', class: 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 border-slate-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#2E3748] border border-[#3E485A] rounded-[2.2rem] p-6 w-full max-w-lg shadow-2xl space-y-6 overflow-y-auto max-h-[92vh] transition-colors duration-200 text-white relative" id="app-settings-modal">
        {/* Glowing star ornament */}
        <div className="absolute bottom-4 right-4 text-amber-100/10 animate-pulse select-none pointer-events-none">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c.5 6.5 5.5 11.5 12 12-.5 6.5-5.5 11.5-12 12-.5-6.5-5.5-11.5-12-12 .5-6.5 5.5-11.5 12-12z" />
          </svg>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[#3E485A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-md shadow-amber-500/20">
              <Sliders size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-[#FAF6E9]">Oyun Ayarları</h3>
              <p className="text-xs text-gray-400">Görünümü ve kontrolleri kişiselleştirin</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (handleSaveProfile()) {
                onClose();
              }
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Editing Section */}
        <div className="bg-[#3D4756]/30 border border-white/5 rounded-2xl p-4 space-y-4 text-left" id="settings-profile-section">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <User size={14} className="text-amber-400" />
            Savaşçı Profil Ayarları
          </h4>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Avatar Selector */}
            <div className="relative shrink-0">
              <div 
                onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                className="w-16 h-16 rounded-full bg-[#3D4756] border-2 border-amber-200/60 shadow-[0_0_15px_rgba(251,191,36,0.25)] flex items-center justify-center text-3xl overflow-hidden transition-transform duration-200 hover:scale-105 cursor-pointer"
              >
                {selectedAvatar && selectedAvatar.length > 3 ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="select-none">{selectedAvatar}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                id="settings-avatar-upload"
                className="hidden"
                onChange={handleCustomAvatarUpload}
              />
              <label 
                htmlFor="settings-avatar-upload"
                className="absolute -bottom-1 -right-1 bg-amber-400 hover:bg-amber-300 text-slate-950 p-1.5 rounded-full shadow-md transition cursor-pointer"
                title="Fotoğraf Yükle"
              >
                <Edit2 size={10} strokeWidth={2.5} />
              </label>
            </div>

            {/* Username Input */}
            <div className="flex-1 w-full space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-amber-100/60 uppercase tracking-widest block font-sans">KULLANICI ADI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={26}
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setIsTouched(true);
                  }}
                  placeholder="Kullanıcı adınızı yazın..."
                  className={`flex-1 bg-[#2E3748]/55 border ${error ? 'border-rose-500 focus:ring-rose-400/40' : 'border-white/5 focus:ring-amber-200/40'} rounded-xl px-4 py-2 text-xs font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 transition`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsTouched(true);
                    if (handleSaveProfile()) {
                      setIsTouched(false);
                    }
                  }}
                  disabled={!editName.trim() || !!error || editName.trim() === profile.name}
                  className="px-3.5 py-2 bg-[#FAF6E9] hover:bg-[#F3EFE0] disabled:opacity-50 text-[#2E3748] text-xs font-black rounded-xl shadow-md transition active:scale-95 cursor-pointer shrink-0"
                >
                  Güncelle
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-rose-400 font-semibold px-1 mt-1 animate-fade-in text-left leading-normal">
                  ⚠️ {error}
                </p>
              )}
            </div>
          </div>

          {/* Quick Avatar Presets grid */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAvatarPresets(!showAvatarPresets)}
              className="text-[10px] text-amber-200 hover:text-amber-100 flex items-center gap-1 font-bold transition focus:outline-none"
            >
              <span>{showAvatarPresets ? '✦ Presets Kapat' : '✦ Preset Avatar Seç...'}</span>
            </button>
            
            {showAvatarPresets && (
              <div className="grid grid-cols-6 gap-2 p-2.5 bg-black/30 rounded-xl border border-white/5 max-h-24 overflow-y-auto animate-fade-in">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(preset);
                      onUpdateProfile(editName.trim(), preset);
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition duration-150 active:scale-90 hover:bg-white/10 ${
                      selectedAvatar === preset 
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-900 scale-105 shadow' 
                        : ''
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Security (Hesap Güvenliği) */}
        <div className="bg-[#3D4756]/30 border border-white/5 rounded-2xl p-4 space-y-4 text-left shadow-inner" id="settings-security-section">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Shield size={14} className="text-amber-400" />
            Hesap Güvenliği & Koruma
          </h4>

          {auth.currentUser ? (
            !auth.currentUser.isAnonymous ? (
              /* Connected / Email Login Mode */
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#232B39]/50 p-3 rounded-xl border border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-amber-100/50 uppercase tracking-wider font-sans">BAĞLI E-POSTA</p>
                    <p className="text-xs font-black text-gray-200">{auth.currentUser.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                    <CheckCircle2 size={12} />
                    <span>Bağlı</span>
                  </div>
                </div>

                {auth.currentUser.emailVerified ? (
                  <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-xl text-xs font-semibold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-200">🟢 Doğrulanmış Savaşçı Üye</p>
                      <p className="text-[10px] text-emerald-300/80 mt-0.5">Hesabınız tamamen doğrulanmış ve veri kurtarma havuzuna eklenmiştir.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs font-semibold">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <p className="font-bold text-rose-200">🟡 E-posta Doğrulanmamış</p>
                        <p className="text-[10px] text-rose-300/80 mt-0.5 font-medium leading-normal">E-postanız doğrulanana kadar "Doğrulanmış Üye" sayılmaz ve hesap kurtarma havuzuna tam dahil edilmezsiniz.</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      disabled={resendingVerification || verificationSent}
                      onClick={async () => {
                        setResendingVerification(true);
                        setSecurityError(null);
                        try {
                          await sendVerificationEmail();
                          setVerificationSent(true);
                        } catch (err: any) {
                          setSecurityError(err.message || 'Doğrulama e-postası gönderilemedi.');
                        } finally {
                          setResendingVerification(false);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-[#FAF6E9] hover:bg-[#F3EFE0] disabled:opacity-50 text-slate-900 text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center justify-center uppercase tracking-wider cursor-pointer border border-[#EBE6D5]"
                    >
                      {resendingVerification ? 'Gönderiliyor...' : verificationSent ? 'Doğrulama E-postası Gönderildi ✔' : 'Doğrulama E-postası Gönder'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Anonymous / Guest Mode (Needs Protection) */
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-xl text-xs font-semibold">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-bold text-amber-200">Geçici Misafir Profili</p>
                    <p className="text-[10px] text-amber-300/80 mt-0.5 font-medium leading-normal">Hesabınız e-posta ile korunmuyor. Oyunu sildiğinizde veya başka cihazdan giriş yaptığınızda puanlarınız ve ilerlemeniz kaybolabilir!</p>
                  </div>
                </div>

                {securityError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-300 leading-normal animate-fade-in">
                    ⚠️ {securityError}
                  </div>
                )}

                {securitySuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-300 leading-normal animate-fade-in">
                    🎉 {securitySuccess}
                  </div>
                )}

                {!securitySuccess && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-amber-100/50 uppercase tracking-widest block font-sans">E-POSTA ADRESİ</label>
                      <input
                        type="email"
                        placeholder="ornek@domain.com"
                        value={secureEmail}
                        onChange={(e) => setSecureEmail(e.target.value)}
                        className="w-full bg-[#2E3748]/55 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-200/40"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-amber-100/50 uppercase tracking-widest block font-sans">YENİ ŞİFRE</label>
                        <input
                          type="password"
                          placeholder="••••••"
                          value={securePassword}
                          onChange={(e) => setSecurePassword(e.target.value)}
                          className="w-full bg-[#2E3748]/55 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-200/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-amber-100/50 uppercase tracking-widest block font-sans">ŞİFRE TEKRAR</label>
                        <input
                          type="password"
                          placeholder="••••••"
                          value={securePasswordConfirm}
                          onChange={(e) => setSecurePasswordConfirm(e.target.value)}
                          className="w-full bg-[#2E3748]/55 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#FAF6E9] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-200/40"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLinking || !secureEmail || !securePassword}
                      onClick={async () => {
                        setSecurityError(null);
                        setSecuritySuccess(null);
                        
                        /* Validations */
                        const passErr = validatePassword(securePassword);
                        if (passErr) {
                          setSecurityError(passErr);
                          return;
                        }
                        if (securePassword !== securePasswordConfirm) {
                          setSecurityError('Şifreler uyuşmuyor.');
                          return;
                        }

                        setIsLinking(true);
                        try {
                          await linkGuestToEmailAndPassword(secureEmail, securePassword);
                          setSecuritySuccess('Tebrikler! Misafir hesabınız başarıyla e-posta ile korunmuştur. Doğrulama e-postası otomatik olarak gönderildi.');
                          setSecureEmail('');
                          setSecurePassword('');
                          setSecurePasswordConfirm('');
                        } catch (err: any) {
                          console.error('Error protecting account:', err);
                          let msg = err.message || 'Hesap eşleştirme başarısız oldu.';
                          if (err.code?.includes('auth/email-already-in-use')) {
                            msg = 'Bu e-posta adresi zaten kullanımda.';
                          } else if (err.code?.includes('auth/invalid-email')) {
                            msg = 'Geçersiz bir e-posta adresi girdiniz.';
                          } else if (err.code?.includes('auth/weak-password')) {
                            msg = 'Şifre çok zayıf. Lütfen en az 6 karakterli daha güçlü bir şifre seçin.';
                          }
                          setSecurityError(msg);
                        } finally {
                          setIsLinking(false);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-[#FAF6E9] hover:bg-[#F3EFE0] disabled:opacity-50 text-[#2E3748] text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer border border-[#EBE6D5]"
                    >
                      {isLinking ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Key size={12} />
                          <span>Hesabımı Koru (E-posta Bağla)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <p className="text-xs text-gray-400 font-medium">Hesap koruması için aktif bir oturum algılanamadı.</p>
          )}
        </div>

        {/* Section 1: Board Style Theme */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-left">
            <Palette size={14} className="text-amber-400" />
            Kelime Kutucukları Teması (Tahta Rengi)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {boardThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('boardTheme', theme.id as any)}
                className={`text-left p-3 rounded-2xl border-2 flex items-center justify-between transition cursor-pointer ${
                  settings.boardTheme === theme.id
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-md shadow-amber-500/5'
                    : 'border-[#3E485A] hover:bg-[#3D4756]/50 bg-[#3D4756]/20 text-gray-300'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${settings.boardTheme === theme.id ? 'text-amber-400' : 'text-slate-200'}`}>{theme.name}</span>
                  <span className="text-[10px] text-gray-400">{theme.desc}</span>
                </div>
                <div className="flex gap-1 items-center">
                  {theme.preview.map((col, idx) => (
                    <span key={idx} className={`w-3.5 h-3.5 rounded-full ${col} shadow-sm border border-black/20`} />
                  ))}
                  {settings.boardTheme === theme.id && (
                    <Check size={14} className="text-amber-400 ml-1.5 self-center shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Background Theme */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-left">
            <Layout size={14} className="text-amber-400" />
            Arka Plan Teması (Atmosfer)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bgThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('bgTheme', theme.id as any)}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between items-center text-center gap-2 transition min-h-[72px] relative overflow-hidden cursor-pointer ${
                  settings.bgTheme === theme.id
                    ? 'border-amber-500 scale-[1.02] ring-2 ring-amber-500/20'
                    : 'border-[#3E485A]'
                } ${theme.class}`}
              >
                <span className={`text-xs font-bold truncate w-full ${theme.id === 'default' || (theme.id === 'nord' && settings.bgTheme !== 'nord') ? 'text-white' : 'text-white'}`}>
                  {theme.name}
                </span>
                
                {settings.bgTheme === theme.id && (
                  <span className="absolute bottom-1.5 right-1.5 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow">
                    <Check size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2.5: Font Selection */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-left">
            <Type size={14} className="text-amber-400" />
            Yazı Tipi Modu (Font Selection)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'poppins', name: 'Poppins', class: 'font-poppins', desc: 'Modern & Dengeli' },
              { id: 'montserrat', name: 'Montserrat', class: 'font-montserrat', desc: 'Şık & Geometrik' },
              { id: 'fredoka', name: 'Fredoka', class: 'font-fredoka', desc: 'Tombul & Eğlenceli' },
              { id: 'inter', name: 'Inter', class: 'font-inter', desc: 'Minimalist & Net' },
              { id: 'pacifico', name: 'Pacifico', class: 'font-pacifico', desc: 'El Yazısı Tarzı' },
              { id: 'roboto-mono', name: 'Roboto Mono', class: 'font-roboto-mono', desc: 'Havalı Retro Kod' },
            ].map((fontItem) => (
              <button
                key={fontItem.id}
                onClick={() => updateSetting('fontFamily', fontItem.id as any)}
                className={`p-2.5 rounded-xl border-2 flex flex-col justify-center items-center text-center gap-1 transition-all relative cursor-pointer ${fontItem.class} ${
                  settings.fontFamily === fontItem.id || (!settings.fontFamily && fontItem.id === 'poppins')
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 scale-[1.02] ring-2 ring-amber-500/15 font-bold shadow-md'
                    : 'border-[#3E485A] text-gray-300 hover:bg-[#3D4756]/50 bg-[#3D4756]/20'
                }`}
              >
                <span className="text-xs tracking-wide">
                  {fontItem.name}
                </span>
                <span className="text-[9px] text-gray-400 block leading-tight font-sans">
                  {fontItem.desc}
                </span>
                
                {(settings.fontFamily === fontItem.id || (!settings.fontFamily && fontItem.id === 'poppins')) && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow">
                    <Check size={8} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Keyboard and Haptics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Keyboard Layout */}
          <div className="space-y-2.5 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-amber-400" />
              Klavye Düzeni
            </h4>
            <div className="flex gap-1.5 p-1 bg-black/30 rounded-2xl border border-[#3E485A]">
              {['Q', 'F'].map((layout) => (
                <button
                  key={layout}
                  onClick={() => updateSetting('keyboardLayout', layout as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    settings.keyboardLayout === layout
                      ? 'bg-amber-500 text-slate-950 shadow font-black'
                      : 'text-gray-400 hover:bg-white/5'
                  }`}
                >
                  Türkçe {layout}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Feedback */}
          <div className="space-y-2.5 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              {settings.soundEnabled ? <Volume2 size={14} className="text-amber-400" /> : <VolumeX size={14} className="text-gray-400" />}
              Ses ve Geri Bildirim
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`flex-1 py-2 rounded-2xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  settings.soundEnabled
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow'
                    : 'border-[#3E485A] text-gray-400 hover:bg-[#3D4756]/50'
                }`}
              >
                {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>Ses {settings.soundEnabled ? 'Açık' : 'Kapalı'}</span>
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          {onToggleDarkMode !== undefined && (
            <div className="space-y-2.5 text-left">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                {darkMode ? <Moon size={14} className="text-amber-400" /> : <Sun size={14} className="text-amber-500" />}
                Görünüm Modu
              </h4>
              <button
                onClick={onToggleDarkMode}
                className={`w-full py-2 rounded-2xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  darkMode
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow'
                    : 'border-[#3E485A] text-gray-300 hover:bg-[#3D4756]/50'
                }`}
              >
                {darkMode ? <Moon size={14} className="text-amber-400" /> : <Sun size={14} className="text-amber-500" />}
                <span>{darkMode ? 'Gece Modu' : 'Gündüz Modu'}</span>
              </button>
            </div>
          )}

          {/* Stats Button */}
          {onOpenStats !== undefined && (
            <div className="space-y-2.5 text-left">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} className="text-amber-400" />
                Oyuncu İstatistikleri
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onOpenStats();
                }}
                className="w-full py-2 px-3 rounded-2xl border-2 border-dashed border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5 text-amber-400 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <BarChart2 size={14} />
                <span>İstatistikler & Rozetler</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-[#3E485A] flex justify-end gap-2 bg-[#3D4756]/30 -mx-6 -mb-6 p-4 rounded-b-[2.2rem]">
          <button
            onClick={() => {
              handleSaveProfile();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#FAF6E9] text-[#2E3748] hover:bg-[#F3EFE0] text-xs font-black rounded-xl shadow-md transition cursor-pointer border border-[#EBE6D5]"
          >
            Kapat ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
