import React, { useState } from 'react';
import { X, Sliders, Palette, Layout, Volume2, VolumeX, Check, Smartphone, Sun, Moon, BarChart2, Wifi, Server, Key, Copy } from 'lucide-react';

export interface AppSettings {
  boardTheme: 'classic' | 'ocean' | 'neon' | 'autumn' | 'pastel';
  bgTheme: 'default' | 'sapphire' | 'forest' | 'amethyst' | 'nord';
  keyboardLayout: 'Q' | 'F';
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

interface SettingsModalProps {
  settings: AppSettings;
  onChangeSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenStats?: () => void;
}

export default function SettingsModal({
  settings,
  onChangeSettings,
  onClose,
  darkMode,
  onToggleDarkMode,
  onOpenStats
}: SettingsModalProps) {
  const activeToken = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('___aistudio_auth_token') ||
       window.localStorage.getItem('aistudio_auth_token') ||
       window.sessionStorage.getItem('aistudio_auth_token') ||
       '')
    : '';

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isDev = currentOrigin.includes('-dev-') || (typeof window !== 'undefined' && window.location.href.includes('-dev-'));
  const currentServer = isDev ? 'dev' : 'pre';
  
  const connectUrl = `${currentOrigin}/connect?token=${encodeURIComponent(activeToken)}&server=${currentServer}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(connectUrl)}`;

