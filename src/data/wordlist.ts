import { turkishUpper, turkishLower } from '../utils/turkish';

export const COMMON_TURKISH_WORDS: { [key: number]: string[] } = {
  3: [
    'ana', 'arı', 'ata', 'ara', 'bal', 'boş', 'buz', 'cep', 'çay', 'çöl', 'dağ', 'dar', 'dış', 'dua', 'dut', 'ebe', 'eda', 'efe', 'ege', 'ela', 'fal', 'fen', 'göl', 'güz', 'hak', 'hap', 'hat', 'hız', 'iyi', 'jel', 'jet', 'kaç', 'kan', 'kar', 'kas', 'kat', 'kel', 'kez', 'kız', 'koç', 'kol', 'kum', 'kuş', 'kut', 'kül', 'laf', 'maç', 'mal', 'nal', 'nem', 'net', 'ney', 'oda', 'oje', 'ova', 'oya', 'pay', 'pek', 'pil', 'pis', 'pus', 'ray', 'saç', 'saf', 'sağ', 'sal', 'sav', 'say', 'sel', 'ses', 'sır', 'sol', 'son', 'soy', 'söz', 'suç', 'süt', 'şah', 'şan', 'şap', 'şef', 'şen', 'şer', 'şık', 'şiş', 'şok', 'şov', 'taç', 'tam', 'tan', 'taş', 'tay', 'tek', 'tel', 'ten', 'ter', 'tez', 'tıp', 'tok', 'ton', 'top', 'toz', 'tut', 'tuz', 'tüm', 'tüp', 'tür', 'tüy', 'ulu', 'üç', 'yağ', 'yak', 'yal', 'yan', 'yap', 'yar', 'yas', 'yaş', 'yat', 'yay', 'yaz', 'yel', 'yem', 'yer', 'yıl', 'yol', 'yön', 'yük', 'yün', 'yüz', 'zam', 'zar', 'zat', 'zor'
  ],
  4: [
    'açık', 'adım', 'ağaç', 'alan', 'altı', 'amaç', 'anne', 'araç', 'arka', 'arzu',
    'asla', 'ateş', 'ayna', 'baba', 'bazı', 'borç', 'boyu', 'cami', 'ceza', 'çaba',
    'çatı', 'çift', 'dere', 'ders', 'dolu', 'doğu', 'dört', 'duyu', 'ekip', 'elma',
    'eser', 'eski', 'eşya', 'evet', 'fark', 'gece', 'gıda', 'grup', 'halk', 'harf',
    'hata', 'hava', 'ılık', 'ışık', 'imza', 'ince', 'isim', 'izin', 'kafa', 'kale',
    'kalp', 'kapı', 'kara', 'kart', 'kedi', 'kısa', 'koku', 'konu', 'koyu', 'kral',
    'kupa', 'kutu', 'kuzu', 'mavi', 'masa', 'maya', 'mide', 'mülk', 'ocak', 'okul',
    'onur', 'ordu', 'orta', 'oyun', 'öfke', 'ömür', 'para', 'plan', 'renk', 'rica',
    'saat', 'sade', 'sayı', 'sene', 'sıra', 'soru', 'spor', 'süre', 'şark', 'şart',
    'şiir', 'takı', 'tane', 'tarz', 'tava', 'taze', 'tepe', 'test', 'türk', 'uçak',
    'uyku', 'ülke', 'ümit', 'ünlü', 'vadi', 'vaka', 'veri', 'vida', 'yaka', 'yalan',
    'yapı', 'yara', 'yarı', 'yasa', 'yazı', 'yine', 'yurt'
  ],
  5: [
    'acele', 'adeta', 'adres', 'ahlak', 'ahşap', 'akşam', 'aktif', 'alaka', 'alarm',
    'alıcı', 'altın', 'ampul', 'anlam', 'anket', 'antre', 'araba', 'arazi', 'arşiv',
    'artık', 'aslan', 'asker', 'atlet', 'aygıt', 'aylık', 'ayran', 'ayrık', 'bacak',
    'bağış', 'bahçe', 'balık', 'balon', 'banyo', 'barış', 'basın', 'basit', 'başka',
    'bavul', 'bebek', 'belge', 'belki', 'belli', 'bence', 'bende', 'beniz', 'biber',
    'bilge', 'bilgi', 'bilim', 'birey', 'birim', 'bitki', 'boyut', 'böcek', 'bölge',
    'bölüm', 'buhar', 'bulut', 'bütün', 'cadde', 'ceket', 'cesur', 'cevap', 'ceviz',
    'cihaz', 'civar', 'çadır', 'çağrı', 'çamur', 'çanta', 'çarşı', 'çatal', 'çevre',
    'çeyiz', 'çiçek', 'çizgi', 'çocuk', 'çorba', 'çorap', 'çözüm', 'daire', 'davet',
    'değer', 'değil', 'demet', 'demir', 'deney', 'deniz', 'dergi', 'derin', 'detay',
    'devam', 'devre', 'dilim', 'direk', 'dizgi', 'doğal', 'doğru', 'dolar', 'dolap',
    'dolum', 'dosya', 'doyum', 'durum', 'duvar', 'dünya', 'düzen', 'ebat', 'edat',
    'egzoz', 'eklem', 'ekran', 'eksen', 'elmas', 'emlak', 'enlem', 'erkek', 'erken',
    'esnaf', 'esnek', 'etken', 'etkin', 'eylem', 'eylül', 'fakat', 'fatih', 'fayda',
    'fener', 'figür', 'fikir', 'filiz', 'firma', 'fizik', 'fiyat', 'flama', 'forum',
    'fular', 'funda', 'füze', 'galip', 'garip', 'gazoz', 'geçiş', 'gedik', 'gelin',
    'gelir', 'giriş', 'gizli', 'göbek', 'gözcü', 'gözde', 'gübre', 'gülüş', 'gümüş',
    'güneş', 'güney', 'güven', 'güzel', 'haber', 'hacim', 'hadis', 'hafta', 'hakan',
    'hakim', 'halat', 'hamur', 'hangi', 'hanım', 'hapis', 'harç', 'hasta', 'hatır',
    'hayal', 'hayat', 'hayır', 'hedef', 'hekim', 'helva', 'hepsi', 'hırka', 'hizmet',
    'hukuk', 'huzur', 'hücre', 'hüküm', 'ıslak', 'ırmak', 'ısrar', 'ibare', 'idrar',
    'ihraç', 'ihsan', 'iklim', 'ikram', 'ilave', 'ilgi', 'ilker', 'ilkin', 'ilmek',
    'mimar', 'mobil', 'motor', 'müjde', 'müzik', 'nadir', 'nakit', 'nasıl', 'neden',
    'nefes', 'nehir', 'nemli', 'nesil', 'nesne', 'nezle', 'nisan', 'nokta', 'norma',
    'nöbet', 'nüfus', 'nüfuz', 'nüsha', 'oğlak', 'okuma', 'onlar', 'opera', 'organ',
    'ortak', 'ortam', 'oynak', 'önder', 'örnek', 'ördek', 'öykü', 'özen', 'özgün',
    'özgür', 'paket', 'pamuk', 'panik', 'parka', 'parlak', 'parti', 'pazar', 'pelin',
    'pelte', 'pembe', 'perde', 'peron', 'petrol', 'pınar', 'pilot', 'pipet', 'plaka',
    'plato', 'polis', 'polen', 'poyraz', 'proje', 'pudra', 'puset', 'radar', 'radyo',
    'rahat', 'rakam', 'rakip', 'rapor', 'resim', 'resmi', 'ritim', 'roman', 'rozet',
    'ruhsat', 'sabah', 'sabun', 'saçma', 'sağlam', 'sağlık', 'sahip', 'sahne', 'sahil',
    'sakal', 'sakin', 'salça', 'salgı', 'salon', 'saman', 'sanal', 'sanat', 'sanık',
    'sarı', 'sargı', 'sarma', 'satıcı', 'satır', 'satış', 'savaş', 'savcı', 'sayfa',
    'saygı', 'sebep', 'seçim', 'sedef', 'sefer', 'sehpa', 'sekiz', 'selam', 'sepet',
    'sergi', 'serin', 'sevgi', 'sevim', 'seyir', 'sıcak', 'sınıf', 'sınır', 'sınav',
    'sırık', 'sırma', 'sıvı', 'sihir', 'silah', 'silgi', 'sinek', 'sinir', 'siren',
    'sirke', 'sivas', 'sivil', 'siyah', 'sizce', 'soğan', 'soğuk', 'sokak', 'soluk',
    'somut', 'sonuç', 'sorgu', 'sorum', 'soyut', 'söğüt', 'sözcü', 'sözlük', 'stres',
    'suçlu', 'suret', 'sürüm', 'süslü', 'şahin', 'şahit', 'şaka', 'şapka', 'şarkı',
    'şehir', 'şeker', 'şekil', 'şerit', 'şeref', 'şoför', 'şüphe', 'tabak', 'tablo',
    'tabur', 'tahıl', 'tahta', 'takım', 'takip', 'taksi', 'talep', 'tamam', 'tanık',
    'tanım', 'taraf', 'tarım', 'tarih', 'tarla', 'tavan', 'tavır', 'tavuk', 'taze',
    'tepsi', 'tekel', 'teker', 'tekil', 'tekne', 'telaş', 'temel', 'temiz', 'tempo',
    'teori', 'tepki', 'terzi', 'tesis', 'testi', 'tetik', 'tevbe', 'teyze', 'tohum',
    'tokat', 'toner', 'topaç', 'toplu', 'torba', 'torun', 'tören', 'törpü', 'tren',
    'tugay', 'tuhaf', 'tulum', 'turşu', 'tuzlu', 'tümör', 'tünel', 'türbe', 'türkü',
    'tütün', 'uçucu', 'ufuk', 'umut', 'unvan', 'uyarı', 'uygar', 'uygun', 'uygur',
    'uyku', 'uzman', 'ücret', 'üçgen', 'ülser', 'ünite', 'ünlü', 'ürün', 'üstün',
    'üzere', 'üzüm', 'vagon', 'vahşi', 'vakar', 'vakıf', 'vakit', 'vatan', 'vefat',
    'vekil', 'vergi', 'verim', 'vezne', 'video', 'vokal', 'vurgu', 'vücut', 'yağız',
    'yakın', 'yakıt', 'yalan', 'yamak', 'yanak', 'yanıt', 'yapış', 'yaprak', 'yarar',
    'yarın', 'yarış', 'yasin', 'yaşam', 'yatak', 'yatay', 'yavaş', 'yazar', 'yelek',
    'yemek', 'yemin', 'yeni', 'yerel', 'yeşil', 'yetki', 'yılan', 'yiğit', 'yirmi',
    'yoğun', 'yonca', 'yorum', 'yosun', 'yudum', 'yumru', 'yunus', 'yurt', 'yusuf',
    'yüce', 'yürek', 'yüzde', 'yüzey', 'yüzük', 'zabıt', 'zafer', 'zalim', 'zaman',
    'zarar', 'zarif', 'zarf', 'zaten', 'zekat', 'zeki', 'zemin', 'zırh'
  ],
  6: [
    'adalet', 'akıllı', 'akraba', 'alaşım', 'asfalt', 'balayı', 'bardak', 'başarı',
    'başkan', 'bellek', 'berber', 'beşlik', 'bilgin', 'birden', 'boyama', 'broşür',
    'bugün', 'bulvar', 'cüzdan', 'çamur', 'çeyrek', 'çorba', 'destan', 'destek',
    'derece', 'defter', 'deprem', 'devlet', 'dikkat', 'dinamo', 'doktor', 'eczane',
    'efsane', 'elbise', 'endeks', 'erişim', 'faydalı', 'fayton', 'fırtına', 'filtre',
    'fincan', 'futbol', 'galebe', 'garanti', 'gayret', 'gazete', 'geçmiş', 'gerçek',
    'gözlük', 'gurbet', 'güvenç', 'hacker', 'harika', 'hazine', 'heykel', 'hizmet',
    'ibadet', 'iskele', 'işaret', 'kabine', 'kamera', 'kanser', 'kanyon', 'kaplan',
    'karış', 'karpuz', 'kavram', 'kayısı', 'kelime', 'kervan', 'kıymet', 'korsan',
    'koltuk', 'kömür', 'kurşun', 'kuvvet', 'lastik', 'limon', 'makine', 'mandal',
    'mantık', 'market', 'masraf', 'meclis', 'merkez', 'mesafe', 'meydan', 'meyve',
    'milyon', 'misafir', 'modern', 'mutfak', 'orman', 'otobüs', 'otoyol', 'oyuncu',
    'örümcek', 'parfüm', 'parlak', 'patron', 'pazar', 'peynir', 'reçete', 'reklam',
    'ressam', 'roman', 'rüzgar', 'sağlam', 'sağlık', 'saniye', 'sarhoş', 'sarmal',
    'seksen', 'servis', 'sıcak', 'sınav', 'sistem', 'sohbet', 'sosyal', 'sözlük',
    'sunucu', 'şeftali', 'şemsiye', 'şoför', 'tabiat', 'tahmin', 'takvim', 'tasarım',
    'tavşan', 'tehlike', 'tekrar', 'tembel', 'terazi', 'teslim', 'tiyatro', 'toprak',
    'turizm', 'türkçe', 'ulusal', 'uzaylı', 'üretim', 'vicdan', 'volkan', 'yağmur',
    'yalnız', 'yaprak', 'yardım', 'yastık', 'yazar', 'yemek', 'yosun', 'yüksek',
    'yürek', 'zahmet', 'zaman', 'zengin', 'zincir'
  ],
  7: [
    'anayasa', 'arkadaş', 'asansör', 'bağlantı', 'başarı', 'başlangıç', 'belediye',
    'biyoloji', 'coğrafya', 'çalışma', 'çikolata', 'depozito', 'dinamik', 'edebiyat',
    'efsanevi', 'ekonomi', 'element', 'endüstri', 'enginar', 'felsefe', 'fizikçi',
    'fotoğraf', 'gelişim', 'girişim', 'gökyüzü', 'gözleme', 'haftalık', 'hastane',
    'heyecan', 'hızlıca', 'ıspanak', 'iletişim', 'internet', 'karanlık', 'karides',
    'katılım', 'kavşak', 'kelebek', 'kılavuz', 'kırmızı', 'kitapçı', 'kolonya',
    'kütüphane', 'lacivert', 'lokanta', 'makarna', 'manzara', 'margarin', 'matematik',
    'merhaba', 'mevsim', 'milyar', 'mineral', 'mobilya', 'mutluluk', 'mühendis',
    'mürekkep', 'nakliye', 'organik', 'oyuncak', 'öğretmen', 'pantolon', 'paraşüt',
    'patates', 'pencere', 'portakal', 'program', 'pijama', 'ramazan', 'rehber',
    'röntgen', 'saatlik', 'sakinlik', 'sandalye', 'satranç', 'saygılı', 'sevgili',
    'seyahat', 'sıradan', 'sigorta', 'sinirli', 'siyaset', 'sözleşme', 'şeftali',
    'şemsiye', 'tehlike', 'telefon', 'temizlik', 'teşekkür', 'toplantı', 'tüketim',
    'voleybol', 'yağmurlu', 'yaramaz', 'yardımcı', 'yaşasın', 'yazılı', 'yeryüzü',
    'yeşillik', 'yönetim', 'yurttaş', 'yumurta', 'yürüyüş', 'zehirli', 'ziyaret',
    'zorluk'
  ],
  8: [
    'arkadaş', 'araştırma', 'bağlantı', 'başarı', 'başlangıç', 'belediye', 'bilgisayar',
    'biyoloji', 'coğrafya', 'çalışkan', 'çevresel', 'çikolata', 'delikanlı', 'demokrat',
    'deneyim', 'derinlik', 'devletçi', 'doğallık', 'edebiyat', 'eğlence', 'ekonomik',
    'endüstri', 'etkinlik', 'felsefi', 'fırtınalı', 'fiziksel', 'fotoğraf', 'gazeteci',
    'gelecek', 'gelişme', 'girişim', 'gösterge', 'gösteri', 'gözlemci', 'güvenlik',
    'güzellik', 'hareket', 'heyecanlı', 'hırsızlık', 'ıspanak', 'idareci', 'iletişim',
    'ilişkiler', 'imparator', 'insanlık', 'işbirliği', 'kahraman', 'kalabalık',
    'kapasite', 'karakter', 'karanlık', 'kardiyolog', 'karşılama', 'kategori',
    'katılımcı', 'keşfetme', 'kılavuz', 'kıymetli', 'kitaplık', 'kolektif', 'kolaylık',
    'komiser', 'koruyucu', 'kültürel', 'kütüphane', 'lacivert', 'limonata', 'makarna',
    'malzeme', 'manzara', 'matematik', 'mekanizma', 'merdiven', 'mevsimlik',
    'milyonlar', 'milliyet', 'mimarlık', 'mücadele', 'mühendis', 'mükemmel', 'müşteri',
    'nispeten', 'nöbetçi', 'olanaklar', 'oyuncak', 'öğretmen', 'pantolon', 'paylaşım',
    'pencere', 'personel', 'planlama', 'politik', 'portakal', 'program', 'psikoloji',
    'pürüzsüz', 'ramazan', 'reaksiyon', 'rehberlik', 'rüzgarlı', 'saatlik', 'sevgili',
    'seyahat', 'sıcaklık', 'sınırsız', 'siyaset', 'sosyolog', 'sözleşme', 'şeftali',
    'şemsiye', 'şoförlük', 'tarihsel', 'tasarımcı', 'tehlikeli', 'teknoloji', 'telefon',
    'temizlik', 'teşekkür', 'tiyatro', 'topluluk', 'traktör', 'turuncu', 'tüketici',
    'tıraşçı', 'voleybol', 'yağmurlu', 'yakışıklı', 'yalnızlık', 'yardımcı', 'yaratıcı',
    'yazarlık', 'yelkenli', 'yeniçeri', 'yönetici', 'yönetmelik', 'yurttaş', 'yükseklik',
    'yüzyıllık', 'zamanlama', 'zenginlik', 'ziyaretçi'
  ]
};

