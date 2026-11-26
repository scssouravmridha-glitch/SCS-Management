# SCS Management — A to Z ডিপ্লয়মেন্ট নোট (Supabase + Netlify বা GitHub Pages)

> এই ফাইলটা প্রতিবার কোড বদলানোর পর আপডেট রাখা হয়। নতুন অ্যাকাউন্টে শুরু থেকে সেটআপ করতে শুধু এই নোট অনুসরণ করুন।
> শেষ আপডেট: 2026-11-27 (ডাটাবেস ভার্সন 6)

**কাঠামো (v5 থেকে):**
- **Supabase** = ডাটাবেস, লগইন, ফাইল, রিয়েল-টাইম, আর সার্ভারের সব কাজ (Edge Function `scs-api`: SMS/ইমেইল কোড, পুশ নোটিফিকেশন, কাস্টমার SMS)।
- **ওয়েবসাইট** = শুধু সাধারণ ফাইল। তাই যেকোনো জায়গায় রাখা যায়: **Netlify** (অপশন ১) বা **GitHub Pages** (অপশন ২), এমনকি দুটোতেই একসাথে।
- সব অ্যাপ রিয়েল-টাইম: কেউ অর্ডার, হাজিরা, রিপোর্ট বা ছুটির আবেদন দিলে বা বদলালে সবার স্ক্রিনে সাথে সাথে আসে।

## 🔄 আপডেট লগ — প্রতিবার কী Run/আপলোড করতে হবে

SQL কোড সবসময় `supabase/schema.sql` ফাইলে থাকে। এটা পুরোটা আবার Run করা নিরাপদ, আগের ডাটা মুছে না।

| তারিখ | SQL Run লাগবে? | কী আপলোড/করবেন | কী বদলেছে |
|---|---|---|---|
| 2026-11-27 (v6, ধাপ ১-এর প্রথম অংশ) | **হ্যাঁ** — পুরো `supabase/schema.sql` | সব ফাইল; নতুন `assets/gas/` ফোল্ডার, `file.html`, `tools/`; `apps/attendance/` ও `apps/chemical-order/` পুরো ফোল্ডার নতুন করে (পুরনো `backend.js` মুছে গেছে — GitHub থেকেও মুছুন); **`supabase/functions/scs-api/index.ts` বদলেছে → Supabase-এ scs-api এর কোড আবার পেস্ট করে Deploy (A3)** | **Apps Script ইঞ্জিন**: অ্যাপের আসল Code.gs + Index.html হুবহু চলে, Google Sheet/Drive এর জায়গায় Supabase। নতুন **Attendance** ও **Chemical Order** (Apps Script Source এর সর্বশেষ ভার্সন) ইঞ্জিনে; এমপ্লয়ি অটো-সিঙ্ক, অ্যাকাউন্ট দিয়ে লগইন, অ্যাডমিন = Admin Console পিন, নিজের হাজিরা শুধু নিজে, নতুন অর্ডারে নোটিফিকেশন, রিয়েল-টাইম। পুরো Google Sheet (.xlsx) একবারে আনা: Admin Console → Tools → Data migration। ⚠️ Monthly Report এখনো পুরনো ভার্সন — পরের ধাপে নতুন Report আসছে |
| 2026-11-25 (v5) | **হ্যাঁ** — পুরো `supabase/schema.sql` | সব ফাইল; নতুন `.github/workflows/github-pages.yml`, `.nojekyll`, `supabase/functions/scs-api/index.ts`। **নতুন একবারের কাজ: A3 (Edge Function scs-api ডিপ্লয়)**। `netlify/lib/` ফোল্ডার মুছে গেছে — GitHub থেকেও মুছে দিন | Netlify বা GitHub Pages যেকোনো জায়গায় ডিপ্লয়; সার্ভারের কাজ Supabase Edge Function-এ; SMS/ইমেইলের গোপন তথ্য ফাইলে নয়, Supabase Secrets-এ; সব অ্যাপ রিয়েল-টাইম (Chemical Order, Attendance, Monthly Report, Leave, Admin Console-এর ইউজার তালিকা) |
| 2026-11-15 (v4) | **হ্যাঁ** — পুরো `supabase/schema.sql` | সব ফাইল, বিশেষ করে `apps/leave/`, `netlify/functions/`, `index.html`, `admin.html`, `migrate.html`, `assets/scs-core.js`, `apps/chemical-order/` | নতুন অ্যাপ **SCS Leave Application**; ইমেইলে কোড; কাস্টমাইজ করা যায় এমন নোটিফিকেশন; ক্লক ইন/আউট রিমাইন্ডার; Activity Log-এ পিন/পাসওয়ার্ড লুকানো; Chemical Order হিস্ট্রি ফিল্টার ও মার্ক করে ডিলিট |
| 2026-11-13 (v3.1) | না | `admin.html`, `index.html`, `activity.html`, `assets/scs-core.js`, `assets/portal.css` | ইউজার "উধাও" হওয়া ঠিক, নতুন Users & access UI, টপ বারে 🕘 আইকন |
| 2026-11-13 (v3) | হ্যাঁ | সব ফাইল | SMS কোড দিয়ে অ্যাকাউন্ট/লগইন, অনুমোদন ঠিক, Employee ID বদলানো, টপ বারে হোম বাটন, Google Drive ব্যাকআপ |
| 2026-11-13 (v2) | হ্যাঁ | সব ফাইল | প্রোফাইল = এমপ্লয়ি, অ্যাডমিন পিন, নোটিফিকেশন, লোগো, Admin Console |

