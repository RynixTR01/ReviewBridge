# ReviewBridge: Rakip Özellik Açıkları ve Uygulama Yol Haritası

Denetim tarihi: 13 Ekim 2026

Kapsam: Proje kodu ve ürün akışı; doğrudan rakip olarak Trustmary, Elfsight ve EmbedSocial; TrustMRR ise pazar/ürün keşfi örneği olarak incelendi.

Bu yol haritası, rakiplerde görülen her özelliği körü körüne kopyalamak yerine ReviewBridge'in güvenilir yorum kaynağı ve gömülebilir yorum widget'ı amacına göre tüm farkları kaydeder. Platform erişim ve içerik kullanım kuralları, yeni bir kaynak eklenmeden önce doğrulanmalıdır. Bir özelliğin planlanması, o platformun verisini kullanma izni olduğu anlamına gelmez.

## Mevcut durum: kodda doğrulananlar

- Neon Postgres ve Neon Auth üzerinde Next.js/Vercel uygulaması.
- Google Maps ve Trustpilot kaynakları; Apify tabanlı veri alma akışı.
- Kaynak ekleme, yinelenen kaynak kontrolü, elle eşitleme, eşitleme geçmişi, retry ve takılmış işleri temizleme.
- List, grid, carousel ve masonry yorum düzenleri; light/dark/minimal temalar; ortalama puan rozeti; font, kart aralığı ve köşe ayarları; yorum kaynağına gitme düğmesi; ReviewBridge rozeti.
- Türkçe/İngilizce arayüz, mobil düzen, e-posta/parola ve Google ile giriş, profil/hesap silme, Lemon Squeezy aboneliği.
- Dashboard'da kaynak ve yorum sayıları, puan özeti ve eşitleme durumu.
- Kaynak bazında isteğe bağlı günlük otomatik eşitleme, manuel retry, artan gecikmeli ve en fazla üç otomatik retry, eşitleme geçmişi ve takılmış işleri temizleyen günlük Vercel Cron var. Cron sıklığı nedeniyle retry zamanları minimum bekleme süresidir; gerçek çalışma sonraki günlük cron çağrısında olabilir. Otomatik eşitleme varsayılan olarak kapalıdır.
- GitHub Actions içinde unit test, lint, build ve Playwright ile herkese açık ana sayfa/dil seçimi/mobil taşma E2E testi çalışıyor. Neon erişimini kontrol eden `/api/health` endpoint'i var; dış uptime alarmı ayrıca yapılandırılmalı. Gerçek provider entegrasyon testi henüz yok.

## Eksiklerin tam envanteri ve öncelik sırası

### P0 — Güvenlik, doğru veri ve ürünün temel güveni

1. **Ödeme webhook imzası yapılandırılmadığında fail-open davranıyordu.** İmza anahtarı yokken endpoint doğrulamayı atlayıp plan değiştirebiliyordu. Artık anahtar yokken 503, geçersiz imzada 401 dönüyor; hash tabanlı tekrar kaydı eklendi.
2. **Kaynak ekleme başarısızlığı yanlış başarı gösterebilir.** Trustpilot veri çekimi hata verdiğinde kod yine kaynağı ekleyip boş eşitlemeyi başarılı gösterebiliyordu. Hatalar artık eşitleme geçmişinde başarısız olarak kalıyor; boş başarılı veri ile provider hatası ayrılıyor.
3. **Platform veri erişimi ve saklama kuralları belirsiz.** Apify scraper ile elde edilen verinin Google/Trustpilot şartlarına uygunluğu, attribution, saklama ve silme gereklilikleri platform bazında doğrulanmalı. Yetkili API/OAuth yolu varsa, scraper davranışından ayrı değerlendirilmelidir.
4. **Yorum kimliği kararlı değil.** Provider ID varsa saklanıyor; yoksa normalize edilmiş kaynak/yorumcu/puan/metin ve güvenilir tarih parçasından SHA-256 ID üretiliyor. Provider tarihi eksikse geçici çekim zamanı ID'ye katılmıyor.
5. **Yorum metni ile widget'ın kaynağı/güncelliği gösterilmiyor.** Embed artık platformu, işletme adını ve son güncelleme tarihini gösteriyor; son eşitleme hata verdiyse veya veri 7 günden eskiyse uyarı gösteriyor.
6. **Eşitleme yaşam döngüsü tam otomatik değil.** Atomik kilit, arka plan Apify işi, callback ile timeout/abort sonucu, günlük isteğe bağlı dispatcher, takılmış iş temizliği ve en fazla üç retry/backoff eklendi. Günlük cron sebebiyle retry gecikebilir; dağıtık iş kuyruğu ve bağımsız alarm yok.
7. **Abonelik planı ve webhook olayları sağlamlaştırılmalı.** İmza, duplicate, tarih sıralaması ve mevcut abonelik kimliği korunuyor; variant ID eşlemesi environment variable ile destekleniyor. Lemon panelindeki gerçek variant ID'leri henüz bu çalışma alanından doğrulanamadı.

