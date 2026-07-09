import { turkishUpper, turkishLower } from '../utils/turkish';

export const COMMON_TURKISH_WORDS: { [key: number]: string[] } = {
  3: [
    'ana', 'arı', 'ata', 'ara', 'bal', 'boş', 'buz', 'cep', 'çay', 'çöl', 'dağ', 'dar', 'dış', 'dua', 'dut', 'ebe', 'eda', 'efe', 'ege', 'ela', 'fal', 'fen', 'göl', 'güz', 'hak', 'hap', 'hat', 'hız', 'iyi', 'jel', 'jet', 'kaç', 'kan', 'kar', 'kas', 'kat', 'kel', 'kez', 'kız', 'koç', 'kol', 'kum', 'kuş', 'kut', 'kül', 'laf', 'maç', 'mal', 'nal', 'nem', 'net', 'ney', 'oda', 'oje', 'ova', 'oya', 'pay', 'pek', 'pil', 'pis', 'pus', 'ray', 'saç', 'saf', 'sağ', 'sal', 'sav', 'say', 'sel', 'ses', 'sır', 'sol', 'son', 'soy', 'söz', 'suç', 'süt', 'şah', 'şan', 'şap', 'şef', 'şen', 'şer', 'şık', 'şiş', 'şok', 'şov', 'taç', 'tam', 'tan', 'taş', 'tay', 'tek', 'tel', 'ten', 'ter', 'tez', 'tıp', 'tok', 'ton', 'top', 'toz', 'tut', 'tuz', 'tüm', 'tüp', 'tür', 'tüy', 'ulu', 'üç', 'yağ', 'yak', 'yal', 'yan', 'yap', 'yar', 'yas', 'yaş', 'yat', 'yay', 'yaz', 'yel', 'yem', 'yer', 'yıl', 'yol', 'yön', 'yük', 'yün', 'yüz', 'zam', 'zar', 'zat', 'zor'
  ],
  4: [
    'açık', 'adım', 'ağaç', 'alan', 'altı', 'amaç', 'anne', 'araç', 'arka', 'arzu',
    'asla', 'ateş', 'ayna', 'baba', 'bazı', 'borç', 'boyu', 'cami', 'ceza', 'çaba',
    'çatı', 'çift', 'çocuk', 'dere', 'ders', 'dolu', 'doğu', 'dört', 'duyu', 'ekip',
    'elma', 'eser', 'eski', 'eşya', 'evet', 'fark', 'fiyat', 'gece', 'gıda', 'grup',
    'güçlü', 'gülüş', 'gün', 'halk', 'harf', 'hata', 'hava', 'hızlı', 'ılık', 'ışık',
    'ilis', 'imza', 'ince', 'isim', 'izin', 'kafa', 'kale', 'kalp', 'kapı', 'kara',
    'kart', 'kedi', 'kısa', 'koku', 'konu', 'koyu', 'kral', 'kupa', 'kutu', 'kuzu',
    'mavi', 'masa', 'maya', 'mide', 'mülk', 'ocak', 'oda', 'okul', 'onur', 'ordu',
    'orta', 'oyun', 'öfke', 'ömür', 'para', 'plan', 'renk', 'rica', 'saat', 'sade',
    'sağ', 'sayı', 'sedir', 'sene', 'sesi', 'sıra', 'soru', 'spor', 'süre', 'şark',
    'şart', 'şere', 'şiir', 'tahta', 'takı', 'tamam', 'tane', 'tarz', 'tava', 'taze',
    'tepe', 'test', 'toz', 'türk', 'uçak', 'uyku', 'ülke', 'ümit', 'ünlü', 'vadi',
    'vaka', 'veri', 'vezir', 'vida', 'yağış', 'yaka', 'yakı', 'yalan', 'yanı', 'yapı',
    'yara', 'yarı', 'yasa', 'yaş', 'yazı', 'yeşil', 'yine', 'yolcu', 'yön', 'yurt'
  ],
  5: [
    'acele', 'adeta', 'adres', 'ahlak', 'ahşap', 'akıllı', 'akşam', 'aktif', 'alaka',
    'alarm', 'alıcı', 'altın', 'amaca', 'ampul', 'anlam', 'anket', 'antre', 'araba',
    'arazi', 'arşiv', 'artık', 'aslan', 'asker', 'astron', 'asort', 'asgari', 'aspar',
    'atlet', 'avukat', 'aygıt', 'aylık', 'ayran', 'ayrık', 'bacak', 'bağış', 'bahçe',
    'balık', 'balon', 'banyo', 'barış', 'basın', 'basit', 'başka', 'bavul', 'bebek',
    'belge', 'belki', 'belli', 'bence', 'bende', 'beniz', 'biber', 'bilge', 'bilgi',
    'bilim', 'birey', 'birim', 'bitki', 'boyut', 'böcek', 'bölge', 'bölüm', 'buhar',
    'bulut', 'bütün', 'cadde', 'ceket', 'cesur', 'cevap', 'ceviz', 'cihaz', 'civar',
    'çadır', 'çağrı', 'çamur', 'çanta', 'çarşı', 'çatal', 'çevre', 'çeyiz', 'çiçek',
    'çizgi', 'çocuk', 'çorba', 'çorap', 'çözüm', 'daire', 'davet', 'değer', 'değil',
    'demet', 'demir', 'deney', 'deniz', 'dergi', 'derin', 'detay', 'devam', 'devre',
    'dikkat', 'dilim', 'direk', 'dizgi', 'doğal', 'doğru', 'dolar', 'dolap', 'dolum',
    'domat', 'dosya', 'doyum', 'durum', 'duvar', 'dünya', 'düzen', 'ebat', 'edat',
    'egzoz', 'eklem', 'ekran', 'eksen', 'elmas', 'emlak', 'enerj', 'enlem', 'erkek',
    'erken', 'esnaf', 'esnek', 'etken', 'etkin', 'eylem', 'eylül', 'fakat', 'fatih',
    'fayda', 'fener', 'figür', 'fikir', 'filiz', 'firma', 'fizik', 'fiyat', 'flama',
    'formül', 'forum', 'fular', 'funda', 'füze', 'galip', 'garip', 'gazet', 'gazoz',
    'gebe', 'geçici', 'geçiş', 'gedik', 'gelin', 'gelir', 'giriş', 'gizli', 'göbek',
    'gözcü', 'gözde', 'grup', 'gübre', 'güçlü', 'gülüş', 'gümüş', 'güneş', 'güney',
    'güven', 'güzel', 'haber', 'hacim', 'hadis', 'hafta', 'hakan', 'hakim', 'halat',
    'halı', 'hamur', 'hangi', 'hanım', 'hapis', 'harbe', 'harç', 'hasta', 'hatır',
    'hayal', 'hayat', 'hayır', 'hedef', 'hekim', 'helva', 'hepsi', 'hırka', 'hızlı',
    'hizmet', 'hukuk', 'huzur', 'hücre', 'hüküm', 'ıslak', 'ılık', 'ırmak', 'ısrar',
    'ışık', 'ibare', 'ideale', 'idrar', 'ihrac', 'ihsan', 'ihtiy', 'iklim', 'ikram',
    'ilaç', 'ilave', 'iler', 'ilet', 'ilgi', 'ilisk', 'ilker', 'ilkin', 'ilmek',
    'mimar', 'mobil', 'motor', 'müjde', 'müzik', 'nadir', 'nakit', 'nasıl', 'neden',
    'nefes', 'nehir', 'nemli', 'nesil', 'nesne', 'nezle', 'nisan', 'nokta', 'norma',
    'nöbet', 'nüfus', 'nüfuz', 'nüsha', 'oğlak', 'oksij', 'okuma', 'onlar', 'opera',
    'organ', 'ortak', 'ortam', 'oynak', 'oynak', 'oynak', 'oynak', 'oynak', 'önder',
    'örnek', 'ördek', 'öykü', 'özen', 'özgün', 'özgür', 'paket', 'pamuk', 'panik',
    'parka', 'parlak', 'parsa', 'parti', 'pazar', 'pelin', 'pelte', 'pembe', 'perde',
    'peron', 'petrol', 'pınar', 'pıras', 'piknik', 'pilot', 'pipet', 'plaka', 'plato',
    'polis', 'polen', 'poyraz', 'proje', 'pudra', 'puset', 'radar', 'radyo', 'rahat',
    'rakam', 'rakip', 'rapor', 'resim', 'resmi', 'ritim', 'roman', 'rozet', 'ruj',
    'rulo', 'ruhsat', 'sabah', 'sabun', 'saçma', 'sade', 'sağlam', 'sağlık', 'sahip',
    'sahne', 'sahil', 'sakal', 'sakin', 'salata', 'salça', 'salgı', 'salon', 'saman',
    'sanal', 'sanat', 'sanık', 'saniye', 'saray', 'sarı', 'sargı', 'sarma', 'satıcı',
    'satır', 'satış', 'savaş', 'savcı', 'sayfa', 'saygı', 'sebep', 'seçim', 'sedef',
    'sefer', 'sehpa', 'sekiz', 'selam', 'sepet', 'sergi', 'serin', 'sevgi', 'sevim',
    'seyir', 'sıcak', 'sınıf', 'sınır', 'sınav', 'sırık', 'sırma', 'sıvı', 'sigara',
    'sihir', 'silah', 'silgi', 'sinek', 'sinir', 'sinema', 'siren', 'sirke', 'sivas',
    'sivil', 'siyah', 'siyasi', 'sizce', 'soğan', 'soğuk', 'sokak', 'soluk', 'somut',
    'sonuç', 'sorgu', 'soru', 'sorum', 'sosyal', 'soyut', 'söğüt', 'sözcü', 'sözlük',
    'spor', 'stant', 'stres', 'suçlu', 'sultan', 'sunucu', 'suret', 'süre', 'sürec',
    'sürekli', 'sürüm', 'süslü', 'sütçü', 'şahin', 'şahit', 'şaka', 'şapka', 'şarkı',
    'şark', 'şefta', 'şehir', 'şeker', 'şekil', 'şerit', 'şeref', 'şoför', 'şömine',
    'şüphe', 'tabak', 'tablo', 'tabur', 'tahıl', 'tahmin', 'tahta', 'takım', 'takip',
    'taksi', 'talep', 'tamam', 'tanık', 'tanım', 'taraf', 'tarım', 'tarih', 'tarla',
    'tasar', 'tavan', 'tavır', 'tavşan', 'tavuk', 'taze', 'tebrik', 'tepsi', 'tekel',
    'teker', 'tekil', 'tekne', 'teknik', 'teknoloji', 'tekst', 'telaş', 'telsiz',
    'temel', 'temiz', 'tempo', 'teori', 'tepki', 'terapi', 'terzi', 'tesis', 'test',
    'tetik', 'tevbe', 'teyze', 'tıbbi', 'tıraş', 'tohum', 'tokat', 'toner', 'topaç',
    'toplam', 'toplu', 'toprak', 'toptan', 'torba', 'torun', 'tören', 'törpü', 'trafik',
    'traş', 'tren', 'tugay', 'tuhaf', 'tulum', 'turşu', 'turuncu', 'tuzlu', 'tümör',
    'tünel', 'türk', 'türbe', 'türkü', 'tütün', 'uçaks', 'uçucu', 'ufuk', 'ulaşım',
    'ulusal', 'umut', 'unvan', 'uyarı', 'uygar', 'uygun', 'uygur', 'uyku', 'uymak',
    'uzman', 'ücret', 'üçgen', 'ülke', 'ülser', 'ünite', 'ünlü', 'ünvan', 'üretim',
    'ürün', 'üsler', 'üstün', 'üzere', 'üzüm', 'vagon', 'vahşi', 'vakar', 'vakıf',
    'vakit', 'vatan', 'vatandaş', 'vefat', 'vekil', 'velia', 'vergi', 'verim', 'vezne',
    'video', 'vokal', 'volkan', 'vurgu', 'vücut', 'yağız', 'yağış', 'yağm', 'yakın',
    'yakıt', 'yalan', 'yalnız', 'yamak', 'yanak', 'yanıt', 'yanlış', 'yapıcı', 'yapış',
    'yaprak', 'yarar', 'yarın', 'yarış', 'yasin', 'yastık', 'yaşam', 'yatak', 'yatay',
    'yatırım', 'yavaş', 'yazar', 'yazıcı', 'yazlık', 'yelek', 'yemek', 'yemin', 'yeni',
    'yerel', 'yeşil', 'yetki', 'yılan', 'yıldız', 'yıllık', 'yiğit', 'yirmi', 'yoğun',
    'yoğurt', 'yokuş', 'yolcu', 'yolcul', 'yonca', 'yorgan', 'yorum', 'yosun', 'yönem',
    'yönet', 'yöresel', 'yudum', 'yukarı', 'yumru', 'yumuş', 'yunus', 'yurt', 'yusuf',
    'yuvak', 'yüce', 'yüklem', 'yüksek', 'yürek', 'yürüy', 'yüzde', 'yüzey', 'yüzük',
    'zabıt', 'zafer', 'zalim', 'zaman', 'zarar', 'zarif', 'zarf', 'zaten', 'zekat',
    'zeki', 'zemin', 'zengin', 'zeytin', 'zırh', 'ziynet', 'zincir', 'zirve', 'ziyaret'
  ],
  6: [
    'adalet', 'akıllı', 'akraba', 'alaşım', 'alışış', 'asfalt', 'balayı', 'bardak',
    'başarı', 'başkan', 'bellek', 'berber', 'beşlik', 'bilgin', 'birden', 'boyama',
    'broşür', 'bugün', 'bulvar', 'cüzdan', 'çamur', 'çeyrek', 'çorba', 'destan',
    'destek', 'derece', 'defter', 'deprem', 'devlet', 'dikkat', 'dinamo', 'doktor',
    'eczane', 'efsane', 'elbise', 'endeks', 'erişim', 'faydal', 'fayton', 'fırtın',
    'filtre', 'fincan', 'futbol', 'galebe', 'garanti', 'gayret', 'gazete', 'geçmiş',
    'gerçek', 'gözlük', 'gurbet', 'güvenç', 'hacker', 'harika', 'hastah', 'hazine',
    'heykel', 'hizmet', 'ıspanak', 'ibadet', 'iskele', 'işaret', 'kabine', 'kamera',
    'kanser', 'kanyon', 'kaplan', 'karış', 'karpuz', 'kavram', 'kayısı', 'kelime',
    'kemancı', 'kervan', 'kıymet', 'korsan', 'koltuk', 'kömür', 'kurşun', 'kuvvet',
    'lastik', 'limon', 'makine', 'mandal', 'mantık', 'market', 'masraf', 'meclis',
    'merkez', 'mesafe', 'meydan', 'meyve', 'milyon', 'misafir', 'modern', 'mutfak',
    'ofisçi', 'orman', 'otobüs', 'otoyol', 'oyuncu', 'öğrenci', 'örümcek', 'parfüm',
    'parlak', 'patron', 'pazar', 'peynir', 'reçete', 'reklam', 'ressam', 'roman',
    'rüzgar', 'sağlam', 'sağlık', 'saniye', 'sarhoş', 'sarmal', 'seccad', 'seksen',
    'serbest', 'sermay', 'servis', 'sıcak', 'sınav', 'silindir', 'sistem', 'sohbet',
    'sosyal', 'sözlük', 'sunucu', 'sürpriz', 'şampiy', 'şeftal', 'şemsiy', 'şoför',
    'tabiat', 'tahmin', 'takvim', 'tasarım', 'tavşan', 'tehlik', 'tekrar', 'tembel',
    'terazi', 'teslim', 'tiyatro', 'toprak', 'turizm', 'türkçe', 'ulusal', 'uzaylı',
    'üretim', 'vicdan', 'volkan', 'yağmur', 'yalnız', 'yaprak', 'yardım', 'yastık',
    'yazar', 'yemek', 'yosun', 'yüksek', 'yürek', 'zahmet', 'zaman', 'zengin', 'zincir'
  ],
  7: [
    'anayasa', 'arkadaş', 'asansör', 'alışveriş', 'bağlant', 'başarı', 'başlang',
    'belediy', 'bilgisa', 'biyoloj', 'coğrafy', 'çalışma', 'çikolat', 'depozit',
    'dinamik', 'edebiya', 'efsanev', 'ekonomi', 'element', 'endüstr', 'enginar',
    'felsefe', 'fizikçi', 'fotoğra', 'gelişim', 'girişim', 'gökyüzü', 'gözleme',
    'haftal', 'hastane', 'heyecan', 'hızlıca', 'ıspanak', 'iletişi', 'imparor',
    'internet', 'istatisti', 'işbirl', 'kabakul', 'karanlı', 'karides', 'katılı',
    'kavşak', 'kelebek', 'kılavuz', 'kırmızı', 'kitapçı', 'kolonya', 'kurtarı',
    'kütüpha', 'laciver', 'lokanta', 'makarna', 'manzara', 'margar', 'matemat',
    'merhaba', 'mevsim', 'milyard', 'mineral', 'mobilya', 'mutlulu', 'mühendis',
    'mürekk', 'nakliye', 'oğullar', 'organik', 'oyuncak', 'öğretme', 'pantolo',
    'paraşüt', 'patates', 'pencere', 'portaka', 'program', 'pijama', 'ramazan',
    'reaksiy', 'rehber', 'röntgen', 'saatlik', 'sakinli', 'salatal', 'sancakt',
    'sandaly', 'satranç', 'saygıl', 'sevgili', 'seyahat', 'sıradan', 'sigorta',
    'sinirli', 'siyaset', 'sözleşm', 'şeftali', 'şemsiye', 'tehlike', 'telefon',
    'temizli', 'teşekkü', 'toplant', 'tüketim', 'ünivers', 'vakıfla', 'voleybo',
    'yağmurl', 'yakışık', 'yaramaz', 'yardımc', 'yaşasın', 'yazılı', 'yeryüzü',
    'yeşilli', 'yönetim', 'yurttaş', 'yumurta', 'yürüyüş', 'zehirli', 'ziyaret', 'zorluk'
  ],
  8: [
    'arkadaş', 'araştır', 'bağlantı', 'başarı', 'başlangı', 'belediye', 'bilgisay',
    'biyoloji', 'coğrafya', 'çalışkan', 'çevresel', 'çikolata', 'delikanl', 'demokrat',
    'deneyim', 'derinli', 'devletç', 'doğallı', 'edebiyat', 'eğlence', 'ekonomik',
    'endüstri', 'etkinli', 'felsefi', 'fırtınal', 'fiziksel', 'fotoğraf', 'gazetec',
    'gelecek', 'gelişme', 'girişim', 'gösterge', 'gösteri', 'gözlemci', 'güvenli',
    'güzellik', 'haberleş', 'hareket', 'heyecanl', 'hırsızlı', 'ıspanak', 'idareci',
    'iletişim', 'ilişkile', 'imparato', 'insanlı', 'işbirlig', 'işbirlik', 'kahraman',
    'kalabal', 'kapasite', 'karakter', 'karanlık', 'kardiyol', 'karşıla', 'kategori',
    'katılımc', 'keşfetme', 'kılavuz', 'kıymetl', 'kitaplık', 'kolektif', 'kolaylı',
    'komiser', 'koruyucu', 'kültürel', 'kütüphan', 'lacivert', 'limonata', 'makarna',
    'malzeme', 'manzara', 'matemati', 'mekanizm', 'memnuni', 'merdiven', 'mevsimli',
    'milyonle', 'milliyet', 'mimarli', 'mücadele', 'mühendis', 'mükemmel', 'müşteri',
    'nispeten', 'nöbetçil', 'olanakla', 'organiza', 'oyuncak', 'öğretmen', 'pantolon',
    'paylaşım', 'pencere', 'personel', 'planlama', 'politik', 'portakal', 'program',
    'psikoloj', 'pürüzsüz', 'ramazan', 'reaksiyo', 'rehberli', 'resmileş', 'rüzgarl',
    'saatlik', 'sakinleş', 'salatalı', 'samimi', 'sandalye', 'savunmas', 'sevgili',
    'seyahat', 'sıcaklı', 'sınırsı', 'siyaset', 'sosyolog', 'sözleşme', 'şeftali',
    'şemsiye', 'şoförle', 'tarihsel', 'tasarımc', 'tehlikel', 'teknoloj', 'telefon',
    'temizlik', 'teşekkür', 'tiyatro', 'topluluk', 'traktör', 'turuncu', 'tüketici',
    'tıraşçı', 'üniversi', 'üretici', 'voleybol', 'yağmurlu', 'yakışıkl', 'yalnızlı',
    'yardımcı', 'yaratıcı', 'yazarlık', 'yelkenli', 'yeniçer', 'yönetici', 'yönetmel',
    'yumuşakl', 'yurttaş', 'yüksekl', 'yüzyıll', 'zamanla', 'zenginli', 'ziyaretc'
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
