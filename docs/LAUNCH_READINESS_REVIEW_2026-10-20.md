# ReviewBridge — Gerçek satış öncesi inceleme
**20 Ekim 2026 · Kod, test, canlı izin ve operasyon incelemesi**

## Karar
**Ben bu sürüm için henüz genel satış onayı vermezdim.** Temel ürün var; öncelik yeni özellik eklemekten önce mevcut vaatleri güvenilir, güvenli ve yönetilebilir hâle getirmek.

Bu rapor 14 çalışma başlığı içerir; bunlar 14 ayrı güvenlik açığı demek değildir. Doğrulanmış hatalar, henüz yayınlanmamış düzeltmeler, gerekli operasyon kontrolleri ve karar verilmesi gereken ürün kuralları ayrı belirtilmiştir. İnceleme kapsamı dışındaki her sistemin kusursuz olduğunu iddia etmez.

## İlk incelemenin tarihsel durumu — 20 Ekim
Bu bölüm ilk inceleme anını kaydeder; güncel uygulama ve yayın bilgileri aşağıdaki 21 Ekim kaydındadır.
- GitHub main: `4c0bab38279d303ebd38b638a9e123b6a1d89cf1`. Çalışma dalı: `codex/security-plan-audit`; yerel güvenlik değişiklikleri commit edilmemiş ve main'e gitmemiş.
- Yerel testler: **100 geçti, 0 başarısız**. Veritabanı ve ödeme sağlayıcısını taklit eden testlerin gerçek entegrasyon kanıtı olmadığı ayrıca dikkate alındı.
- Canlı `/api/health`: **HTTP 200**, `{"status":"ok"}`. Bu uç nokta yalnızca basit veritabanı sorgusu yapıyor; giriş/ödeme/sync testinin yerine geçmez.
- Üretim bağımlılık taraması: **9 uyarılı paket**; 1 kritik, 4 yüksek, 4 orta. İstismar denenmedi, veri ihlali kanıtı bulunmuş sayılmıyor. Örneğin bazı kritik uyarılar yalnızca belirli görsel üretim kodları kullanıldığında geçerli; uygulanabilirlik ayrı incelenmeli.
- Neon üretimde yalnızca rol izinleri ve abonelik sütun adları okundu. Müşteri kayıt içerikleri okunmadı, veri değiştirilmedi.
- Bu turda üretim ayarı değiştirilmedi, gerçek ödeme yapılmadı, dış servise yorum taraması başlatılmadı. Yeni Google girişi, iki hesaplı erişim, e-posta teslimi, geri yükleme ve tam abonelik akışı canlıda test edilmedi.

## Bir ay sonra ne olmalı?
1. **Aylık otomatik yenilenen abonelik:** yenileme ödemesi başarılıysa Pro/Ajans devam eder; her ay otomatik Free'ye düşmez.
2. **Müşteri iptal ederse:** yeni yenileme durur; ödediği dönemin sağlayıcıdan gelen bitiş zamanına kadar özellikler devam eder.
3. **Gerçek süre sonu:** Free sınırları uygulanır. Yorumlar ve kaynaklar aniden silinmez; fazla kaynaklar duraklatılır.
4. **Kart ödemesi başarısızsa:** müşteriye kart güncelleme yolu gösterilir; erişim davranışı önceden belirlenmiş tahsilat/ek süre politikasına göre yönetilir. `unpaid` durumunun süresiz ücretli hak bırakması önlenir.
5. **Yükseltme:** mevcut aboneliğin planı değiştirilir; ikinci abonelik oluşturulmaz. Fiyat farkı ve uygulanacağı zaman işlemden önce gösterilir.
6. **İade/itiraz:** tam iade, kısmi iade ve ödeme itirazı için farklı kurallar tanımlanır; hepsi körlemesine aynı Free işlemini tetiklemez.
7. **Ajans, Pro özelliklerini de içerir.** Beklenen engel Free'nin ücretli özelliklere ve Pro'nun Ajans'a özel yönetim haklarına erişememesidir.

Lemon Squeezy'nin iptal/sona erme ayrımı için: [abonelik nesnesi](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object). Bitiş zamanı “satın alma + 30 gün” olarak uydurulmamalı; sağlayıcının dönem bilgileri kullanılmalı.

## Bulgular ve uygulanacak işler

### 01. Güvenlik güncellemeleri
**Öncelik:** Satış öncesi · **Durum:** Doğrulandı

**Bulgum:** Projede Next.js 16.2.4 var. Üretim bağımlılık taraması 9 paket için uyarı bildirdi: 1 kritik, 4 yüksek, 4 orta. Bu sayılar bağımsız açık veya başarıyla istismar edilmiş sistem sayısı değildir; bazı uyarılar kullanılmayan özelliklere bağlıdır.

**Müşteriye/işletmeye etkisi:** Bilinen güvenlik sorunları bulunan bir altyapıyla müşteri kabul etmek gereksiz risk yaratır.

**Yapılacak iş:** Next.js ve ilişkili bağımlılıkları uyumlu, yamalı sürümlere yükselt; Next.js yerel sürüm kılavuzlarını oku; kilit dosyasını güncelle; kalan uyarıların uygulamaya etkisini tek tek değerlendir. Otomatik zorlayıcı güncelleme kullanma.

