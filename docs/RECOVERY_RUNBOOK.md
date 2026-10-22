# Veri kurtarma ve hesap silme

## 21 Ekim 2026 geri yükleme provası

Production public şeması PostgreSQL 18.6 pg_dump ile alındı; Windows kullanıcı
profiliyle DPAPI şifrelendi. Şifreli kopya çözülerek production'dan ayrı,
`br-muddy-glade-bay09bbt` test dalındaki boş bir veritabanına pg_restore ile
yüklendi. Bütün COPY satırları ve sequence değerleri tekrar dışa aktarılarak
karşılaştırıldı: eşleşti. İndeks/constraint oluşturma hatasında restore durur.

- Kanıt zamanı: 2026-10-21T20:14:11Z.
- Şifreli dosya: `backups/neon-20261021/public-20261021-231330.dump.dpapi`
  (proje üst klasöründe; Git'e eklenmez).
- SHA-256: `C36690447A6703184461106DA686851264C5CBEBFF8325D89B7F48AFE483CDC5`.
- Tekrar çalıştırılabilir araç: `scripts/backup-restore-rehearsal.ps1`.
- Araç production'a restore yapmaz. Sabit üretim/test host kontrolü vardır.
- Test dalı 22 Ekim'de sona erer; yeni prova için yeni izole dal seçilmelidir.

Bu bir **yerel, sağlayıcıdan bağımsız geri yükleme provasıdır**. Otomatik,
cihaz dışı felaket yedeği değildir. DPAPI aynı Windows kullanıcı profilini
gerektirir; bilgisayar/profil kaybolursa bu kopya tek başına yeterli olmaz.
Neon Auth kimlikleri bu public şema yedeğine dahil değildir.

## Gerçek kurtarma öncesi

1. Yazmaları ve cron'ları durdur; mevcut bozuk veritabanını da koru. Doğrudan
   production üzerine restore etme. Önce boş, ayrı hedefte prova yap.
2. Son yedekten sonra gelen silme isteklerinin güncel `account_deletions`
   kayıtlarını ayrıca güvenceye al. Sadece eski yedeğin silme günlüğüne güvenme.
3. Public şemayı geri yükle; indeksleri, constraint'leri, uygulama migration'larını
   ve sınırlı runtime rolünün izinlerini doğrula.
4. Güncel silme günlüğünü hedefe birleştir. `auth_user_id` için
   `sha256('reviewbridge:deletion:' || auth_user_id)` değeri günlükte olan
   kullanıcıların geri gelmiş uygulama verilerini kaldır. Bunu yazmalar
   açılmadan, ayrı hedef üzerinde yap. Yarım kalan kimlik silmelerini koru.
5. Neon Auth ayrı yönetilir: eski kimlik/oturum yedeğini körlemesine geri yükleme.
   Oturumları geçersizleştirme ve kimlik tutarlılığı için sağlayıcı prosedürünü
   uygula. Eski doğrulanmış e-posta tek başına yeni kimliği eski veriye bağlamaz.
6. Lemon aboneliklerini sağlayıcıdan yeniden karşılaştır; eski ücretli hakları
   doğrudan güvenilir kabul etme. Checkout linklerini/rezervasyonlarını geçersiz
   kıl; iptal edilmiş aboneliği yeniden etkinleştirme.
7. Kaynak/yorum/widget bütünlüğü, iki hesaplı izolasyon, giriş ve export testleri
   geçtikten sonra bağlantıyı değiştir ve izlemeyi aç.

## Kesilen hesap silme

Abonelik iptali doğrulanmadan uygulama verisi silinmez. Açık checkout süresi
dolmadan veya kontrol edilen abonelik değişmişse silme durur. Uygulama verisi
ve silme günlüğü tek transaction'dadır. Kimlik silme ayrı servis çağrısıdır;
başarısızlıkta günlük kalır ve girişten sonra `/account-deletion` açılır.
Bu ekran yalnız oturumun kendi kimliğini işleyebilir. E-posta doğrulaması
gönderilmesi silme başarısı sayılmaz. Aynı kimlik tekrar profil oluşturamaz.

Sağlayıcı hesabı sildikten sonra yanıt veya son DB yazması kaybolursa günlük
belirsiz kalabilir. Operatör kimliğin gerçekten bulunmadığını doğrulamadan
günlüğü tamamlandı işaretlememelidir. Bu durum otomatik başarı olarak sunulmaz.

## Bakım işi alarmları

`maintenance_job_health` iki günlük görevin gerçek sonucunu saklar. Başarısız
yanıt, beş dakikayı aşan takılı çalışma veya 36 saattir başarılı çalışmama
`/api/health` yanıtını 503 yapar. UptimeRobot bu adresi beş dakikada bir izler.
İlk kurulumda 36 saat başlangıç payı vardır; bu, görevin çalıştığının kanıtı değildir.
Alarmda Vercel Cron Jobs üzerinden ilgili çalışmanın logunu incele, nedenini
düzeltip görevi yeniden çalıştır. Tabloyu elle başarılıya çevirme.
İki görevin `succeeded_at` değerini ve health yanıtını doğrula.
22 Ekim kaydı: kullanıcı UptimeRobot test e-postasının ulaştığını doğruladı.

## Açık operasyon işleri

- Düzenli, cihaz dışı şifreli yedek ve bağımsız kurtarma anahtarı saklama.
- Yedek saklama süresi, sahipliği ve dönemsel prova takvimi.
- Kimlik servisi dahil felaket kurtarma ve güncel silme günlüğünün ayrı kopyası.
- Kesintiyle kalan yerel düz metin dosyalarının temizliği: otomatik onay denetimi
  temizlik komutunu engelledi; temizlenmiş kabul edilmemelidir.