> ডাটাবেস আপডেট হয়েছে কি না: Admin Console খুললে উপরে লাল সতর্কবার্তা না এলে ঠিক আছে।
> SQL Run-এর পর "Success. No rows returned" দেখালেই সফল।

## যা যা লাগবে

| জিনিস | কোথা থেকে | কোথায় বসবে |
|---|---|---|
| Supabase **Project URL** | Supabase → Project Settings → Data API (বা API) | `assets/config.js` |
| Supabase **anon / publishable key** | Project Settings → API Keys | `assets/config.js` (এটা পাবলিক থাকার জন্যই তৈরি) |
| Supabase **service_role / secret key** (গোপন) | ওই একই পেজ | কোথাও বসাতে হয় না (Supabase Edge Function নিজেই পায়)। শুধু Netlify function ব্যবহার করলে Netlify env var-এ |
| SMS: এন্ডপয়েন্ট লিংক, API key, Sender ID | আপনার SMS কোম্পানি | Supabase → Edge Functions → **Secrets** (A4) |
| Gmail ঠিকানা + App Password | Google Account | Supabase → Edge Functions → **Secrets** (A4) |

> ⚠️ কোনো গোপন তথ্য (service_role key, SMS API key, Gmail পাসওয়ার্ড) **কখনো কোনো ফাইলে লিখবেন না।** GitHub Pages ফ্রিতে চালাতে repo পাবলিক রাখতে হয়, তখন ফাইলের সব কিছু সবাই দেখতে পায়।

---

## A. Supabase (ডাটাবেস + লগইন + সার্ভার)

> আগের Supabase প্রজেক্টই ব্যবহার করলে A1 বাদ দিন। ডাটা যেমন আছে তেমনই থাকবে।

**A1. নতুন প্রজেক্ট (শুধু একদম নতুন হলে)**
supabase.com → New project → Region: Singapore → নাম আর ডাটাবেস পাসওয়ার্ড দিয়ে Create।

**A2. ডাটাবেস তৈরি / আপডেট**
1. Database → **Extensions** → `pg_cron` আর `pg_net` চালু করুন (রিমাইন্ডার, অটো ব্যাকআপ আর অ্যাপ বন্ধ থাকলেও পুশের জন্য)।
2. SQL Editor → New query → `supabase/schema.sql` ফাইলের **পুরোটা** পেস্ট → Run → "Success" দেখাবে।
   কোড আপডেটের পর আবার Run করা নিরাপদ, আগের ডাটা মুছে যায় না।

**A3. সার্ভার ফাংশন `scs-api` ডিপ্লয় (একবার, আর ফাইলটা বদলালে আবার)**
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**।
2. Function name: `scs-api` (হুবহু এই নাম)।
3. এডিটরের সব লেখা মুছে প্রজেক্টের `supabase/functions/scs-api/index.ts` ফাইলের **পুরোটা** পেস্ট → **Deploy function**।
4. ফাংশনটা খুলে **Details / Settings** → **Enforce JWT verification** (Verify JWT) **বন্ধ** করুন → Save।
   এটা বন্ধ না করলে অ্যাকাউন্ট খোলার কোড যাবে না। ফাংশন নিজেই লগইন যাচাই করে, তাই বন্ধ রাখা নিরাপদ।
