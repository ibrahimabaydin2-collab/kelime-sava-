import React, { useState } from 'react';
import { Shield, X, Mail, ChevronRight, Lock, Eye, FileText, Globe } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const [activeLang, setActiveLang] = useState<'tr' | 'en'>('tr');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="card-theme border border-white/10 rounded-[2.2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-[#1a2035]/95 text-slate-100 transition-all duration-300">
        
        {/* Header */}
        <div className="flex-none px-6 py-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Shield size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-md font-black tracking-tight text-white uppercase">
                {activeLang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                {activeLang === 'tr' ? 'KELİME SAVAŞI MOBİL UYGULAMASI' : 'KELİME SAVASI MOBILE APPLICATION'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 text-[10px]">
              <button
                onClick={() => setActiveLang('tr')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeLang === 'tr' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setActiveLang('en')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeLang === 'en' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
          
          {activeLang === 'tr' ? (
            <>
              {/* Turkish Policy */}
              <div className="space-y-3.5 bg-white/5 rounded-2xl p-4 border border-white/5 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Shield size={14} />
                  <span>Son Güncelleme: 17 Temmuz 2026</span>
                </div>
                <p>
                  Kelime Savaşı geliştirici ekibi olarak gizliliğinize büyük önem veriyoruz. Bu gizlilik politikası, mobil uygulamamızı kullanırken hangi verilerinizin işlendiğini, nasıl saklandığını ve haklarınızı şeffaf bir şekilde açıklamak amacıyla hazırlanmıştır.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  1. Toplanan Bilgiler ve Veriler
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    <strong>Hesap Bilgileri:</strong> Oyunu misafir ("Guest") olarak oynadığınızda cihazınıza özel benzersiz bir rastgele kimlik (Device ID) oluşturulur. Bu kimlik, sadece skorlarınızı, günlük ilerlemenizi ve açtığınız rozetleri bulutta güvenle saklamak için kullanılır. E-posta ile kayıt olmanız durumunda ise yalnızca e-posta adresiniz ve şifreniz (kriptolu olarak) Firebase Authentication altyapımızda tutulur.
                  </p>
                  <p>
                    <strong>Oyun İçi İlerleme:</strong> Günlük bulmaca başarılarınız, toplam skorunuz, oyun modu tercihleriniz ve kazandığınız rozetler oyun deneyiminizi iyileştirmek amacıyla Firestore veritabanımızda saklanır.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  2. Cihaz İzinleri ve Kullanım Amaçları
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    Uygulamamız, Google Play Store standartlarına tam uyumlu olarak yalnızca oyun içi özelliklerin çalışabilmesi için gerekli durumlarda kullanıcıdan onay alarak şu izinleri talep eder:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li><strong>Kamera & Galeri İzni:</strong> Profil resmi belirleme veya özel oyun içi görsellerinizi kişiselleştirme amacıyla isteğe bağlı olarak kullanılır. Fotoğraflarınız kesinlikle sunucularımıza yüklenmez ve üçüncü şahıslarla paylaşılmaz.</li>
                    <li><strong>Mikrofon (Ses) İzni:</strong> Oyun içi canlı düellolarda veya sesle kelime doğrulama gibi etkileşimli özelliklerde anlık olarak ses algılama için kullanılır. Hiçbir ses kaydı cihazınızın dışına çıkmaz ve kaydedilmez.</li>
                    <li><strong>Yerel Bildirimler:</strong> Günün kelimesi hazır olduğunda sabah saat 09:00'da sizi bilgilendirmek ve hareketsizlik hatırlatıcıları göndermek amacıyla yerel zamanlayıcılar aracılığıyla tetiklenir. Bu bildirimler cihaz tabanlıdır ve internet bağlantısı gerektirmez. İstediğiniz zaman Ayarlar menüsünden tamamen kapatabilirsiniz.</li>
                  </ul>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  3. Veri Güvenliği ve Saklama
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    Toplanan tüm skor ve ilerleme verileri Google Firebase Firestore bulut veritabanında, en güncel güvenlik standartları ve Firestore Güvenlik Kuralları (Security Rules) ile korunarak saklanır. Şifreleriniz sisteme ulaşmadan önce kriptolanır ve geliştirici dahil kimse tarafından okunamaz.
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  4. Üçüncü Taraf Entegrasyonları
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    Uygulamamız güvenli altyapı ve oyuncu doğrulaması amacıyla Google Play Services ve Firebase platformlarını kullanmaktadır. Bu servislerin kendi gizlilik politikaları geçerlidir. Uygulamamızda reklam verilerini toplamak için izinsiz hiçbir casus yazılım veya veri takip mekanizması bulunmamaktadır.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  5. İletişim ve Veri Silme Talepleri
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    Kişisel verilerinizin (varsa e-posta kaydınızın veya misafir cihaz kimliğinizin) silinmesini talep etmek, gizlilik haklarınızla ilgili soru sormak veya geri bildirimde bulunmak için aşağıdaki resmi e-posta adresimiz üzerinden bizimle her zaman iletişime geçebilirsiniz. Talepleriniz en geç 48 saat içerisinde işleme alınarak verileriniz kalıcı olarak sistemlerimizden silinecektir.
                  </p>
                  <div className="mt-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-2.5 text-amber-400 font-semibold">
                    <Mail size={14} />
                    <span>ibrahimabaydin2@gmail.com</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* English Policy */}
              <div className="space-y-3.5 bg-white/5 rounded-2xl p-4 border border-white/5 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Shield size={14} />
                  <span>Last Updated: July 17, 2026</span>
                </div>
                <p>
                  As the Kelime Savaşı development team, we value your privacy. This privacy policy transparently outlines how your data is processed, stored, and your rights while using our mobile application in compliance with Google Play Store guidelines.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  1. Information & Data Collection
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    <strong>Account Info:</strong> When playing as a guest, a unique random Device ID is created to securely store your high scores, daily progress, and achievements in our cloud. If registering with an email, only your email and encrypted password are secure on Firebase Authentication.
                  </p>
                  <p>
                    <strong>In-Game Progress:</strong> Your daily puzzle scores, totals, statistics, and badges are saved securely to improve your gameplay experience.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  2. Device Permissions
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    Our application requests runtime permissions only when strictly necessary for core features:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li><strong>Camera & Gallery:</strong> Used optionially to personalize your profile picture. Your photos are never uploaded or stored on our servers.</li>
                    <li><strong>Microphone (Audio):</strong> Used temporarily during live challenges or voice inputs. No voice records are sent outside your device.</li>
                    <li><strong>Local Notifications:</strong> Scheduled locally at 09:00 AM to deliver fresh daily words and friendly retention reminders. You can toggle this off in the settings anytime.</li>
                  </ul>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  3. Security & Cloud Storage
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    All user metrics are securely housed in Firebase Firestore, guarded by robust security configurations (Security Rules). Passwords are encrypted before they hit the wire.
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  4. Third-Party Integrations
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    We leverage industry-trusted services including Google Play Services and Firebase. These have their own standalone privacy terms. We do not engage in unauthorized user tracking or spy frameworks.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div className="space-y-2.5">
                <h4 className="text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <ChevronRight size={14} className="text-amber-400" />
                  5. Contact & Data Deletion
                </h4>
                <div className="pl-5 space-y-2 text-xs text-slate-300/90">
                  <p>
                    To request permanent deletion of your credentials, guest profiles, or ask any privacy-related queries, email us. Requests are processed within 48 hours.
                  </p>
                  <div className="mt-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-2.5 text-amber-400 font-semibold">
                    <Mail size={14} />
                    <span>ibrahimabaydin2@gmail.com</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex-none px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between rounded-b-[2.2rem]">
          <span className="text-[10px] text-slate-400 font-medium">
            Kelime Savaşı © 2026
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#FAF6E9] hover:bg-[#F3EFE0] text-[#2E3748] text-xs font-black rounded-xl transition active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            {activeLang === 'tr' ? 'Anladım' : 'Got It'}
          </button>
        </div>

      </div>
    </div>
  );
}