**Kabul ölçütü:** İmzasız/tekrarlı ödeme webhook'u planı değiştiremez; kaynak fetch hatası başarı gibi görünmez; sync tekrarları duplicate üretmez; eski yorumlar başarısız denemede korunur.

### P1 — Rakiplerle doğrudan özellik farkları

8. **Widget düzenleri eksik.** List, grid, carousel ve masonry ile canlı önizleme ve ortalama puan rozeti eklendi. Sabit/floating banner ayrı tasarım işi olarak kalıyor.
9. **İnce taneli filtre ve sıralama eksik.** Minimum yıldız, tarih aralığı, anahtar kelime include/exclude, en yeni/puan sırası ve yazısız yorum filtresi sunulmalı. Plan limitleri sunucuda uygulanmalı.
10. **Yorum moderasyonu eksik.** İşletme, yorumu widget'tan gizleyebilmeli veya sabitleyebilmeli; orijinal kaynak metni bozulmadan kalmalı. Moderasyon yalnızca widget görünümünü yönetmeli, kaynak platformdaki review'ı değiştirmemeli.
11. **Widget tasarım seçenekleri sınırlı.** Renk, avatar/tarih, başlık, alan adı allowlist'i, sistem/Arial/Georgia yazı tipi, sıkı/rahat kart boşluğu ve üç köşe biçimi eklendi. Metin rengi WCAG AA kontrastına göre düzeltiliyor.
12. **Gömülü widget dil seçimi eksik.** Site arayüzü TR/EN seçimini destekliyor; embed içindeki CTA, boş durum, kaynak etiketi ve tarih gösterimi ayrıca widget dili ayarı kullanmalı.
13. **Widget etkileşim analitiği eksik.** Günlük görüntülenme, kaynak tıklaması, CTA tıklaması ve CTR anonim toplu sayaçla dashboard'a eklendi; 90 gün sonunda siliniyor. Sayaçlar yaklaşık değerlerdir ve dağıtık bot koruması yok.
14. **Widget görünümü ve kopyalanan kodun kurulumu sınırlı.** WordPress/Shopify/Webflow/custom yönergeleri ve tekrar script yüklenmesini önleme eklendi. Başka alan adındaki gerçek kurulum otomatik algılanamaz; platforma özel plugin ve kurulum doğrulaması yok.
15. **Kaynak ve widget ilişkisi dashboard'da belirsiz.** Her kaynak altında birden fazla widget oluşturma ve açma akışı eklendi. Ajans marka/çalışma alanı modeli yok.

**Kabul ölçütü:** Dashboard önizlemesi ve canlı embed aynı ayarları üretir; filtreler/gizleme herkese açık endpoint'te uygulanır; TR/EN embed metni doğru; widget tüm hedef ekranlarda erişilebilir ve taşmasızdır.

### P2 — Ürün genişletme ve büyüme

16. **Kaynak kataloğu dar.** Facebook/Yelp/Tripadvisor/Capterra/G2 gibi platformlar istenebilir; her biri yalnızca veri erişim şartı, maliyet, silme ve attribution incelendikten sonra adapter olarak eklenmeli. Her kaynağı eklemek zorunlu değil.
17. **Yorum toplama ve anket akışı yok.** Trustmary gibi geri bildirim anketi, müşteri memnuniyeti ve dış platforma yönlendirme ayrı bir ürün koludur. İlk sürüm değil; ancak talep doğrulanırsa opt-in toplama ve moderasyon modeli tasarlanmalı.
18. **A/B testi ve hedef ölçümü yok.** Önce temel widget analytics; yeterli kullanım hacmi oluşunca tasarım varyantı/CTA deneyleri eklenmeli.
19. **Ajans/çoklu marka yönetimi eksik.** Marka/site alanları, müşteri çalışma alanı, ekip üyesi ve roller, her müşteri için kaynak/widget gruplanması ve alan adı allowlist'i tasarlanmalı.
20. **Onboarding checklist eksik.** Dashboard'da kaynak → yorum doğrulama → widget kodu → canlı site kontrolü akışı ve yardım rehberi var. Son kurulum adımı kullanıcı tarafından doğrulanır.
21. **Operasyonel bildirimler sınırlı.** Sync hatası dashboard ve geçmişte görünür. E-posta/usage-limit bildirim tercihleri henüz yok.