**Kapanış ölçütü:** Bağımlılık taraması tekrar çalıştırılır; ilgili kritik/yüksek riskler giderilir veya uygulanamazlığı kanıtlanır. Giriş, Server Actions, görseller, build ve widget testleri geçer.

**Kanıt:** package.json; package-lock.json; 20 Ekim npm audit --omit=dev; Next.js resmî güvenlik bildirimleri.

### 02. Veritabanı rolünü gerçekten sınırlandırmak
**Öncelik:** Satış öncesi · **Durum:** Canlı izin sorgusuyla doğrulandı

**Bulgum:** reviewbridge_app rolü oluşturuldu ancak neon_superuser grubuna üye. rolcreatedb, rolcreaterole ve rolbypassrls değerleri true. public şemasında CREATE ve mevcut tablolarda TRUNCATE false olsa da rol henüz hedeflenen en az yetki düzeyinde değil. Önceki tamamlandı ifadesi bu nedenle düzeltilmiştir. Vercel bağlantısı bu role geçirilmedi.

**Müşteriye/işletmeye etkisi:** Uygulama bağlantısının ele geçirilmesi durumunda zarar yalnızca normal uygulama işlemleriyle sınırlanmaz.

**Yapılacak iş:** Yönetici grubu üyeliğini ve gereksiz rol bayraklarını kaldıracak kontrollü değişikliği önce izole ortamda doğrula. Yalnızca gereken şema, tablo ve sequence izinlerini tut. Şema değişikliklerini uygulama rolünden ayrı yürüt; ardından Production DATABASE_URL değiştir.

**Kapanış ölçütü:** Yeni rol yönetici rolüne geçemez, rol/veritabanı/şema oluşturamaz, tablo silemez veya TRUNCATE yapamaz; gerekli uygulama işlemleri çalışır. Canlı bağlantı ve geri dönüş yolu doğrulanır.

**Kanıt:** 20 Ekim Neon pg_roles, pg_has_role ve has_*_privilege sorgusu; kullanıcı verisi okunmadı.

### 03. Hazırlanan güvenlik düzeltmelerini gerçekten yayınlamak
**Öncelik:** Satış öncesi · **Durum:** Yerelde hazır, yayımlanmadı

**Bulgum:** Kaynak sınırını eşzamanlı isteklerde koruma, plan düşünce fazla kaynakları duraklatma, kullanıcı çıktısını küçültme, günlüklerde veri azaltma ve AI veri minimizasyonu değişiklikleri yerel çalışma dalında. GitHub main hâlâ 4c0bab3; bu değişiklikler commit edilmemiş.

**Müşteriye/işletmeye etkisi:** Yerel testin geçmesi müşterinin aynı korumayı kullandığını göstermez.

**Yapılacak iş:** Değişiklikleri son kez incele; gerekli veritabanı entegrasyon testlerini ekle; PR, CI ve preview doğrulamasından sonra yayınla. Yayınlanan commit ile raporun sürümünü eşleştir.

**Kapanış ölçütü:** Canlı yayın doğru commit'i kullanır; kritik korumalar gerçek HTTP istekleriyle doğrulanır; önceki yayına geri dönme adımları kayıtlıdır.

**Kanıt:** git status; git ls-remote origin refs/heads/main; yerel 100/100 test. Canlı /api/health 200 döndü; bu yalnızca veritabanına basit erişimi gösterir.

### 04. Abonelik durumunu ve dönem tarihlerini doğru yönetmek
**Öncelik:** Satış öncesi · **Durum:** Hata yeniden üretildi

**Bulgum:** Çözücü olay adına ve ürün ID'sine bakıyor, attributes.status değerini dikkate almıyor. subscription_updated + status=expired + Pro ürün ID'si verildiğinde sonuç pro oluyor. Canlı users tablosunda abonelikle ilgili yalnızca plan ve lemonsqueezy_subscription_id var; bitiş/yenileme/durum alanları yok.

**Müşteriye/işletmeye etkisi:** Süresi dolmuş bir abonelik yeniden ücretli hak alabilir; müşteriye kalan süre ve ödeme durumu doğru gösterilemez.

**Yapılacak iş:** Abonelik durumunu, müşteri/ürün kimliğini, test/live ortamını, yenileme ve bitiş zamanını, son sağlayıcı güncellemesini sakla. Hakları güvenilir abonelik durumundan hesapla. Yenileme tarihini tek başına süre sonu kabul etme.

**Kapanış ölçütü:** Başarılı aylık yenilemede plan korunur. İptalde dönem sonuna kadar erişim devam eder. Gerçek sona ermede Free uygulanır. Aynı zamandaki olaylar ve geç gelen updated/expired olayları ücretli hakları yanlış geri açmaz.

**Kanıt:** lib/lemonsqueezy-webhook.js; app/lib/lemonsqueezy-webhook-handler.js; canlı information_schema sütun kontrolü; doğrudan çözücü denemesi.

### 05. Kaçan ödeme bildirimleri ve yeniden eşitleme
**Öncelik:** Satış öncesi · **Durum:** Eksik mekanizma

**Bulgum:** İmza kontrolü, aynı gövdeyi tekrar işleme engeli ve eski olay kontrolü var. Ancak Lemon Squeezy API'siyle düzenli abonelik karşılaştırması bulunamadı. Mevcut handler testleri veritabanını taklit ediyor; gerçek SQL eşzamanlılık garantisini kanıtlamıyor.