5. পরে আমি `index.ts` বদলালে আপডেট লগে লেখা থাকবে। তখন একই ফাংশনের Code ট্যাবে নতুন কোড পেস্ট করে আবার Deploy করবেন।

**A4. SMS আর ইমেইলের গোপন তথ্য (প্রথম দিন থেকেই কোড যাওয়ার জন্য)**
Supabase → Edge Functions → **Secrets** (বা Manage secrets) → Add new secret:

| Name | Value |
|---|---|
| `SMS_API_URL` | SMS পাঠানোর এন্ডপয়েন্ট লিংক (যেমন `https://bulksmsbd.net/api/smsapi`) |
| `SMS_API_KEY` | আপনার SMS API key |
| `SMS_SENDER_ID` | Sender ID / Masking ID |
| `SMS_PARAM_KEY`, `SMS_PARAM_MESSAGE`, `SMS_PARAM_TO`, `SMS_PARAM_SENDER` | (ঐচ্ছিক) SMS কোম্পানি কোন নামে তথ্য চায়। ডিফল্ট `api_key`, `msg`, `to`, `sender_id`। BulkSMSBD হলে: `api_key`, `message`, `number`, `senderid` |
| `SMTP_USER` | আপনার Gmail ঠিকানা |
| `SMTP_PASS` | Gmail **App Password** (১৬ অক্ষর): Google Account → Security → 2-Step Verification চালু → App passwords → নাম "SCS" → Create |

- পরে Admin Console → **SMS & Email** থেকে বদলানো যায়। সেখানে সেভ করা সেটিং সবার আগে ব্যবহার হয়।
- ইমেইল port 465 (SSL) দিয়ে যায়। Gmail-এ এটাই ডিফল্ট, অন্য কিছু বসাতে হয় না।
- ইমেইল কোড আপনার নিজের Gmail দিয়ে যায় (দিনে প্রায় ৫০০টা), তাই Supabase-এর "email rate limit" আর লাগে না।

**A5. লগইনের ঠিকানা (প্রতিবার সাইটের ঠিকানা বদলালে আবার করবেন)**
Authentication → URL Configuration:
- **Site URL** = আপনার মূল সাইট, যেমন `https://scs-xyz.netlify.app` বা `https://<github-নাম>.github.io/<repo-নাম>/`
- **Redirect URLs** → Add URL → প্রতিটা সাইটের জন্য একটা করে, শেষে `/**`:
  `https://scs-xyz.netlify.app/**` এবং/অথবা `https://<github-নাম>.github.io/<repo-নাম>/**`

**A6. ইমেইল কনফার্মেশন বন্ধ রাখা (সুপারিশ)**
Authentication → **Sign In / Providers** → **Email** → **Confirm email** = OFF → Save।
অ্যাকাউন্ট খোলা SMS বা ইমেইল কোড দিয়ে যাচাই হয়, আর অ্যাডমিন অনুমোদন ছাড়া কেউ কোনো অ্যাপে ঢুকতে পারে না।

**A7. (ঐচ্ছিক) Supabase-এর নিজের রিসেট ইমেইল**
শুধু SMTP সেট না থাকলে ব্যবহার হয়। Authentication → Emails → Templates → **Reset Password** → Message body:
```html
<h2>Reset your SCS Management password</h2>
<p>Your reset code:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Enter this code on the "Reset password" page, or click: <a href="{{ .ConfirmationURL }}">Reset password</a></p>
```

---

## B. কোডে Supabase কী বসানো

`assets/config.js`:
```js
SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbGciOi...',   // anon / publishable key (service_role না!)
```

---

## C. GitHub (দুই অপশনেই লাগে)

1. github.com → New repository।
   - শুধু **Netlify** ব্যবহার করলে: **Private** রাখুন।
   - **GitHub Pages** ব্যবহার করলে (ফ্রি অ্যাকাউন্টে): **Public** রাখতে হবে। কোনো ফাইলে গোপন তথ্য নেই, তাই সমস্যা নেই।
2. "uploading an existing file" (বা Add file → Upload files) → `SCS Management` ফোল্ডারের **ভেতরের সব কিছু** টেনে ছাড়ুন → Commit।
   - `config.js`-এ আসল URL আর anon key থাকতে হবে, নইলে সাইটে "Setup pending" দেখাবে।
