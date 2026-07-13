import React from 'react';
import { X, Sliders, Palette, Layout, Volume2, VolumeX, Check, Smartphone, Sun, Moon, BarChart2, Type } from 'lucide-react';

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
}

export default function SettingsModal({
  settings,
  onChangeSettings,
  onClose,
  darkMode,
  onToggleDarkMode,
  onOpenStats
}: SettingsModalProps) {
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
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
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
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#FAF6E9] text-[#2E3748] hover:bg-[#F3EFE0] text-xs font-black rounded-xl shadow-md transition cursor-pointer border border-[#EBE6D5]"
          >
            Kapat ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
