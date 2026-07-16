package com.kelimesavasi.app

import java.util.Locale
import java.util.Random

object WordManager {

    // EĞER VERİTABANINDAN KELİME YÜKLENMEZSE VEYA BOŞ GELİRSE OYUN ÇÖKMESİN DİYE YEDEK HAVUZ (FALLBACK)
    private val fallbackWords = mapOf(
        3 to listOf("ÜTÜ", "YAZ", "TEK", "GÜZ", "KAS", "SAZ"),
        4 to listOf("KALE", "MASA", "KUTU", "YAZI", "KART", "SARI"),
        5 to listOf("TEMEL", "ARABA", "KALEM", "SABAH", "SEHPA", "KAŞIK"),
        6 to listOf("ANKARA", "TÜRKÇE", "BARDAK", "SÖZCÜK", "YAZICI", "AŞAMA"),
        7 to listOf("TELEFON", "ELBİSE", "KAYISI", "MERHABA", "ÇİKOLTA"),
        8 to listOf("BİLGİSAY", "KÜTÜPHAN", "SÖZLEŞME", "YUMURTAK")
    )

    private val random = Random()

    /**
     * Güvenli Kelime Seçici:
     * Bu fonksiyon verilen listeden sadece ve sadece istenen harf uzunluğundaki kelimeleri filtreler.
     * Türkçe karakter uyumluluğunu denetler ve tüm harfleri büyük harfe çevirir.
     * 
     * @param allWords Veritabanından veya yerelden gelen tüm kelimelerin listesi (Null gelebilir)
     * @param selectedLength Oyuncunun seçtiği harf sayısı (3, 4, 5, 6, 7, 8)
     * @return Kesinlikle seçilen harf uzunluğunda ve Türkçe büyük harflerle yazılmış kelime.
     */
    @JvmStatic
    fun getRandomWord(allWords: List<String>?, selectedLength: Int): String {
        val turkishLocale = Locale("tr", "TR") // Türkçe büyük/küçük harf uyuşmazlığını (I-İ-ı-i) çözer
        
        // Sınır kontrolü (Kullanıcı saçma bir harf sayısı seçerse koruma)
        val safeLength = if (selectedLength in 3..8) selectedLength else 5

        // 1. KONTROL: Ana liste boş mu geliyor? Boşsa hemen yedek listeden kelime ver.
        if (allWords.isNullOrEmpty()) {
            return getFallbackWord(safeLength, turkishLocale)
        }

        // 2. KONTROL: Listeyi temizle, Türkçe karakterlere göre büyüt ve Sadece seçilen harf sayısında olanları al.
        val filteredWords = allWords
            .mapNotNull { word ->
                word.trim().uppercase(turkishLocale)
            }
            .filter { it.length == safeLength }

        // 3. KONTROL: Filtreleme sonucunda elimizde kelime kaldı mı?
        if (filteredWords.isNotEmpty()) {
            val selectedWord = filteredWords[random.nextInt(filteredWords.size)]
            
            // Son Güvenlik Duvarı: Seçilen kelimenin uzunluğu gerçekten doğru mu?
            if (selectedWord.length == safeLength) {
                return selectedWord
            }
        }

        // 4. KONTROL: Eğer veritabanındaki listede o harf uzunluğunda hiç kelime yoksa yine yedek listeyi kullan.
        return getFallbackWord(safeLength, turkishLocale)
    }

    // Yedek listeden rastgele güvenli kelime getiren yardımcı metod
    private fun getFallbackWord(length: Int, locale: Locale): String {
        val words = fallbackWords[length] ?: listOf("TEMEL")
        return words[random.nextInt(words.size)].uppercase(locale)
    }
}
