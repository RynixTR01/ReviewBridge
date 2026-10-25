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
Neon Auth kimlikleri aynı veritabanının `neon_auth` şemasındadır ve bu
`--schema=public` yedeğine dahil değildir. Production sahibi rolünün bu şemaya
okuma erişimi doğrulandı; 21 Ekim'deki provada `neon_auth` dışa aktarımı ve
geri yükleme yapılmadı. Neon dalı/snapshot'ı kimlik verisini kopyalasa
bile sağlayıcıdan bağımsız bir felaket yedeği sayılmaz.

## 23 Ekim 2026 tam şema provası

`scripts/backup-neon-full.mjs` PostgreSQL 18.6 araçlarıyla production'ın
`public` ve `neon_auth` şemalarını yalnızca bellekte custom-format arşive aldı.
Arşiv AES-256-GCM ile şifrelendi; rastgele anahtar aynı Windows kullanıcı
profiline bağlı DPAPI dosyasına sarıldı. **Düz metin arşiv diske yazılmadı.**
Şifreli kopya açılarak production'dan türetilmiş geçici dalın boş
`rb_restore_1792741141028` veritabanına geri yüklendi. Bütün COPY satırları ve
sequence değerleri eşleşti. Ayrıca kaynak/hedef sayımları: `neon_auth.user` 3,
`neon_auth.session` 12, `neon_auth.account` 3, `public.sources` 9,
`public.reviews` 340 — tamamı eşleşti.