  const [tokenInput, setTokenInput] = useState(() => {
    return typeof window !== 'undefined'
      ? (window.localStorage.getItem('aistudio_auth_token') || activeToken)
      : '';
  });
  const [isCopied, setIsCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const [serverType, setServerType] = useState(() => {
    return typeof window !== 'undefined'
      ? (window.localStorage.getItem('kelimesavasi_server_type') || 'pre')
      : 'pre';
  });

  const [customServerUrl, setCustomServerUrl] = useState(() => {
    return typeof window !== 'undefined'
      ? (window.localStorage.getItem('kelimesavasi_custom_server_url') || '')
      : '';
  });

  const handleSaveConnection = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('kelimesavasi_server_type', serverType);
      window.localStorage.setItem('aistudio_auth_token', tokenInput);
      window.sessionStorage.setItem('aistudio_auth_token', tokenInput);
      if (serverType === 'custom') {
        window.localStorage.setItem('kelimesavasi_custom_server_url', customServerUrl);
      }
      setSaveStatus('saved');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 overflow-y-auto max-h-[92vh] animate-scale-up" id="app-settings-modal">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-emerald-500" size={22} />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Oyun Ayarları</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Görünümü ve kontrolleri kişiselleştirin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Board Style Theme */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Palette size={14} />
            Kelime Kutucukları Teması (Tahta Rengi)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {boardThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('boardTheme', theme.id as any)}
                className={`text-left p-3 rounded-2xl border-2 flex items-center justify-between transition ${
                  settings.boardTheme === theme.id
                    ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40 bg-slate-50/50 dark:bg-slate-950/20'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{theme.name}</span>
                  <span className="text-[10px] text-slate-400">{theme.desc}</span>
                </div>
                <div className="flex gap-1">
                  {theme.preview.map((col, idx) => (
                    <span key={idx} className={`w-3.5 h-3.5 rounded-full ${col} shadow-sm`} />
                  ))}
                  {settings.boardTheme === theme.id && (
                    <Check size={14} className="text-emerald-500 ml-1.5 self-center" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Background Theme */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Layout size={14} />
            Arka Plan Teması (Atmosfer)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bgThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('bgTheme', theme.id as any)}
                className={`p-3 rounded-2xl border-2 flex flex-col justify-between items-center text-center gap-2 transition min-h-[72px] relative overflow-hidden ${
                  settings.bgTheme === theme.id
                    ? 'border-emerald-500 scale-[1.02] ring-2 ring-emerald-500/20'
                    : 'border-slate-100 dark:border-slate-800'
                } ${theme.class}`}
              >
                <span className={`text-xs font-bold truncate w-full ${theme.id === 'default' || (theme.id === 'nord' && settings.bgTheme !== 'nord') ? 'text-slate-800 dark:text-slate-200' : 'text-white'}`}>
                  {theme.name}
                </span>
                
                {settings.bgTheme === theme.id && (
                  <span className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                    <Check size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Keyboard and Haptics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Keyboard Layout */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} />
              Klavye Düzeni
            </h4>
            <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              {['Q', 'F'].map((layout) => (
                <button
                  key={layout}
                  onClick={() => updateSetting('keyboardLayout', layout as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    settings.keyboardLayout === layout
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-805'
                  }`}
                >
                  Türkçe {layout}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Feedback */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              Ses ve Geri Bildirim
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`flex-1 py-2.5 px-3 rounded-2xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 ${
                  settings.soundEnabled
                    ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50'
                }`}
              >
                {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>Ses {settings.soundEnabled ? 'Açık' : 'Kapalı'}</span>
              </button>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          {onToggleDarkMode !== undefined && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                {darkMode ? <Moon size={14} /> : <Sun size={14} />}
                Görünüm Modu
              </h4>
              <button
                onClick={onToggleDarkMode}
                className={`w-full py-2.5 px-3 rounded-2xl border-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  darkMode
                    ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-100 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {darkMode ? <Moon size={14} className="text-amber-400" /> : <Sun size={14} className="text-amber-500" />}
                <span>{darkMode ? 'Gece Modu' : 'Gündüz Modu'}</span>
              </button>
            </div>
          )}

          {/* Stats Button */}
          {onOpenStats !== undefined && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} />
                Oyuncu İstatistikleri
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onOpenStats();
                }}
                className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <BarChart2 size={14} />
                <span>İstatistikler & Rozetler</span>
              </button>
            </div>
          )}

          {/* Section 4: Server Connection Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Wifi size={14} className="text-emerald-500" />
              Sunucu & Mobil Bağlantı Ayarları
            </h4>
            
            {/* Automatic QR Code Connection */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">Yöntem 1: Hızlı QR Kod Bağlantısı</span>
              {activeToken ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="Bağlantı Karekodu"
                      className="w-24 h-24 select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1.5 text-left flex-1">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">Telefon Kamerasıyla Taratın</h5>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                      Kameranızı bu karekoda tutun ve çıkan bağlantıya tıklayın. Uygulamanız otomatik olarak açılacak ve internete bağlanacaktır.
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeToken);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition"
                    >
                      {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      <span>{isCopied ? 'Anahtar Kopyalandı!' : 'Bağlantı Anahtarını Kopyala'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full text-center py-2 text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-1.5">
                  <Key size={18} className="text-amber-500 animate-pulse" />
                  <span>Güvenlik belirteci bulunamadı. Lütfen oyunu bilgisayar tarayıcısından açın.</span>
                </div>
              )}
            </div>

            {/* Manual Connection Settings */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">Yöntem 2: Manuel Bağlantı & Gelişmiş Ayarlar</span>
              
              {/* Server Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Server size={12} />
                  Bağlanılacak Sunucu Türü
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                  {[
                    { id: 'pre', name: 'Canlı (Pre)' },
                    { id: 'dev', name: 'Geliştirme' },
                    { id: 'custom', name: 'Özel (IP/URL)' }
                  ].map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setServerType(srv.id as any)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        serverType === srv.id
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {srv.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Server URL Input */}
              {serverType === 'custom' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Özel Sunucu Adresi (örn: http://192.168.1.50:3000)</label>
                  <input
                    type="text"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    placeholder="http://192.168.1.100:3000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Token Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Key size={12} />
                  Bağlantı Anahtarı (Token)
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="AI Studio Bağlantı Anahtarını Buraya Yapıştırın"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Save Connection Action */}
              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={saveStatus === 'saved'}
                className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wide transition flex items-center justify-center gap-2 cursor-pointer ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    Bağlantı Güncellendi! Yeniden Başlatılıyor...
                  </>
                ) : (
                  <>
                    <Wifi size={14} />
                    Mobil Bağlantıyı Kaydet ve Uygula
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-600 shadow-emerald-500/10 transition"
          >
            Kapat ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