3. `.github` ফোল্ডার আর `.nojekyll` ফাইল অনেক সময় টেনে ছাড়লে যায় না (নামের শুরুতে বিন্দু)। GitHub Pages ব্যবহার করলে দেখে নিন:
   - repo-তে `.github/workflows/github-pages.yml` না থাকলে: **Add file → Create new file** → নামের ঘরে `.github/workflows/github-pages.yml` লিখুন → প্রজেক্টের ওই ফাইলের লেখা পেস্ট → Commit।
   - `.nojekyll` না থাকলেও চলবে (workflow নিজেই বানায়)।

---

## D. অপশন ১ — Netlify

1. app.netlify.com → **Add new project → Import an existing project → GitHub** → অনুমতি দিন → repo বাছুন।
   - GitHub repo অন্য জিমেইলের অ্যাকাউন্টে থাকলেও চলবে। GitHub অনুমতির পেজে "Configure the Netlify app on GitHub" দিয়ে সেই repo-র access দিন।
2. Build settings: **Build command ফাঁকা**, **Publish directory `.`**। এগুলো `netlify.toml` নিজেই সেট করে দেয়।
3. Deploy। Environment variables **লাগে না** (সার্ভারের কাজ Supabase-এ)।
   - চাইলে বিকল্প হিসেবে Netlify function-ও চালাতে পারেন। Supabase-এর `scs-api` না পেলে সাইট নিজে থেকেই Netlify function ব্যবহার করে। এজন্য Environment variables-এ `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (আর চাইলে A4-এর SMS/SMTP নামগুলো) দিয়ে Trigger deploy করুন।
4. সাইটের ঠিকানা কপি করে **A5**-এ বসান।

**Credit বাঁচানো:** ফ্রি প্ল্যানে প্রতিটা production deploy-এ ১৫ ক্রেডিট খরচ হয় (মাসে ৩০০)।
অনেকগুলো ফাইল একবারে আপলোড/commit করুন, বারবার ছোট ছোট commit করবেন না।

---

## D2. অপশন ২ — GitHub Pages (ফ্রি, ক্রেডিটের ঝামেলা নেই)

1. repo → **Settings → Pages** → Build and deployment → **Source = GitHub Actions**।
2. repo-তে `.github/workflows/github-pages.yml` আছে কি না দেখুন (C ধাপ ৩)। থাকলে প্রতিবার commit করলেই সাইট নিজে থেকে আপডেট হয়।
   - প্রথমবার: **Actions** ট্যাব → "Deploy to GitHub Pages" → **Run workflow**।
   - সবুজ ✅ হলে সাইটের ঠিকানা Settings → Pages-এ দেখাবে: `https://<github-নাম>.github.io/<repo-নাম>/`
3. ঠিকানাটা **A5**-এ বসান।
4. শুধু ওয়েবসাইটের ফাইল প্রকাশ পায়। `supabase`, `netlify` ফোল্ডার আর `.md` নোট সাইটে যায় না (workflow বাদ দেয়)।

> একই repo থেকে Netlify আর GitHub Pages দুটোতেই একসাথে চালানো যায়। দুটোর ঠিকানাই A5-এ দিন।
> ফোনে "অ্যাপ" হিসেবে ইনস্টল আর পুশ নোটিফিকেশন যে সাইট থেকে চালু করবেন, সেই সাইটের জন্যই কাজ করবে।

---

## E. প্রথম Super Admin

1. সাইট খুলে নিজের ইমেইল দিয়ে **Create account** → (Confirm email চালু থাকলে ইমেইলের লিংকে কনফার্ম) → লগইন → প্রোফাইল ছবি দিন।
2. Supabase → SQL Editor → **New query** → নিচের কোড (শুরুতে `--` ছাড়া) পেস্ট করে নিজের ইমেইল বসিয়ে Run:
   ```sql
   insert into public.profiles (id, email, status, is_super_admin)
   select id, email, 'active', true from auth.users where lower(email) = lower('your-email@example.com')
   on conflict (id) do update set status = 'active', is_super_admin = true;
   ```
3. সাইটে রিফ্রেশ → ⚙️ → **Admin Console** দেখা যাবে।