**Müşteriye/işletmeye etkisi:** Bir bildirim gelmezse ödeme yapan kişi Free kalabilir veya aboneliği biten kişi ücretli hakları kullanmaya devam edebilir.

**Yapılacak iş:** Tekrarlanabilir olay işleme, başarısız olay kaydı ve yeniden deneme; abonelik bazında sıralama/kilit; zamanlanmış sağlayıcı karşılaştırması ve kullanıcı için güvenli durum yenileme ekle. Ödeme başarısızlığı ve geri kazanımı için açık bir erişim politikası belirle.

**Kapanış ölçütü:** Bildirim geç, iki kez, ters sırada ve eşzamanlı gönderildiğinde tek doğru son durum oluşur. Kaçırılan olay API karşılaştırmasıyla onarılır. Sağlayıcı kesintisi herkesi yanlışlıkla Free yapmaz.

**Kanıt:** Webhook handler; tests/lemonsqueezy-webhook-handler.test.js; günlük bakım işi. Lemon Squeezy resmî abonelik nesnesi ve webhook belgeleri.

### 06. Tek abonelik, doğru müşteri ve test/live ayrımı
**Öncelik:** Satış öncesi · **Durum:** Kodda riskli akış

**Bulgum:** Checkout bağlantısı yalnızca e-postayı önceden dolduruyor; sunucunun oluşturduğu hesaba bağlı checkout yok. Pro kullanıcısının Ajans düğmesi yeni checkout açıyor. Handler'da açık test_mode/store_id doğrulaması yok; BILLING_MODE sayfada metni değiştiriyor.

**Müşteriye/işletmeye etkisi:** Farklı e-posta ile satın alma hakları yanlış hesaba bağlayabilir. Plan yükseltirken ikinci aktif abonelik oluşup çift ücret çıkabilir. Test yapılandırması hataları canlı haklara karışabilir.

**Yapılacak iş:** Giriş yapmış hesabın değişmez kimliğiyle sunucuda checkout oluştur; mevcut abonelik varsa plan değiştir. Mağaza, ürün, veri tipi ve test/live ayrımını sunucuda doğrula. Tek aktif abonelik politikası ve müşteri kimliği tut; fiyat farkı uygulamasını açıkça göster.

**Kapanış ölçütü:** E-posta checkout'ta değişse bile hak doğru hesaba gider. Pro→Ajans işleminde yalnızca bir aktif abonelik kalır. Test olayı canlı abonelik haklarını etkileyemez. Ödeme dönüş ekranında doğrulama bitmeden başarı iddiası gösterilmez.

**Kanıt:** app/dashboard/upgrade/page.js; app/lib/lemonsqueezy-webhook-handler.js; BILLING_MODE kullanımı.

### 07. İptal, kart güncelleme, fatura ve hesap silme
**Öncelik:** Satış öncesi · **Durum:** Eksik müşteri akışı

**Bulgum:** Panelde abonelik yönetim portalı entegrasyonu bulunamadı; alt plana geçiş düğmeleri pasif. Koşullar sayfası panelden iptal edilebildiğini söylüyor. Hesap silme eylemi Lemon aboneliğini iptal etmiyor.

**Müşteriye/işletmeye etkisi:** Müşteri iptal etmek için sana ulaşmak zorunda kalabilir. Hesabı silmesine rağmen yenileme ücretinin sürmesi riski var.

**Yapılacak iş:** Güvenli müşteri portalı bağlantısı; plan, durum, sonraki tarih, kart/fatura ve iptal ekranı ekle. Hesap kapatmayı abonelik yenilemesini durdurma ve uygulama/kimlik verilerini temizleme adımlarıyla kurtarılabilir bir süreç yap. Sağlayıcı başarısızlığında müşteriye yanlış tamamlandı mesajı verme.

**Kapanış ölçütü:** Kullanıcı yardımsız iptal edebilir ve ödeme yöntemini değiştirebilir. Hesap kapatıldıktan sonra yeni abonelik yenilemesi oluşmaz; süreç yarıda kalırsa kayıtlı onarım yolu vardır.

**Kanıt:** app/dashboard/upgrade/page.js; app/dashboard/settings; app/actions/settings.js; app/terms/page.js.

### 08. Plan düşüşü ve hesaplar arası veri ayrımı
**Öncelik:** Satış öncesi · **Durum:** Koruma var; gerçek entegrasyon testleri eksik

**Bulgum:** Free/Pro/Ajans kaynak sınırları 1/5/sınırsız; widget yorum sınırları 10/20/20. Ajans Pro'nun özelliklerini de içerir. Sunucu kontrolleri mevcut ve yeni yerel düzeltmeler var; iki bağımsız hesapla kaynak/widget/anket/davet/export erişiminin reddedildiğini kanıtlayan kapsamlı test yok.

**Müşteriye/işletmeye etkisi:** Sadece düğme gizlemek yeterli değildir. Yanlış sahiplik kontrolü başka müşterinin verisini açabilir; yanlış düşürme müşterinin sitesindeki bileşenleri beklenmedik biçimde kapatabilir.

**Yapılacak iş:** İki hesap, üç plan ve owner/editor/viewer/client rolleriyle API düzeyinde negatif testler yaz. Aktif kalacak kaynak seçimini müşteriye göster; fazla kaynakları silmek yerine duraklat. Oturumlar, arka plan işleri ve yayınlanan widget'larda aynı güncel hakkı uygula.

