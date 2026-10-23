# Lemon test modundan canlı satışa geçiş

Bu belge **şimdi çalıştırılacak bir migration değildir**. ReviewBridge hâlâ test modunda. Gerçek ödeme açılacağı gün, canlı Lemon ürünleri ve anahtarları doğrulandıktan sonra uygulanır.

1. Neon production yedeğini alın ve geri yükleme yolunu doğrulayın. Lemon test aboneliklerini ve bağlı kullanıcı sayısını salt okunur sorguyla kaydedin:

   ```sql
   SELECT count(*) AS test_subscriptions
   FROM public.users
   WHERE billing_test_mode IS TRUE AND lemonsqueezy_subscription_id IS NOT NULL;
   ```

2. Lemon'da canlı Pro/Ajans variant ID'lerini, fiyatları, mağaza kimliğini, webhook olaylarını ve **canlı** imza anahtarını ayrı ayrı doğrulayın. Vercel Production'da `BILLING_MODE=live`, canlı API anahtarı, canlı variant ID'leri ve canlı webhook imza anahtarını aynı yayın için ayarlayın. Test checkout URL'lerini kullanmayın. Yayın bitene dek eski test abonelikleri nedeniyle `/api/health` 503 dönebilir; bu tasarlanmış bir geçiş alarmıdır.

3. Yeni live yayın hazır olduğunda Neon production'ın **doğrudan** bağlantısında aşağıdaki tek atomik ifadeyi uygulayın. Bu işlem yalnızca test aboneliği alanlarını sıfırlar; kaynaklar, yorumlar, widget ayarları ve geçmiş webhook günlüğü korunur. Önce production verisinden üretilmiş geçici Neon dalında aynı ifadeyi deneyin.

   ```sql
   WITH changed AS (
     UPDATE public.users
     SET plan = 'free',
         lemonsqueezy_subscription_id = NULL,
         billing_status = NULL,
         billing_test_mode = NULL,
         billing_store_id = NULL,
         billing_customer_id = NULL,
         billing_variant_id = NULL,
         billing_updated_at = NULL,
         billing_ends_at = NULL,
         billing_trial_ends_at = NULL,
         billing_renews_at = NULL,
         billing_past_due_since = NULL,
         billing_checked_at = NULL,
         billing_reconcile_attempted_at = NULL,
         billing_checkout_url = NULL,
         billing_checkout_expires_at = NULL,
         billing_checkout_claim = NULL,
         billing_checkout_plan = NULL,
         billing_event_rank = 0
     WHERE billing_test_mode IS TRUE
     RETURNING id
   )
   UPDATE public.widgets AS w
   SET user_plan = 'free'
   FROM changed
   WHERE w.user_id = changed.id;
   ```

4. İlk sorgu artık `0` dönmeli; `/api/health` HTTP 200 olmalı. Eski test hesabı Free görünmeli ama eski kaynakları ve widget'ları durmalı. Yeni live checkout yalnızca canlı variant'a gitmeli. Canlı webhook imzası doğrulanıp doğru kullanıcıya hak verdikten sonra küçük bir gerçek ödeme ve iptal/dönem sonu senaryosu ayrı, işlem anı onayıyla doğrulanır.

`lib/billing-state.js` ve `lib/billing-entitlement.js` geçiş sırasında eski test haklarını güvenli biçimde Free'ye düşürür. Bunlar test aboneliği kimliğini kendiliğinden silmez; yeniden satın alma yolunu açmak için 3. adım gerekir. Live moda tek başına geçip bu adımı atlamayın.