- Kanıt zamanı: 2026-10-23T07:39:26Z.
- Geçerli şifreli kopya: `backups/neon-20261023-full/full-2026-10-23T07-37-51-540Z.rbbackup`
  (proje üst klasöründe; Git'e eklenmez).
- Anahtar dosyası: aynı ad + `.key.dpapi`.
- SHA-256: `16e6e89f117ab29888b06f51ccdb9f75fc0872011bd9ac9020e703be2b386144`.
- Makinece okunur kanıt: aynı ad + `.proof.json`.
- Geçici dal `br-calm-hall-ba5pfw3x` 23 Ekim 21:00 UTC'de sona erer.
- Bu klasörde önceki başarısız denemelerden kalan iki **şifreli ama doğrulanmamış**
  kopya da vardır; kurtarma için yalnız yukarıdaki kanıtlı dosyayı kullan.

Bu, Neon Auth verisinin **veritabanı düzeyinde** kurtarılabildiğini kanıtlar;
Neon Auth servis ayarları/OAuth yönlendirmeleri, oturum geçersizleştirme ve
uygulama URL'leri yeni ortamda ayrıca doğrulanmalıdır. DPAPI dosyası aynı
Windows profili olmadan açılamaz. **Cihaz dışı bağımsız yedek hâlâ yoktur.**
Sonraki adım şifreli kopyayı ve bağımsız kurtarma anahtarını ayrı, güvenli
yerlerde saklayıp başka bilgisayarda periyodik geri yükleme provası yapmaktır.

## Taşınabilir yeni yedek formatı

Yeni tam yedekler artık `RB_BACKUP_PASSPHRASE_FILE` gerektirir. Dosyada en az
32 karakterlik rastgele bir kurtarma sırrı bulunmalıdır; bir parola cümlesi
yerine 32 rastgele baytın Base64 gösterimini kullan. Dosyayı proje klasörü,
Git deposu, yedek klasörü ve aynı bulut hesabındaki yedek konumundan ayrı
sakla. Sırrı komut satırı argümanına veya sohbet mesajına koyma. Bu dosya
kaybolursa taşınabilir anahtar açılamaz.

Yeni `.rbbackup` arşivindeki veri hâlâ AES-256-GCM ile şifrelidir. Yanına
`.key.portable` (scrypt ile türetilmiş ayrı AES-256-GCM anahtarıyla sarılmış
arşiv anahtarı) yazılır. Windows'ta ek olarak `.key.dpapi` üretilir. Başka
bilgisayarda `.rbbackup`, `.key.portable` ve **ayrı saklanan** kurtarma sırrı
gereklidir; DPAPI dosyası gerekli değildir. Geri yükleme provasını ayrı Neon
dalında çalıştırırken `RB_BACKUP_RESUME_PATH` ve
`RB_BACKUP_PASSPHRASE_FILE` ayarlanır. Betik mevcut production hostuna
restore yapmayı reddeder.

Her çalışmada `.proof.json` içindeki `all_copy_rows_and_sequences_match=true`
ve arşiv SHA-256 değerini kaydet. Yedek ile taşınabilir anahtar dosyasını
cihaz dışına **birlikte**, kurtarma sırrını ise farklı bir güvenli yere koy.
Başka bilgisayarda arşiv ve anahtar dosyalarını açıp izole dalda geri yükleme
provası geçmeden bunu felaket kurtarması tamamlandı sayma. Güncel hesap silme
günlüğünün ayrı korunması ve oturum/OAuth doğrulaması hâlâ zorunludur.

### 25 Ekim 2026 taşınabilir anahtar provası

Production'dan `public` ve `neon_auth` birlikte alındı. Şifreli arşiv
taşınabilir anahtarla açıldı; geçici `br-holy-voice-ba8ypy6p` Neon dalındaki
boş `rb_restore_1792946555900` veritabanına yüklendi. Bütün COPY satırları
ve sequence değerleri eşleşti. Dal 26 Ekim 2026 16:41 UTC'de sona erecek.

- Arşiv: `backups/neon-20261025-portable/full-2026-10-25T16-42-35-841Z.rbbackup`
  (Git deposunun üst klasöründe; Git'e eklenmez).
- SHA-256: `d6adfe5c5e0dc878471dcc6bf4d8cabf860f1c2d728d2583877643a1edcb4fd4`.
- Aynı adla `.key.portable`, `.key.dpapi` ve `.proof.json` dosyaları var.
- Arşiv, `.key.portable` ve kanıt dosyasının kopyası yerel OneDrive klasörüne
  alındı; üç dosyanın kopya hash'i kaynakla eşleşti. OneDrive işlemi çalışıyor,
  fakat bulut hesabından indirilip açılması **henüz doğrulanmadı**.
- Kurtarma sırrı proje ve OneDrive klasörü dışında, yalnız bu cihazdaki
  `Documents/ReviewBridge-Recovery/portable-backup-passphrase.txt` dosyasında.
  Dosyanın ACL'si yerel kullanıcıya okuma izni verecek şekilde sınırlandı.
  Sırrın ayrı bir cihaz dışı güvenli saklama yeri ve ikinci makine provası
  eksik olduğundan cihaz kaybı senaryosu kapandı sayılmaz.

### 25 Ekim 2026 eski düz metin dökümlerinin korunması

Eski Supabase public dökümü, şema SQL dosyası ve iki 21 Ekim Neon public
dökümü `scripts/legacy-backup-vault.mjs seal` ile ayrı ayrı şifrelendi.
Her `.rbsealed` dosyası bağımsız salt ve nonce kullanır; arşiv anahtarı aynı
taşınabilir kurtarma sırrıyla sarılır. Ayrı `verify` çalışması her dosyayı
yalnızca bellekte açıp özgün SHA-256 kanıtıyla karşılaştırdı. Dört şifreli
dosya ve dört kanıt dosyası yerel OneDrive klasörüne kopyalandı; kopyaların
SHA-256 değerleri eşleşti. **Bulut hesabından indirme henüz denenmedi.**

Bu sekiz yerel ve sekiz OneDrive-klasörü dosyası doğrulandıktan sonra yalnızca
dört özgün düz metin dosya kaldırıldı. `backups/` ağacındaki `.dump`, `.sql`,
`.tmp` ve `.plain` uzantılı dosya sayısı sıfır olarak tekrar doğrulandı.
Geri yükleme gerekirse `RB_BACKUP_VAULT_ROOT` ile yedek kökünü,
`RB_BACKUP_PASSPHRASE_FILE` ile ayrı saklanan kurtarma sırrını ayarla; önce
`node scripts/legacy-backup-vault.mjs verify <dosya.rbsealed>` çalıştır.
Yalnızca bilinçli geri yükleme sırasında `restore <dosya.rbsealed>
<açık-çıktı-yolu>` kullan; `restore` yeni bir düz metin dosya oluşturur.

Tekrarlama: PostgreSQL'in resmî Windows `pg_dump.exe`/`pg_restore.exe`
araçlarını kur; production'dan türetilmiş, süreli ve yalıtılmış bir Neon dalı
oluştur. `RB_BACKUP_SOURCE_URL`, `RB_BACKUP_AUDIT_URL`,
`RB_BACKUP_AUDIT_HOST`, `RB_BACKUP_AUDIT_BRANCH`, `RB_POSTGRES_BIN`,
`RB_BACKUP_OUTPUT_DIR` ve `RB_BACKUP_PASSPHRASE_FILE` değişkenlerini yalnızca
yerel işlem ortamında ayarla,
sonra `node scripts/backup-neon-full.mjs` çalıştır. Araç production'a
geri yükleme yapmayı reddeder ve yeni boş veritabanı oluşturur. Var olan
şifreli kopyayı aynı dalda tekrar sınamak için `RB_BACKUP_RESUME_PATH` ayarlanır.

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
5. `neon_auth` şeması aynı Postgres dalında yer alır. `public` tek başına
   kurtarılırsa kimlikler ve kullanıcı kayıtları ayrışabilir; girişleri açma.
   Kimlik verisini eşzamanlı güvenli yedekten ayrı hedefe geri yükleyip
   sağlayıcının oturum geçersizleştirme prosedürünü uygula. Eski oturumları
   körlemesine etkinleştirme; yalnız e-posta eşleşmesi eski hesabı bağlamaz.
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
- Kimlik servisi dahil geri yükleme provası geçti; oturum/OAuth ayarları ve
  güncel silme günlüğünün ayrı kopyasıyla tam felaket kurtarma henüz test edilmedi.
- 25 Ekim'deki şifreli kopya ve hash doğrulaması sonrasında dört eski düz metin
  döküm kaldırıldı. Yedek kökündeki düz metin döküm taraması sıfır sonuç verdi.