আগের Supabase প্রজেক্ট রেখে শুধু Netlify বদলালে এই ধাপ লাগবে না, আগের Super Admin থেকে যাবে।

---

## F. Admin Console-এ প্রথম কাজ

1. **Apps & admin PINs** → প্রতিটা অ্যাপের ৪ সংখ্যার পিন বদলান (ডিফল্ট `2026`)।
2. **SMS & Email** → প্রথমে **Server check** চাপুন। "Server: Supabase Edge Function ✅" আর SMS/Email "configured" দেখাবে (A4 করে থাকলে)। তারপর Send test SMS / Send test email। এখানে সেভ করা সেটিং A4-এর চেয়ে আগে ব্যবহার হয়।
   - Server check-এ ❌ "Server function not found" দেখালে A3 করা হয়নি। "Verify JWT" লেখা এলে A3 ধাপ ৪ করুন।
   - টেস্ট SMS-এ "SMS provider: ..." error দেখালে মেসেজটা আপনার SMS কোম্পানির। API key, Sender ID বা ব্যালান্স চেক করুন।
   - SMS কাজ করলে নতুন অ্যাকাউন্ট খোলা, লগইন আর পাসওয়ার্ড রিসেট মোবাইল কোড দিয়েই হবে। ইমেইল লিমিটের সমস্যা আর থাকবে না।
3. **Logo** → দরকার হলে নতুন লোগো আপলোড করুন।
4. **Users & access** → "Waiting for your approval" কার্ডে **Approve & give access** চাপুন। পপআপে প্রতিটা অ্যাপে No access / User / Admin বেছে নিন, দরকার হলে Employee ID দিন, তারপর **Approve & save**। পরে যেকোনো ইউজারের উপর ক্লিক করলে একই পপআপে সব বদলানো যায়।
5. Chemical Order → Admin (পিন দিয়ে) → SMS Setup আর PDF & Letterhead আবার চেক করুন।
6. **Backup** → Google Drive অটো ব্যাকআপ (নিচে H দেখুন)।

---

## H. Google Drive অটো ব্যাকআপ (একবার সেটআপ)

এখানে সব অ্যাপের পুরো লাইফটাইম ডাটা একটা JSON ফাইলে যায়, আর সেটা দিয়েই রিস্টোর করা যায়।
ব্যাকআপ Supabase নিজেই সময়মতো পাঠায় (pg_cron + pg_net), তাই Netlify credit খরচ হয় না।

1. Google Drive-এ একটা ফোল্ডার বানান, যেমন "SCS Backup"। তার লিংক কপি করুন।
2. Admin Console → **Backup** → "One-time setup" খুলে **Copy Apps Script code** চাপুন। কোডে টোকেন আগেই বসানো থাকে।
   - ফাইলটা প্রজেক্টের `google-drive-backup/Code.gs`-এও আছে। সেটা ব্যবহার করলে TOKEN নিজে বসাতে হবে।
3. script.google.com → New project → কোড পেস্ট → ফাংশন **authorize** বেছে Run → অনুমতি দিন।
4. Deploy → **New deployment** → Web app → Execute as **Me** → Who has access **Anyone** → Deploy → **Web app URL** কপি করুন।
5. Admin Console-এ Drive ফোল্ডারের লিংক আর Web app URL বসিয়ে সময় বেছে নিন: প্রতি মিনিট, ঘণ্টা, দিন, ইত্যাদি। কয়টা ফাইল রাখবেন সেটাও দিন। তারপর **Save & schedule**।
6. **Send to Drive now** চাপুন। কয়েক সেকেন্ড পর **Refresh status**-এ ✅ 200 বা 302 দেখালে Drive-এ ফাইল চলে গেছে।
- "pg_net" বা "pg_cron" error এলে: Supabase → **Database → Extensions** → `pg_net` আর `pg_cron` চালু করে `schema.sql` আবার Run করুন।
- **রিস্টোর:** Admin Console → Backup → **Restore from file** → Drive থেকে নামানো JSON দিন। শুধু যেগুলো নেই সেগুলো যোগ হয়, আগের ডাটা বদলায় না।
  একদম নতুন Supabase প্রজেক্টে রিস্টোর করলে আগে ইউজারদের আবার অ্যাকাউন্ট খুলতে হবে। প্রোফাইল তখনই জোড়া লাগে, কারণ লগইন পাসওয়ার্ড ব্যাকআপে থাকে না।