**Kabul ölçütü:** Ajans verileri birbirinden izole; kullanıcı ilk widget'ını yardım almadan kurabiliyor; yeni connector'lar ortak doğrulanmış sözleşmeye uyuyor.

### P3 — Üretime hazırlık ve ürün kalitesi

22. **Fiyat/özellik kaynağı tek değil.** Aylık fiyatlar ve kaynak/yorum limitleri ortak plan sabitlerinden besleniyor; metinsel özellik listeleri ve Lemon Squeezy panel eşleşmesi hâlâ ayrı doğrulanmalı.
23. **Marketing ile uygulama metinleri çelişebiliyor.** Desteklenen kaynaklar ve günlük opt-in sync FAQ/landing'de aynı duruma getirildi; örnek widget demo olarak işaretli.
24. **Erişilebilirlik ve embed performans güvencesi eksik.** Kontrast düzeltmesi, landmark/list/star etiketleri, klavyeyle carousel, ETag ile yeniden doğrulama ve reduced-motion desteği eklendi. Genel site için mobil E2E eklendi; widget embed için keyboard/mobile browser E2E ve saha gecikme ölçümü eksik.
25. **İstek sınırlandırma ve alan adı kontrolü eksik.** Embed ve event API'de geçici process bazlı hız sınırı, domain allowlist ve olay türü doğrulaması var. Dağıtık limit ve daha güçlü bot/abuse koruması yok.
26. **Test/izleme eksik.** Plan/webhook/widget/allowlist/retry/source URL unit testleri, lint/build, temel Playwright E2E ve GitHub Actions eklendi. Health endpoint'i hazır; provider/sync entegrasyon testleri, embed odaklı E2E, production smoke, error alarmı ve dış uptime alarmı hâlâ gerekli.
27. **Destek, durum ve dokümantasyon eksik.** Yardım sayfası ve operasyon runbook'u eklendi. Her connector kılavuzu, herkese açık status sayfası ve destek yanıt hedefi işletme kararı gerektiriyor.
28. **Gizlilik/silme belgeleri ürünün gerçek davranışını izlemeli.** Üçüncü taraf kaynak verisi, analitik olayları, saklama süreleri, silme ve sağlayıcı listesi uygulamayla aynı olmalı. Hukuki ifadeler yayın öncesi insan uzman kontrolünden geçmeli.
29. **Hoş geldin e-postası uç noktası dışarıdan tetiklenebiliyordu.** E-posta yalnızca doğrulanmış oturum sahibine gönderiliyor; ad escape ediliyor ve Neon alanı üzerinden bir kez gönderilmesi korunuyor.

**Kabul ölçütü:** Plan fiyat/limitleri eşleşir; hem TR hem EN arayüzü ve widget içeriği tutarlı; kritik akışların testleri CI'da çalışır; loglarda sır/kişisel veri bulunmaz.

## Rakiplerle özellik karşılaştırması

| Alan | ReviewBridge kodunda görülen | Rakiplerde görülen | Öncelik / karar |
|---|---|---|---|
| Kaynak kapsamı | Google Maps ve Trustpilot | Trustmary ve EmbedSocial daha geniş yorum toplama seçenekleri sunuyor; Elfsight çeşitli platform yorumlarını tek widget'ta topluyor | P2; erişim, saklama ve silme koşulu doğrulanmadan yeni connector eklenmez |
| Widget yerleşimi | Liste, grid, carousel, masonry ve rating özeti | Slider, rating özeti ve çeşitli kart düzenleri | Temel fark kapandı; floating banner açık |
| Filtreleme | Yazısız yorum filtresi, yıldız/tarih/kelime/sıralama | Yıldız, anahtar kelime ve kötü yorumları hariç tutma seçenekleri | P1; temel fark kapandı |
| Moderasyon | Widget başına gizle/sabitle | Görünür yorumları seçme, gizleme ve sabitleme | P1; kapandı |
| Tasarım | Açık/koyu/minimal, renk, başlık, avatar/tarih, locale, alan adı, font, kart aralığı ve köşeler | Boşluk ve yazı tipi kontrolü de var | Temel fark kapandı |
| Analitik | Günlük görüntülenme, kaynak/CTA tıklaması ve CTR | Daha ayrıntılı entegrasyon olayları ve A/B testleri | P1/P2; anonim temel sayaç kapandı, varyant deneyi trafik bekliyor |
| Yorum toplama | Harici kaynaklardan gösterim | Anket, memnuniyet toplama ve AI özetleme/analiz | P2; ayrı ürün kolu, widget iyileştirmelerinden sonra |
| Ajans kullanımı | Tek kullanıcı planında sınırsız kaynak vaadi | Çoklu marka/site, müşteri alanları ve ekip/roller | P2; tenant izolasyonu olmadan ajans çalışma alanı sunulmamalı |
| Kurulum | Kopyalanabilir script | Platforma özel kılavuzlar ve daha fazla embed senaryosu | P1/P2; kurulum doğrulaması ve platform rehberleri |
| Operasyon | Elle sync, kilit, sınırlı otomatik yenileme ve hata geçmişi | Otomatik veri yenileme ve destek akışları | Kaynak bazlı retry/backoff eklendi; cron günlük olduğu için gerçek retry gecikebilir, sık cron/kuyruk ayrıca planlanmalı |