// Dynamically categorize all words in COMMON_TURKISH_WORDS by their actual length to correct any misplacements!
const CLEANED_TURKISH_WORDS: { [key: number]: string[] } = {};

Object.values(COMMON_TURKISH_WORDS).forEach((list) => {
  list.forEach((word) => {
    const trimmed = word.trim();
    const len = trimmed.length;
    if (len >= 3 && len <= 8) {
      if (!CLEANED_TURKISH_WORDS[len]) {
        CLEANED_TURKISH_WORDS[len] = [];
      }
      const lower = turkishLower(trimmed);
      if (!CLEANED_TURKISH_WORDS[len].includes(lower)) {
        CLEANED_TURKISH_WORDS[len].push(lower);
      }
    }
  });
});

// Returns a random word from the curated list of specified length
export function getRandomWord(length: number): string {
  const words = CLEANED_TURKISH_WORDS[length] || CLEANED_TURKISH_WORDS[5];
  if (!words || words.length === 0) {
    const fallbackWords: { [key: number]: string[] } = {
      3: ['ana', 'arı', 'ara', 'bal', 'çay', 'dağ', 'iyi', 'kar', 'koç', 'şef', 'tek', 'tuz', 'yaz', 'yol', 'zor'],
      4: ['açık', 'adım', 'alan', 'altı'],
      5: ['kalem', 'kitap', 'büyük', 'yeşil'],
      6: ['adalet', 'akıllı', 'bardak', 'başarı'],
      7: ['arkadaş', 'belediye', 'hastane', 'merhaba'],
      8: ['bilgisay', 'güzellik', 'telefon', 'temizlik']
    };
    const list = fallbackWords[length] || fallbackWords[5];
    return turkishUpper(list[Math.floor(Math.random() * list.length)]);
  }
  const word = words[Math.floor(Math.random() * words.length)];
  return turkishUpper(word);
}

// Checks if a word exists in our curated list
export function isWordInCuratedList(word: string, length: number): boolean {
  const normalized = turkishLower(word);
  const list = CLEANED_TURKISH_WORDS[length] || [];
  return list.includes(normalized);
}

// Determines the daily word and length deterministically based on date
export function getDailyWordAndLength(): { word: string; length: number; dateStr: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`; // e.g. "2026-07-13"

  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash += dateStr.charCodeAt(i) * (i + 1);
  }

  // Length cycle: 3, 4, 5, 6 based on hash
  // Using modulo 4 gives values 0..3, so adding 3 gives 3, 4, 5, 6
  const length = 3 + (hash % 4);

  // Get words of this length
  const list = CLEANED_TURKISH_WORDS[length] || [];
  let word = 'SAVAŞ';
  if (list.length > 0) {
    const wordIndex = hash % list.length;
    word = list[wordIndex].toUpperCase();
  }
  
  return { word: turkishUpper(word), length, dateStr };
}