- ছবি আর PDF Supabase Storage-এ থাকে, JSON-এ না।

---

## K. Apps Script ইঞ্জিন — অ্যাপ আপডেট ও নতুন অ্যাপ (v6)

কিছু অ্যাপ এখন "ইঞ্জিনে" চলে: অ্যাপের **আসল Apps Script কোড (Code.gs + Index.html) হুবহু** ব্রাউজারে চলে, শুধু Google Sheet / Drive / Properties এর জায়গায় Supabase।
এতে সব ফিচার আগের মতো থাকে, আর Apps Script-এ অ্যাপ বদলালে নতুন ভার্সন আনা খুব সহজ।

- ডাটা: প্রতিটা অ্যাপের "শিট" Supabase-এর `gas_sheets` টেবিলে, সেটিং `gas_props`-এ, ফাইল Storage-এ (`file.html` দিয়ে খোলে)।
- প্রতিটা পরিবর্তন Activity Log-এ অ্যাকাউন্টের নামে যায়: কোন শিটের কোন রো, আগে কী ছিল, পরে কী।
- দুজন একসাথে সেভ করলে ডাটা হারায় না (লক + ভার্সন চেক)। অন্য কেউ বদলালে সবার স্ক্রিন সাথে সাথে আপডেট হয়।
- **পুরনো ডাটা আনা:** পুরনো Google Sheet → File → Download → **Microsoft Excel (.xlsx)** → Admin Console → Tools → **Data migration** → "পুরো Google Sheet একবারে আনা"।
  অ্যাপের নিজের JSON ব্যাকআপ থাকলে অ্যাপের ভেতরের Restore দিয়েও আনা যায়।