**Kapanış ölçütü:** Başka hesaba ait ID ile okuma/yazma/ihracat reddedilir. Viewer/client değişiklik yapamaz. Free premium özelliği API'den açamaz. Ajans→Pro→Free ve tekrar yükseltme veri kaybetmeden çalışır.

**Kanıt:** lib/plans.js; lib/agency-access.js; lib/source-plan-guard.js; getCurrentUser; mevcut e2e dosyaları ağırlıkla halka açık sayfa ve taklit widget yanıtları.

### 09. Ticari barındırma ve veri sağlayıcılarının koşulları
**Öncelik:** Satış öncesi doğrulama · **Durum:** Dış hizmet doğrulaması gerekli

**Bulgum:** 23 Ekim'de Vercel hesabı yeniden açıldı ve proje ekibi hâlâ **Hobby** göründü. [Vercel'in güncel koşulları](https://vercel.com/legal/terms) Hobby kullanımını kişisel/ticari olmayan faaliyetle sınırlıyor. Google/Trustpilot yetkili ticari API erişimi için önceki notlarda tamamlanmamış başvurular bulunuyor.

**Müşteriye/işletmeye etkisi:** Satış başlatmak teknik olarak mümkün olsa bile barındırma veya yorumların yeniden kullanım koşulları iş modelini engelleyebilir.

**Yapılacak iş:** Güncel Vercel planını doğrula ve ticari kullanıma uygun plan/host seç. Her yorum sağlayıcısında kullanılan veri erişim yöntemi, saklama, atıf ve yeniden gösterim haklarını doğrula; gerekli ticari izinleri al veya özelliği buna göre sınırla. Bu inceleme hukuki uygunluk onayı değildir.

**Kapanış ölçütü:** Ticari barındırma uygunluğu belgeli; ücretle satılan kaynak entegrasyonlarının erişim ve gösterim koşulları doğrulanmış. Scraper'ın sonuç getirmesi tek başına izin sayılmıyor.

**Kanıt:** docs/OPERATIONS.md; Vercel güncel Hobby ve Fair Use belgeleri; Google Maps şartları.

### 10. Yedek, geri yükleme ve başarısız yayın provası
**Öncelik:** Satış öncesi · **Durum:** Başarı kanıtı eksik

**Bulgum:** Önceki kontrol kısa bir Neon geri dönüş penceresi ve planlı snapshot bulunmadığını kaydetmişti. Bu turda geri yükleme yapılmadı; müşteri verisinin gerçekten kurtarıldığını gösteren prova kaydı yok.

**Müşteriye/işletmeye etkisi:** Yanlış silme veya hatalı yayın sonrasında kayıp veriyi kurtaramazsan müşteriye hizmeti geri veremezsin.

**Yapılacak iş:** Bütçeye uygun saklama süresi, bağımsız şifreli yedek, erişim sınırı ve geri yükleme prosedürü seç. İzole dalda geri yükleme yap; kullanıcı-kaynak-yorum-widget ilişkilerini ve giriş eşlemesini kontrol et. Kabul edilebilir veri kaybı ve toparlanma süresini belirle.

**Kapanış ölçütü:** Üretim verisini bozmadan geri yükleme provası geçer; süre ve sonuç kaydedilir. Migration ve uygulama geri alma adımları birlikte çalışır.

**Kanıt:** Önceki Neon envanteri; bu incelemede yeni yedek veya kurtarma işlemi yapılmadı.

### 11. Gerçek destek kanalı ve çalışan e-posta özellikleri
**Öncelik:** Satış öncesi · **Durum:** Dış kurulum ve teslim testi bekliyor

**Bulgum:** Sitede support@reviewbridge.app yazıyor; bu adresin sana ait ve alıcı olduğuna dair doğrulama yok. Operasyon notlarında Resend gönderici alanı/anahtarı eksik ve e-posta davetlerinin kapalı olduğu yazıyor. Güncel teslim testi bu turda yapılmadı.

**Müşteriye/işletmeye etkisi:** Ücret ödeyen müşteri destek alamayabilir; satıldığı düşünülen davet/bildirim özelliği çalışmayabilir.

**Yapılacak iş:** Sahip olduğun çalışan destek adresini yayınla ve gidiş-dönüş teslimi doğrula. E-posta özelliği satılacaksa doğrulanmış gönderici ve yalnızca gönderim yetkili anahtar kur; bounce/şikâyet/vazgeçme davranışını test et. Etkin olmayan özellikleri satış vaadinden çıkar.

**Kapanış ölçütü:** Destek mesajı gerçek gelen kutusuna ulaşır ve yanıtlanabilir. Davet gönderimi, vazgeçme ve tekrar göndermeme çalışır. Site alan adını değiştirmek bu iş için zorunlu değildir; gönderici alanı ayrı olabilir.

**Kanıt:** Ana sayfa, yardım, gizlilik ve koşullar metinleri; docs/OPERATIONS.md; app/actions/surveys.js.

### 12. Kullanım kotası ve maliyetin kontrol altında tutulması
**Öncelik:** Satış öncesi · **Durum:** Ürün sınırları kısmen tanımlı

**Bulgum:** Ajans kaynak sayısı sınırsız. AI ve anket oluşturma akışlarında ücretli planı zorunlu kılan kontrol görülmedi; bunların tüm planlara açık olması isteniyorsa açıkça yazılmalı. AI hız sınırı hesap+IP bileşimine bağlı, aylık hesap kotası değil. Davetlerde tek kampanya sınırı var ama dönem bütçesi farklı bir ihtiyaç.

**Müşteriye/işletmeye etkisi:** Tek yoğun müşteri veya çok sayıda ücretsiz hesap, Apify/AI/e-posta/veritabanı maliyetini gelirin üzerine çıkarabilir.

**Yapılacak iş:** Her plan için kaynak, tarama, alınan yorum, gösterilen yorum, AI isteği, davet, ekip üyesi ve trafik sınırlarını tek tabloda tanımla. Hesap bazlı dönem kotası ve servis bütçe alarmları ekle. Ücretli dış çağrılarda ortak limit servisi bozulursa güvenli durma politikasını belirle.

**Kapanış ölçütü:** Kota eşzamanlı isteklerle ve IP değişimiyle aşılamaz. Başarısız iş haksız kota tüketmez. 10/100 müşteri için ölçülen kullanım üzerinden maliyet hesabı yapılır; temelsiz sınırsız vaadi verilmez.

**Kanıt:** lib/plans.js; lib/rate-limit.js; app/api/insights/ai/route.js; app/actions/surveys.js.

### 13. Gizlilik, AI'ya veri aktarımı ve veri yaşam döngüsü
**Öncelik:** Satış öncesi · **Durum:** Kısmi koruma; sözleşme ve uçtan uca kontrol gerekli

**Bulgum:** Yerel kod AI'ya gönderilen metni sınırlandırıp yaygın iletişim bilgilerini maskeliyor; bu tam anonimleştirme değil. Gemini projesinin geçerli veri işleme katmanı bu turda doğrulanmadı. Uygulama profili doğrulanmış e-posta üzerinden eşleniyor; uzun vadede sabit kimlik bağı daha sağlam. Tam hesap veri dışa aktarma akışı bulunamadı.

**Müşteriye/işletmeye etkisi:** Yorumlarda kişisel bilgi bulunabilir. E-posta değişimi, hesap silme ve geri yükleme sırasında yanlış eşleşme veya saklama sözüyle gerçek davranış arasında fark oluşabilir.

**Yapılacak iş:** Gemini hesabının geçerli şartlarını doğrula; kişisel veri aktarımını azalt ve kullanıcının açık eylemine bağla. Sağlayıcıları gizlilik metninde doğru açıkla. Kimlik eşlemesini sabit auth ID ile güçlendir; veri dışa aktarma/silme/yeniden kayıt/retention işlemlerini ve gizli log sızıntılarını test et. Hedef pazara uygun politika incelemesi yaptır.

**Kapanış ölçütü:** Farklı müşterilerin özel yanıtları dışarı çıkmaz; gerekli saklama ve silme işlemleri kanıtlanır; sağlayıcı şartları gerçek kullanıma uygundur. Hesap silme başarısızlıkları izlenebilir ve onarılabilir.

**Kanıt:** lib/auth/server.js; lib/ai-review-insights.js; app/privacy/page.js; app/actions/settings.js; Gemini resmî şartları.

### 14. Gerçek müşteri yolculuğu, izleme ve satış metninin doğruluğu
**Öncelik:** Satış öncesi · **Durum:** Kısmen test edilmiş

**Bulgum:** Canlı health 200 döndü ancak sadece SELECT 1 çalıştırıyor. 100 yerel test geçti. E2E testleri halka açık dil/mobil sayfası ve taklit verili widget ağırlıklı; yeni hesap, abonelik yaşam döngüsü ve iki hesaplı yetki akışını kanıtlamıyor. Otomatik tarama cron'u günde bir kez çalışıyor.

**Müşteriye/işletmeye etkisi:** Site açık görünürken giriş, yorum alma, abonelik veya e-posta bozuk olabilir. 'Daha sık eşitleme' ve 'tüm yorumlar' gibi ifadeler gerçek kapasiteyi yanlış anlatabilir.

**Yapılacak iş:** Yeni hesapla kayıt→doğrulama→giriş→kaynak→yorum→filtre→harici siteye widget akışını masaüstü ve telefonda test et. Ödeme senaryolarını test modunda uçtan uca tamamla. Sync hata oranı, bekleyen işler, başarısız webhook, cron ve dış servis bütçeleri için uyarı kur. Gösterim/analiz/tarama sınırlarını ayrı anlat.

**Kapanış ölçütü:** Google kısa link ve Trustpilot; boş/yanlış link; zaman aşımı ve retry; oturum yenileme/çıkış; mobil klavye ve ekran taşması; gerçek harici widget kurulumu geçer. Alarm denemesi sana ulaşır. Fiyat, plan ve destek vaatleri uygulamayla aynıdır.

**Kanıt:** e2e/public-site.spec.js; e2e/widget-embed.spec.js; app/api/health/route.js; vercel.json; canlı sağlık isteği.


## 21 Ekim 2026 uygulama kaydı

Bu bölüm ilk bulgulardan sonra yapılan işleri kaydeder; aşağıdaki açık kapılar kapanmadan satışa hazır sonucu verilmez.

- Next 16.4.2, React 19.3.1 ve Resend 6.34.1 güncellendi. Production bağımlılık taramasında sıfır bilinen açık; geliştirme araçlarında braces zinciri için ayrı takip gerekiyor.
- 111 birim testi, derleme ve lint geçti. Dil/mobil/widget ve yetkisiz API erişimi için altı tarayıcı testi geçti; gerçek test satın alımı bunların yerine geçmez.
- İzole Neon dalında eşzamanlı Free kaynak sınırı, bağımsız hesaplar, ters sıralı/tekrar abonelik olayları, eski aboneliğin yeniyi kapatamaması, veri kaybetmeden düşüş, sabit kimlik eşleme, hesap dışa aktarma ve ajans rol/marka izolasyonu geçti. Süre dolumu giriş veya cron beklemeden okunurken uygulanıyor.
- Abonelik durum/tarih ve sabit auth kimliği ekleyen iki migration production'a uygulandı. Kullanıcı verileri silinmedi.
- SQL ile oluşturulan `reviewbridge_runtime` rolü yönetici, CREATE, TRUNCATE ve BYPASSRLS yetkilerine sahip değil. Sunucunun dört eski RLS tablosuna erişimi yalnız bu role özel politikalarla sağlandı. İzole dalda gerçek INSERT/UPDATE/SELECT/DELETE, production'da okuma görünürlüğü doğrulandı. Kullanıcılar arası yetkilendirme sunucu sorgularındadır; bu bağlantı tarayıcıya verilmez.
- Vercel Production DATABASE_URL sınırlı rol ile Secret olarak güncellendi; yeni deployment sonrası aktif olacaktır. Eski yönetici rolü otomatik silinmedi.
- Lemon test API anahtarı Production Secret olarak kaydedildi; mağaza 349434 ve BILLING_MODE=test ayarları eklendi. Resmî API'de Pro/Agency varyantları test modunda doğrulandı. Tahsilat yapılmadan test checkout oluşturuldu; canlı ödeme açılmadı.
- Checkout hesap imzası, aynı anda rezervasyon, eski linkin tekrar kullanılmasını önleme, portal ve sağlayıcıdan abonelik karşılaştırması eklendi. Süresi bitmiş abonelik ancak sağlayıcıdan doğrulandıktan sonra yeni checkout açabilir.
- Hesap başına saatlik tarama başlatma denemesi Free 5 / Pro 20 / Agency 60; ilk ekleme ve retry aynı limiti kullanır. Başarısız deneme de sayılır. Yardım sayfasına açıklandı. Bu, aylık bütçe/uyarı çalışmasının tamamlandığı anlamına gelmez.
- Zamanlanmış işlerde süre bütçesi ve yarım kalma görünürlüğü eklendi. Billing kuyruğunda kalan hesap varsa başarılı yanıt dönmez.
- PR #57 CI ve Vercel kontrolleriyle main'e birleştirildi (`2a21f1e`). Production Ready; canlı oturum, dört kaynak ve 160 yorum görüntülendi. Önizlemede Google ile giriş ve yenilemede oturum koruması geçti. Önizleme için yalnızca sahip olduğumuz dal adresi Neon güvenilir adreslerine eklendi.
- Sonraki değişiklik: uygulama verisiyle aynı işlemde kalıcı silme günlüğü; kimlik servisi hata verirse tekrar deneme ekranı; aynı kimliğin yeniden profil oluşturmasının engellenmesi. İzole veritabanında başka hesap reddi, cascade, kesinti, e-posta doğrulamasını silinme saymama ve eşzamanlı tekrar testleri geçti. Ek tablo production'a uygulandı; bu takip değişikliğinin yayını ayrıca doğrulanmalıdır.

- Şifreli public yedek boş test veritabanına geri yüklendi; bütün satırlar ve sequence değerleri karşılaştırıldı ve eşleşti. `docs/RECOVERY_RUNBOOK.md` kanıtı ve silinen hesapların kurtarmada geri gelmesini önleyen adımları kaydeder. Cihaz dışı düzenli yedek ve Auth kurtarması henüz tamam değildir.

**Henüz kapanmayan yayın/satış kapıları:** Silme/health takip değişikliğinin yayını; yeni test satın alımı→webhook→portal yaşam döngüsü; kimlik servisi silme akışının gerçek geçici hesapla doğrulanması; düzenli cihaz dışı yedek ve Auth kurtarma; çalışan destek/gönderici e-postası; ticari hosting ve veri sağlayıcı koşulları; dönem bütçeleri ve alarmın gerçekten teslimi. Kesintiyle kalan yerel geçici düz metin dosyalarının temizliği otomatik onay denetimince engellendi. Preview şeması production'dan ayrıysa ayrıca hazırlanmalıdır.

## Uygulama sırası
1. **Güvenlik zemini:** yamalı bağımlılıklar, gerçekten sınırlı veritabanı rolü, yerel düzeltmelerin entegrasyon testleri ve kontrollü yayını (01–03).
2. **Abonelik omurgası:** durum/tarih kaydı, olay sıralaması ve yeniden eşitleme, tek abonelik ve güvenli checkout, müşteri portalı ve hesap kapatma (04–07). Bunlar test modunda geliştirilebilir; gerçek tahsilatı açmak gerekmez.
3. **Veri ve haklar:** hesaplar arası negatif testler, düşüş/yükseliş, yedekten dönüş, gizlilik ve maliyet sınırları (08, 10, 12, 13).
4. **Dış hizmet ve müşteri operasyonu:** ticari barındırma/veri kullanım hakları, çalışan destek ve satılan e-posta özellikleri, kritik alarm teslimi (09, 11, 14).
5. **Satış kapısı:** test modunda tam yaşam döngüsü; ardından live mağaza/ürün/webhook eşleşmesinin kontrolü ve ayrı, kontrollü gerçek ödeme açılışı.

## Satıştan önce geçmesi gereken abonelik testleri
- Free → Pro, Free → Ajans ve Pro → Ajans: doğru kullanıcı, doğru tek abonelik.
- Yenileme başarılı: haklar kesilmez.
- İptal: hemen Free olmaz; dönem sonunda Free olur.
- Sona ermiş abonelik için geç gelen updated olayı: ücretli hak geri açılmaz.
- Kart reddi, yeniden deneme ve ödeme geri kazanımı: tanımlı politika uygulanır.
- Aynı olayın tekrarı, ters sıra, eşzamanlı istek, aynı zaman damgası: doğru son durum.
- Eski aboneliğin sona ermesi: yeni geçerli aboneliği kapatmaz.
- Yanlış imza, bilinmeyen mağaza/ürün ve test/live uyuşmazlığı: plan değişmez.
- Checkout'ta farklı e-posta kullanımı: oturum sahibinin hesabı doğru eşlenir.
- Bildirim hiç ulaşmazsa: sağlayıcı karşılaştırması hakları onarır.
- Ajans → Pro → Free → tekrar yükseltme: kaynaklar, yorumlar ve widget ayarları kaybolmaz.
- Hesap kapatma: yenileme durur; kimlik veya veritabanı işlemi yarıda kalırsa onarım mümkündür.

## Müşterinin görmesi gerekenler
- “Planım”, aktif kaynak/limit, yenileme veya sona erme tarihi ve abonelik durumu.
- “Aboneliği yönet”, “Kartı güncelle”, “Faturalar” ve anlaşılır iptal yolu.
- “Ödeme alındı, planınız doğrulanıyor” gibi gerçek durumu anlatan dönüş ekranı.
- “Toplam Google yorumu”, “içe aktarılan yorum”, “widget'ta gösterilen yorum” ve “AI'da analiz edilen metin” ayrımı.
- Kaynak taramasında son başarılı eşitleme, devam eden iş ve anlaşılır yeniden deneme.
- Plan düşüşünde hangi kaynakların duraklayacağı; mümkünse hangisinin aktif kalacağını seçme.
- Çalışan destek adresi; doğrulanmamış 24 saat yanıt veya kesintisiz hizmet sözü yok.

## İlk satış için bekleyebilecekler
Yeni domain/marka, yeni animasyonlar, tanıtım videosu, daha fazla widget teması ve yeni yorum platformları temel satış güvenilirliğinden sonra gelebilir. Mevcut domain ile çalışmak tek başına teknik satış engeli değildir; barındırma planı ve destek/gönderici alanı ayrı konulardır.

## Dış kaynaklar
- [Lemon Squeezy abonelik nesnesi](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)
- [Lemon Squeezy abonelik yönetimi](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)
- [Lemon Squeezy test olayları](https://docs.lemonsqueezy.com/help/webhooks/simulate-webhook-events)
- [Next.js resmî güvenlik bildirimleri](https://github.com/vercel/next.js/security/advisories)
- [Neon rol yönetimi](https://neon.com/docs/manage/roles)
- [Vercel ticari kullanım koşulları](https://vercel.com/docs/limits/fair-use-guidelines)
- [Gemini veri işleme koşulları](https://ai.google.dev/gemini-api/terms?hl=en)
- [Google Maps Platform koşulları](https://cloud.google.com/maps-platform/terms)

**Sınır:** Bu çalışma hedefli bir teknik ve ürün incelemesidir; bağımsız sızma testi veya hukuki uygunluk sertifikası değildir. Doğrulanmamış maddeler satış için tamamlandı kabul edilmemelidir.

## 22 Ekim — bakım izlemesi ve doğrulanmış operasyon durumu
- PR #58 main'e birleştirildi ve production yayını Ready: kesilen hesap silme kurtarması canlıda.
- UptimeRobot test bildiriminin Hotmail'e teslimini kullanıcı doğruladı.
- İki günlük bakım işinin kalıcı durum tablosu production'a eklendi; kısıtlı runtime erişimi doğrulandı.
- Başarısızlık, yeniden deneme, eşzamanlı çalışmayı reddetme, yarım kalan iş ve kaçırılan zamanlama testleri izole Neon dalında geçti.
- PR #59 main'e birleştirildi; GitHub CI ve Vercel production yayını başarılı. İki görevin Vercel Cron Jobs üzerinden elle çalıştırılması Neon'da `success` ve yeni `succeeded_at` kaydı oluşturdu. Canlı `/api/health` HTTP 200 döndü. Bu bir kerelik doğrulama, gelecekteki günlük çalışmaların yerini tutmaz; UptimeRobot alarmı onları izleyecek.
- Geliştirme araçlarında braces CVE-2026-93687 için yama yayımlanmamıştı; üretim bağımlılık taraması temizdi. Lint sürümünü zorla düşürmek çözüm olarak uygulanmadı.
- Düzenli cihaz dışı yedek, bağımsız Auth kurtarması, doğrulanmış destek/gönderici adresi ve gerçek sağlayıcılarla kalan uçtan uca testler açık; genel satış hazır onayı verilmedi.

## 22 Ekim — gerçek test müşteri yolculuğu
- `semihayan01@hotmail.com` hesabıyla Lemon test modunda sahte kart kullanılarak Pro aboneliği oluşturuldu. Lemon abonelik `2629524` aktif/test modunda; Neon'daki aynı kullanıcı Pro ve aktif olarak güncellendi. Bu, checkout → webhook → hak verme zincirini canlı ortamda doğruladı; gerçek ücret alınmadı.
- Google Haritalar paylaşım kısa bağlantısı `maps.app.goo.gl/ipj9aHNcB55RUx5g9` kaynak ekleme ekranından işlendi. “Ella Estetik Ve Güzellik” kaynağının eşitlemesi tamamlandı; 20 yorum Neon'da görüldü.
- Test mağazası etkinleşmediği için Lemon müşteri portalı “This store has not been activated” hatası verdi. PR #61 ile uygulama içi iki aşamalı yenileme iptali production'a çıktı. Gerçek test aboneliğinde iptal yapıldı: Lemon ve Neon `cancelled`, bitiş tarihi 22 Kasım 2026; hesap bu tarihe kadar Pro kaldı.
- Canlı widget düzenleyicide yerleştirme kodunun `localhost:3000` adresi gösterebildiği görüldü. PR #62 sunucudan aynı kanonik adresi geçirerek bunu düzeltiyor; canlı yayın sonrası tekrar doğrulanacak.
- Test aboneliklerinin canlı moda geçildiğinde ücretli hak olarak kalmaması için açık bir geçiş kapısı var. Live anahtarları/ürünleri açmadan önce bu ayrım ve test kayıtlarının dönüşümü doğrulanmalı.

## 22 Ekim — test/canlı abonelik ayrımı
- Canlı mod ile veritabanındaki `billing_test_mode` uyuşmazsa, oturum açan kullanıcı ve halka açık widget hakları Free olarak değerlendirilir. Canlı modda test aboneliği kimliği kalmışsa `/api/health` 503 vererek geçişin eksik olduğunu bildirir. Bu korumalar test modundaki mevcut hakları değiştirmez.
- `docs/LIVE_BILLING_CUTOVER.md`, gerçek satış günü uygulanacak sıralı işlemleri ve test aboneliklerini veri kaybetmeden sıfırlayan tek atomik SQL ifadesini içerir. **Production'da bu ifade henüz çalıştırılmadı; Lemon hâlâ test modunda.**
- Geçici Neon dalı `billing-live-cutover-audit` üzerinde aynı ifade denendi: 1 test aboneliği/ücretli test kullanıcısı 0'a düştü; 9 kaynak, 340 yorum ve 10 widget aynen kaldı. 1 widget'ın plan önbelleği Free'ye döndü. Dal 23 Ekim'de otomatik sona erecek.

## 23 Ekim — yayın ve destek kanalı çalışması

- PR #63 başarılı CI/Vercel kontrollerinden sonra `main` dalına birleştirildi (`9e7c24d`). Vercel production yayını başarılı ve `/api/health` HTTP 200. Lemon test modunda kaldı. İzole dalda ayrıca canlı mod/test aboneliği uyuşmazlığında okuma anındaki hakkın Free olduğu, saklanan planın Free'ye indiği ve geçmiş abonelik kimliğinin otomatik silinmediği doğrulandı.
- Üretim widget rozetindeki `reviewbridge.com` bağlantısı gerçek yayın adresine düzeltildi; doğrulanmamış `support@reviewbridge.app` bağlantıları için Neon'da kayıt tutan iletişim formu ve yalnızca doğrulanmış sahip hesabına açık destek gelen kutusu geliştirildi. Migration izole dalda kısıtlı runtime rolüyle test edildi. **Bu bölümün canlı yayını ve uçtan uca mesaj/yanıt testi ayrıca doğrulanmalıdır.**
- Neon Auth verilerinin `neon_auth` şemasında aynı Postgres dalında olduğu doğrulandı. Mevcut `public` yedeği bu verileri kapsamaz; düzenli cihaz dışı şifreli yedek ve bağımsız Auth geri yükleme provası hâlâ açık satış kapısıdır.
- Ardından `public` + `neon_auth` şemalarının birlikte şifreli yedeği alındı ve geçici dalda boş veritabanına geri yüklendi; COPY satırları/sequence değerleri ve 3 kimlik, 12 oturum, 9 kaynak, 340 yorum sayımı eşleşti. Anahtar Windows profiline bağlı olduğundan cihaz dışı bağımsız yedek ve yeni makinede kurtarma hâlâ açık.
- PR #64 başarılı CI ve Vercel önizlemesinden sonra `main` dalına birleştirildi (`b91c674`). Production'a yalnızca destek tablosu eklendi. Canlı `/contact` formuna sentetik bir talep gönderildi; sahip hesabındaki `/dashboard/support` gelen kutusunda görüldü ve çözüldü işaretlenince açık listeden çıktı. Canlı widget yanıtında doğru ReviewBridge bağlantısı var; eski `reviewbridge.com` yok. Gerçek bir müşteriyle yanıt e-postasının teslimi henüz denenmedi.
- Aynı gün Vercel proje panelindeki takım rozeti **Hobby** olarak doğrulandı. Bu plan gerçek ücretli hizmet için uygun değil; ücretli Pro/Enterprise veya koşulları uygun farklı bir barındırma çözümü satıştan önce seçilmeli. Bu çalışmada ücretli plan satın alınmadı.