### Araştırma kaynakları

- [Trustmary özellikleri](https://trustmary.com/key-features/) ve [web sitesine yorum ekleme](https://trustmary.com/add-reviews-to-website/).
- [Elfsight Reviews özellikleri](https://elfsight.com/all-in-one-reviews-widget/features/), [yorum filtreleme](https://help.elfsight.com/article/169-how-to-exclude-bad-reviews-from-elfsight-reviews-widget), [yorum toplama](https://help.elfsight.com/article/1803-how-to-collect-reviews-on-your-website-with-all-in-one-reviews-widget), [Google Analytics olayları](https://community.elfsight.com/t/reviews-track-user-interactions-with-your-widget-using-google-analytics-integration/147790).
- [EmbedSocial](https://embedsocial.com/): çok kaynaklı sosyal kanıt ve embed ürün ailesi.
- [TrustMRR hakkında](https://trustmrr.com/about) ve [API belgeleri](https://trustmrr.com/docs/api/list-startups): doğrudan widget rakibi değil, pazar/ürün keşfi örneği.
- [Google Places Place Details belgesi](https://developers.google.com/maps/documentation/places/web-service/legacy/details): Google API yorum sınırlarını kontrol etmek için; kullanılan güncel veri yolu ayrıca incelenmeli.
- [Lemon Squeezy webhook rehberi](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks), [tekrar denemeler](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests) ve [imza doğrulama](https://docs.lemonsqueezy.com/help/webhooks/signing-requests).

## Uygulama aşamaları ve sıralı teslimatlar

| Aşama | İçerik | Çıktı / doğrulama |
|---|---|---|
| 0 | Fail-open ödeme webhook'unu kapat, plan eşleşmesini doğrula, Trustpilot kaynak ekleme hatasını başarı gibi kaydetmeyi durdur, kritik testleri başlat | Hatalı/imzasız webhook reddedilir; başarısız kaynak anlaşılır hata verir |
| 1 | Kaynak erişim şartı kaydı, provider adapter sözleşmesi, review ID, sync lock ve hata durumları | Kaynak başına veri kaynağı/güncellik ve güvenli retry |
| 2 | Günlük/konfigüre otomatik sync, Vercel Cron dispatcher, backoff ve izleme | Kullanıcı butonsuz güncellenir; paralel cron duplicate oluşturmaz |
| 3 | Rating/keyword/date filtreleri ve hide/pin moderasyonu | Filtreler server'da ve preview ile aynı şekilde uygulanır |
| 4 | List/grid/carousel, stil ayarları, embed locale ve erişilebilir önizleme | Eski embed uyumlu kalır; mobil/klavye testleri geçer |
| 5 | Widget events, dashboard views/clicks/CTR, gizlilik ve abuse sınırları | Kişisel veri toplamadan ölçüm yapılır |
| 6 | Install guide/onboarding, çoklu widget ve agency brand/workspace modeli | Kurulum baştan sona anlaşılır ve tenant izolasyonu testli |
| 7 | Yalnızca yetkili olduğu doğrulanmış yeni platform connector'ları | Her connector için contract test, refresh/delete ve attribution |
| 8 | Plan/pricing tek kaynağı, e-posta bildirimleri, destek/status/docs | Satış metni gerçek ürüne ve faturalamaya eşleşir |
| 9 | CI, güvenlik/erişilebilirlik/performance denetimi, production smoke ve runbook | Release checklist ve izlenebilir hata müdahalesi |

## Çalışma kuralları

- Her aşamayı küçük ve incelenebilir değişiklik olarak teslim et; kod, test, migration ve kullanıcıya görünen metin birlikte güncellensin.
- Neon şema değişiklikleri migration dosyasıyla yönetilecek, önce izole/preview veritabanında sınanacak. Production migration/deploy ayrı yayın adımıdır.
- Yeni kaynak eklemeden önce yasal/teknik erişim ve veri silme şartları doğrulanacak.
- Her aşama sonrası lint/build ve ilgili otomasyon testleri çalıştırılacak; test yoksa o aşamada anlamlı test eklenecek.
- Kullanıcıdan her dosya için onay istenmeyecek; önemli aşama tamamlandığında kısa değişiklik özeti verilecek. Üretim veritabanı/vercel production gibi dış etkili adım gerekiyorsa yayın öncesi somut değişiklik ve sonucu gösterilecek.

## Durum

- [x] Kapsamlı gap envanteri oluşturuldu; bu dosya artık tamamlananları ve gerçek dış bağımlılıkları aynı listede izliyor.
- [x] Aşama 0'ın kod ve Neon işleri: fail-closed/idempotent Lemon webhook, mevcut abonelik guard alanı, review ID, sync hataları, hoş geldin e-posta guard'ı, server-side plan limitleri. Üretimde Lemon gerçek variant ID'lerinin ayarlanması işletme hesabında yapılmalı.
- [x] Aşama 1'in uygulanabilir altyapısı: stable provider ID, atomik sync lock, arka plan Apify işleri, durum callback'leri, opt-in daily sync, attribution ve freshness.
- [x] Aşama 3–6'nın uygulanabilir widget işleri: filtre/sort, hide/pin, list/grid/carousel, renk/locale, günlük toplu metrikler, onboarding/kurulum, multi-widget, domain allowlist.
- [x] Aşama 9'in yerel otomasyonu: test/lint/build GitHub Actions; privacy/ops docs.
- [x] Önceki rekabet yol haritası kodu ve düzeltmeler PR #11 ile main'e alındı; Vercel production deployment hazır oldu ve canlı ana sayfa/kontrol paneli doğrulandı.
- [ ] **Canlı servis ayarları:** Lemon Squeezy'deki Pro/Agency variant ID'lerini Vercel'e ekle; operasyon dosyasındaki tüm gerekli production değişkenlerini doğrula; Apify kullanım/bütçesini ve Production Cron loglarını denetle. Kaynak başına auto-sync kullanıcı tarafından açılmalı.
- [ ] **Sağlayıcı ve hukuk:** Google/Trustpilot veri erişimi, gösterim/atıf, saklama ve silme kurallarını gerçek kullanılan Apify aktörleri ve hesap koşulları üzerinden doğrula; gizlilik/şartlar metnini hukuk uzmanına kontrol ettir. Başka platformları bu doğrulamadan önce açma.
- [x] **Eşitleme dayanıklılığı:** DB'de izlenen, 15 dk/1 saat/6 saat artan gecikmeli ve en fazla üç retry eklendi; Apify başarısızlığı/işleme hatası/takılmış iş retry kuyruğuna girer. Günlük cron gerçek retry zamanını geciktirebilir; ayrıca dağıtık kuyruğa ve dış alarma geçilmedi.
- [x] **Widget paritesi:** ortalama puan rozeti, masonry, font, kart boşluğu ve köşe ayarları preview ve embed'e eklendi. Gerçek browser mobil/klavye otomasyon testi hâlâ gerekiyor.
- [~] **Test ve operasyon:** health endpoint'i, retry ve kaynak URL birim testleri, herkese açık akışlar için Playwright E2E, Google Maps/Trustpilot kurulum ve sorun giderme kılavuzları eklendi. Provider/sync entegrasyon testleri, widget embed E2E, dış hata/uptime alarmı ve test hesaplı üretim smoke testi hâlâ gerekli.
- [ ] **İleri ürün işleri:** agency çalışma alanı ve ekip rolleri, e-posta bildirim tercihleri, anket/yorum toplama ve AI analizi, A/B deneyleri, ek platform connector'ları, herkese açık durum sayfası/SLA. Anket/AI ve yeni kaynaklar ürün/sağlayıcı kararı; A/B gerçek trafik; workspace rol modeli ayrı tasarım ister.
- [ ] **Plan/faturalama eşlemesi:** Uygulama plan metni ve fiyatları ortak kod sabitinden geliyor; Lemon Squeezy ürün/variant fiyatlarının aynı olduğuna panel üzerinden bakılmalı.