- **Apps Script-এ অ্যাপ আপডেট করলে** (এটা আমি করি, আপনাকে শুধু নতুন কোড `Apps Script Source` ফোল্ডারে দিতে হয়):
  `.\tools\build-app.ps1 -Source "D:\Web App\Apps Script Source\<অ্যাপ>" -Key <app-key>`
  এটা `apps\<app-key>\`-এ Code.gs কপি করে আর Index.html এর সাথে অ্যাকাউন্ট/ইঞ্জিন জুড়ে দেয়। Apps Script Source ফোল্ডারে কিছু বদলায় না।
  অ্যাপ-ভিত্তিক সমন্বয় থাকে `apps\<app-key>\adapter.gs` (সার্ভার), `adapter.js` (পেজ), `patches.json` (UI-তে পিন/লগইন সংযোগ)।

| অ্যাপ | কোথায় চলে | পুরনো ডাটা আনা |
|---|---|---|
| Attendance | ইঞ্জিন (v6) | পুরো Google Sheet (.xlsx) |
| Chemical Order | ইঞ্জিন (v6) | পুরো Google Sheet (.xlsx), অথবা অ্যাপের Admin → Backup → Restore (JSON) |
| Leave Application | Supabase টেবিল (v4) | Data migration → Leave (CSV) |
| Monthly Report | পুরনো ভার্সন — পরের ধাপে নতুন Report ইঞ্জিনে | — |

## I. SCS Leave Application (নতুন অ্যাপ)

1. `schema.sql` Run করলে অ্যাপটা নিজে থেকেই হোম পেজে আসে (🌴)। প্রতিটা অনুমোদিত এমপ্লয়ি অ্যাকাউন্ট কর্মী হিসেবে যোগ হয়।
2. Admin Console → Users → কর্মীর উপর ক্লিক → **Leave Application: User বা Admin** দিন।
   - **User**: শুধু নিজের জন্য *New Application* দিতে পারে, ড্যাশবোর্ড আর লিভ রেকর্ড দেখে।
   - **Admin**: অ্যাডমিন পিন দিয়ে Admin খুলে অ্যাপ্রুভ / রিজেক্ট / এডিট, কর্মীর কোটা, ছুটির ধরন, অ্যাপ্রুভার, সিগনেচার।
3. অ্যাডমিন পিন: Admin Console → Apps & admin PINs → Leave Application (ডিফল্ট `2026`)।
4. **পুরনো Google Sheet থেকে ডাটা আনা:**
   - পুরনো শিট খুলে প্রতিটা ট্যাব আলাদা করে File → Download → **CSV** করুন: `Employee List`, `Leave Applications`, `App Config`, `Signatures`।
   - Admin Console → Tools → **Data migration** → "Leave Application (CSV)" অংশে ফাইলগুলো দিন → *Leave ডাটা ইমপোর্ট করুন*।
   - একই LA ID আবার এলে আপডেট হয়, ডুপ্লিকেট হয় না। পুরনো আবেদনের জন্য নোটিফিকেশন যায় না।
   - যার SCS অ্যাকাউন্ট আছে: Admin Console → Users → তার Employee ID শিটের ID-র মতো করে দিন (যেমন `201903`)। পুরনো ছুটির ইতিহাস নিজে থেকেই তার অ্যাকাউন্টে জুড়ে যাবে।
5. `apps/scs-leave-application/` ফোল্ডারটা শুধু পুরনো সোর্স (রেফারেন্স)। আপলোড করলেও ক্ষতি নেই, ওয়েবে খোলা যায় না।

## J. নোটিফিকেশন ও রিমাইন্ডার

- Admin Console → **Notifications & Log**: প্রতিটা নোটিফিকেশন চালু/বন্ধ আর কে পাবে (সব ইউজার / অ্যাপের Admin / শুধু Super Admin / শুধু সংশ্লিষ্ট ব্যক্তি)।
  - নতুন অ্যাকাউন্ট → Super Admin। অ্যাকাউন্ট অনুমোদন → সেই ব্যক্তি।
  - নতুন ছুটির আবেদন → Leave অ্যাপের Admin। অ্যাপ্রুভ/রিজেক্ট → শুধু আবেদনকারী।
  - নতুন অর্ডার → Chemical Order-এর সব ইউজার।
  - **Clock IN রিমাইন্ডার** অফিস শুরুর সময়ে, **Clock OUT রিমাইন্ডার** অফিস শেষের সময়ে। সময় Attendance অ্যাপের Office Settings থেকে আসে।
    যে এখনো ক্লক ইন করেনি শুধু সে পায়, অনুমোদিত ছুটিতে থাকলে পায় না। শুক্রবার আর ছুটির দিনে যায় না। "minutes after office time"-এ -10 দিলে ১০ মিনিট আগে যায়।
- অ্যাপ বন্ধ থাকলেও ফোনে পুশ যেতে হলে:
  - Supabase → Database → Extensions-এ `pg_cron` আর `pg_net` চালু থাকতে হবে।
  - সার্ভার ফাংশন `scs-api` ডিপ্লয় থাকতে হবে (A3), আর Super Admin অন্তত একবার আসল সাইট খুলবেন (ঠিকানা ডাটাবেসে সেভ হয়)।
  - প্রত্যেক ইউজার ⚙️ → Push notifications চালু করবেন।
- **Activity Log**: পিন, পাসওয়ার্ড, টোকেন, API key কখনো লগে দেখায় না, পুরনো লগ থেকেও লুকানো হয়েছে।
  একই পেজে টিক তুলে দিলে কোন ধরনের লগ সাধারণ ইউজার দেখবে না সেটা ঠিক করা যায় (যেমন সেটিংস)। Super Admin ও অ্যাপের Admin সব দেখেন।
- Chemical Order → **History**: আজ / গতকাল / গত ৭ দিন / এই মাস / গত মাস / তারিখ বেছে, আর অর্ডার / প্রোডাক্ট / সেলার / সেটিংস দিয়ে ফিল্টার।
  Admin **Mark & delete** দিয়ে বেছে বেছে মুছতে পারেন।

---

## G. চেকলিস্ট (সব ঠিক আছে কি না)

- [ ] Create account → "Email code" বেছে নিলে ইমেইলে কোড আসে (A4)।
- [ ] Leave Application খোলে, New Application দিলে Admin-এর কাছে নোটিফিকেশন যায়, অ্যাপ্রুভ করলে আবেদনকারী পান।
- [ ] অফিস শুরুর সময় ক্লক ইন না করা ইউজার রিমাইন্ডার পান।

- [ ] সাইট খুললে লগইন পেজ আসে, "Setup pending" নয় → `config.js` ঠিক আছে।
- [ ] পাসওয়ার্ড রিসেটের লিংক আপনার সাইটে নিয়ে যায় → A5 ঠিক আছে।
- [ ] Forgot password → By email → কোড আসে আর কাজ করে → A4 (SMTP) ঠিক আছে।
- [ ] Forgot password → By mobile SMS → কোড আসে → A3 + A4 ঠিক আছে।
- [ ] Create account → মোবাইলে কোড আসে → অ্যাকাউন্ট খুলে যায় (ইমেইল লাগে না)।
- [ ] লগইন পেজে মোবাইল নম্বর + পাসওয়ার্ড, আর "Log in with SMS code" দুটোই কাজ করে।
- [ ] Admin Console → Backup → Send to Drive now → Drive ফোল্ডারে JSON ফাইল আসে।
- [ ] ⚙️ → Push notifications → ON → আবার চাপলে OK = টেস্ট নোটিফিকেশন আসে।
- [ ] অ্যাপের Admin ট্যাবে পিন চায়, আর User রোলে ঢুকতে দেয় না।

## সমস্যা হলে

| দেখাচ্ছে | কারণ / সমাধান |
|---|---|
| "Setup pending" | `config.js`-এ URL বা anon key নেই বা ভুল |
| "email rate limit exceeded" | Supabase-এর ফ্রি ইমেইল লিমিট শেষ। A6 অনুযায়ী Confirm email বন্ধ করুন, আর A4 অনুযায়ী Gmail (SMTP_USER / SMTP_PASS) দিন |
| Build fail: "Secrets scanning" | কোনো ফাইলে service_role key আছে, সেটা মুছুন। অথবা `netlify.toml` আপলোড হয়নি |
| রিসেট/কনফার্ম লিংক localhost-এ যায় | A5 করা হয়নি বা পুরনো ঠিকানা আছে |
| SMS যায় না, Server check-এ "SMS gateway: not configured" | A4-এর SMS Secrets দিন, অথবা Admin Console → SMS & Email-এ সেভ করুন |
| "Unregistered API key" / "Invalid API key" | `assets/config.js`-এর anon key বা URL অন্য প্রজেক্টের / পুরনো। Supabase থেকে আবার কপি করে বসান। (Netlify function বিকল্প ব্যবহার করলে Netlify env vars-ও মিলিয়ে দেখুন) |
| "Email could not be sent: SMTP (login) → 535 ..." | Gmail App Password ভুল, অথবা সাধারণ Gmail পাসওয়ার্ড দেওয়া হয়েছে। 2-Step Verification চালু করে নতুন App Password বানান |
| Leave অ্যাপে "Employee not found" / New Application ফাঁকা | অ্যাকাউন্টটি অনুমোদিত এমপ্লয়ি নয় (Admin Console → Users → "Show in Employee Attendance" টিক, Active), অথবা schema.sql v4 Run হয়নি |
| রিমাইন্ডার / পুশ আসে না | pg_cron ও pg_net চালু করে schema.sql আবার Run করুন। Super Admin একবার আসল সাইট খুলুন। ইউজারের Push চালু আছে কি না দেখুন |
| SMS টেস্টে "SMS provider: ..." | এই মেসেজ SMS কোম্পানির: API key, Sender ID, ব্যালান্স বা IP whitelist চেক করুন |
| Admin Console-এ লাল "database is not up to date" | সর্বশেষ `supabase/schema.sql` পুরোটা Run করুন |
| ইউজার তালিকা থেকে কেউ "উধাও" হয়ে যায় | সার্চ বক্সে কিছু লেখা আছে কি না দেখুন। হলুদ "Search: … showing x / y" বারে **Clear search** চাপুন (v3.1-এ ব্রাউজারের অটোফিল বন্ধ করা হয়েছে) |
| অনুমোদন/অ্যাক্সেস সেভ হয় না | লাল বার্তায় কারণ দেখাবে। সাধারণত schema.sql পুরনো, অথবা আপনি Super Admin নন (E ধাপ) |
| কোনো অ্যাপে অ্যাডমিন পিন চায় না | GitHub-এ সেই অ্যাপের `apps/<app>/app.js` আর `backend.js` পুরনো রয়ে গেছে। নতুনগুলো আপলোড করুন, তারপর ব্রাউজারে Ctrl+F5 |
| "Permission denied" | অ্যাকাউন্টের ওই অ্যাপে অ্যাক্সেস নেই, Admin Console থেকে দিন |
| লগইন করে অনুমোদনের অপেক্ষা দেখায় | Admin Console-এ অনুমোদন দিন, অথবা প্রথমবার হলে E ধাপ করুন |
