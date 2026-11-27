# SCS Management — Supabase + (Netlify বা GitHub Pages)

এক অ্যাকাউন্টে সব SCS অ্যাপ। ডাটাবেস, লগইন, রিয়েল-টাইম আর সার্ভারের কাজ **Supabase**-এ। ওয়েবসাইট শুধু সাধারণ ফাইল, তাই **Netlify** বা **GitHub Pages** যেকোনো জায়গায় রাখা যায়। পুরো সেটআপ: **DEPLOY.md**।

```
SCS Management (index.html)        ← লগইন / অ্যাকাউন্ট খোলা / অ্যাপের তালিকা / সাম্প্রতিক অ্যাক্টিভিটি
├── profile.html                    ← আমার প্রোফাইল: ছবি, নাম, মোবাইল, NID, সার্টিফিকেট, পাসওয়ার্ড
├── admin.html                      ← Admin Console (Super Admin): ইউজার, অ্যাপ ও অ্যাডমিন পিন, লোগো, SMS গেটওয়ে
├── activity.html                   ← সব অ্যাপের লাইফটাইম অ্যাক্টিভিটি লগ (আগে → পরে)
├── migrate.html                    ← পুরনো Google Sheet থেকে ডাটা আনা (একবার)
├── apps/monthly-report/            ← SCS Monthly Report
├── apps/attendance/                ← SCS Employee Attendance
├── apps/chemical-order/            ← SCS Chemical Order
├── apps/leave/                     ← SCS Leave Application (ছুটির আবেদন ও অনুমোদন)
├── supabase/functions/scs-api/     ← সার্ভারের সব কাজ (SMS/ইমেইল কোড, পুশ, কাস্টমার SMS) — Supabase Edge Function
├── .github/workflows/              ← GitHub Pages এ নিজে থেকে ডিপ্লয়
├── assets/                         ← শেয়ার্ড কোড, লোগো (config.js এ Supabase কী)
├── sw.js, manifest.webmanifest     ← পুশ নোটিফিকেশন ও ফোনে "অ্যাপ" হিসেবে ইনস্টল
├── netlify/functions/
│   ├── send-sms.mjs                ← Chemical Order কাস্টমার SMS
│   ├── password-reset.mjs          ← মোবাইলে পাসওয়ার্ড রিসেট কোড
│   └── push.mjs                    ← পুশ নোটিফিকেশন পাঠানো
└── supabase/schema.sql             ← পুরো ডাটাবেস (Run করতে হবে; বারবার Run করলেও সমস্যা নেই)
```

## কী কী আছে

- **অ্যাকাউন্ট = এমপ্লয়ি।** অ্যাকাউন্ট খোলার সময় পূর্ণ নাম, মোবাইল, ইমেইল ও পাসওয়ার্ড দিতে হয়। প্রথমবার লগইনের পর **প্রোফাইল ছবি** দিতে হয়, ছবি ছাড়া এগোনো যায় না।
  NID-এর দুই পাতা আর শিক্ষাগত সনদ ঐচ্ছিক। এই ডকুমেন্টগুলো শুধু সেই ব্যক্তি আর Super Admin দেখতে পারেন।
  - অনুমোদন দিলেই সে **Employee Attendance-এ এমপ্লয়ি হিসেবে যোগ হয়ে যায়**, আর Employee ID (SCS-1xx) নিজে থেকে তৈরি হয়। Admin Console থেকে ID বদলানো যায়।
  - নাম, মোবাইল আর ছবি সবসময় প্রোফাইল থেকে আসে। প্রোফাইলে বদলালে Attendance, Monthly Report আর Activity Log সব জায়গায় বদলে যায়।
  - পুরনো শিটের এমপ্লয়ির হাজিরার ইতিহাস রাখতে: Admin Console → ইউজার → Details-এ পুরনো Employee ID-টাই দিন (যেমন SCS-104)। তাহলে পুরনো রেকর্ড সেই অ্যাকাউন্টের সাথে জুড়ে যাবে।
- **রোল:** প্রতিটা অ্যাপে **User** বা **Admin**। **Super Admin** সব অ্যাপের Admin আর Admin Console চালান। একাধিক Super Admin বানানো যায়।
- **অ্যাডমিন পিন:** অ্যাপের অ্যাডমিন প্যানেল খুলতে Admin রোল **এবং** সেই অ্যাপের ৪ সংখ্যার পিন, দুটোই লাগে।
  User রোলের কেউ পিন জানলেও ঢুকতে পারবে না। ডিফল্ট পিন `2026`। Admin Console → Apps & admin PINs থেকে বদলান।
- **সেটিংস আইকন (⚙️):** প্রতিটা অ্যাপের টপ বারে আছে। এখান থেকে নোটিফিকেশন, সেই অ্যাপের **Activity Log**, পুশ নোটিফিকেশন চালু/বন্ধ, প্রোফাইল, ভাষা আর লগআউট পাওয়া যায়।
- **Activity Log:** প্রতিটা Add/Edit/Delete ডাটাবেস নিজেই লিখে রাখে: কে, কখন, আগে কী ছিল, পরে কী হলো (পাশাপাশি দেখায়)। এডিট কেউ করতে পারে না, **ডিলিট শুধু Super Admin** পারেন।
- **নোটিফিকেশন:** নতুন অর্ডার হলে Chemical Order-এর সব ইউজার নোটিফিকেশন পান। নতুন অ্যাকাউন্ট খোলা হলে Super Admin-রা পান।
  ⚙️ → *Push notifications* চালু করলে অ্যাপ বন্ধ থাকলেও ফোন বা কম্পিউটারের নোটিফিকেশন বারে আসে।
  - **iPhone/iPad:** আগে Safari-তে সাইট খুলে Share → *Add to Home Screen* দিন। তারপর হোম স্ক্রিন থেকে খুলে পুশ চালু করুন (Apple-এর নিয়ম)।
  - Android/কম্পিউটার: Chrome বা Edge-এ সরাসরি চালু হয়।
- **ভাষা:** সব জায়গায় ডিফল্ট English। ⚙️ মেনু বা লগইন পেজ থেকে বাংলা বেছে নেওয়া যায়।
- **লোগো:** Admin Console → Logo থেকে বদলালে হোম পেজ, টপ বার, সব অ্যাপের হেডার আর নোটিফিকেশনে একসাথে বদলে যায়।
- **মোবাইল SMS দিয়ে অ্যাকাউন্ট:** নতুন অ্যাকাউন্ট খুলতে মোবাইলে ৬ সংখ্যার কোড আসে, ইমেইল কনফার্ম লাগে না। লগইন করা যায় ইমেইল বা মোবাইল নম্বর + পাসওয়ার্ড দিয়ে, অথবা শুধু SMS কোড দিয়ে।
  SMS গেটওয়ে সেট না থাকলে ইমেইল পদ্ধতিতে চলে।
- **টপ বার:** প্রতিটা অ্যাপে 🏠 হোম বাটন (অন্য অ্যাপে যেতে) আর ⚙️ সেটিংস।
- **ব্যাকআপ:** Admin Console → Backup থেকে সব অ্যাপের লাইফটাইম ডাটা JSON হিসেবে ডাউনলোড করা যায়, প্রতি মিনিট/ঘণ্টা/দিনে Google Drive-এ অটো পাঠানো যায়, আর ফাইল থেকে রিস্টোর করা যায়।
  নতুন অ্যাপের টেবিলও নিজে থেকেই ব্যাকআপে যোগ হয়।
- **Leave Application:** প্রত্যেক কর্মী নিজের অ্যাকাউন্ট দিয়ে নিজের ছুটির আবেদন দেন। Admin অ্যাপ্রুভ বা রিজেক্ট করেন, আবেদনকারী সাথে সাথে নোটিফিকেশন পান। সব আপডেট লাইভ দেখায়।
- **নোটিফিকেশন নিয়ম:** Admin Console → Notifications & Log থেকে কোন নোটিফিকেশন কে পাবে ঠিক করা যায়। ক্লক ইন/আউট রিমাইন্ডারও এখানে।
- **নতুন অ্যাপ যোগ করা:** নিচে দেখুন (যেমন ভবিষ্যতের Employee Leave Application)। পুরো সেটআপ আর প্রতিবারের আপডেট নোট আছে **DEPLOY.md**-তে।
- **শেয়ার্ড টেবিল:** `chem_orders` Chemical Order লেখে, Monthly Report শুধু পড়ে। `att_monthly_summary` Attendance লেখে, Monthly Report শুধু পড়ে।

---

## ধাপ ১ — Supabase ডাটাবেস (নতুন বা আপডেট)

1. Supabase → **SQL Editor → New query** খুলুন। `supabase/schema.sql`-এর **পুরোটা** পেস্ট করে **Run** চাপুন।
   আগে একবার চালিয়ে থাকলেও আবার চালান। আগের ডাটা মুছবে না, শুধু নতুন অংশগুলো যোগ হবে।
2. প্রথম Super Admin বানানো (একবারই): ওয়েবসাইটে নিজের অ্যাকাউন্ট খুলুন। তারপর **New query**-তে নিচের কোড (শুরুতে `--` ছাড়া) পেস্ট করে নিজের ইমেইল বসিয়ে Run করুন:
   ```sql
   insert into public.profiles (id, email, status, is_super_admin)
   select id, email, 'active', true from auth.users where lower(email) = lower('your-email@example.com')
   on conflict (id) do update set status = 'active', is_super_admin = true;
   ```

## ধাপ ২ — পাসওয়ার্ড রিসেট ঠিকমতো চালানো (জরুরি)

রিসেট লিংকে ক্লিক করে "connect হচ্ছে না" দেখালে কারণ প্রায় সবসময় এটাই: Supabase লিংকটা এখনো `localhost`-এ পাঠাচ্ছে।

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL** = আপনার Netlify ঠিকানা, যেমন `https://scs-management.netlify.app`
   - **Redirect URLs**-এ যোগ করুন: `https://scs-management.netlify.app/**`
2. Supabase → **Authentication → Emails → Templates → Reset Password**। লিংকের পাশাপাশি ৬ সংখ্যার **কোড** পাঠাতে Message body-তে এটা দিন:
   ```html
   <h2>Reset your SCS Management password</h2>
   <p>Your reset code:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Enter this code on the "Reset password" page, or click this link:
      <a href="{{ .ConfirmationURL }}">Reset password</a></p>
   <p>If you did not ask for this, ignore this email.</p>
   ```
   ব্যবহারকারী ইমেইলের কোড ওয়েবসাইটে টাইপ করবেন, অথবা লিংকে ক্লিক করবেন। দুটোই কাজ করে।
3. Supabase-এর নিজের ইমেইল সার্ভিস ঘণ্টায় খুব কম ইমেইল পাঠায়। নিয়মিত ব্যবহারের জন্য **Authentication → Emails → SMTP Settings**-এ
   নিজের SMTP দিন (যেমন Gmail App Password, Brevo বা Zoho)।
4. **মোবাইলে কোড:** Admin Console → **SMS gateway**-তে SMS পাঠানোর এন্ডপয়েন্ট URL, API key আর Sender ID বসিয়ে Save দিন, তারপর *Send test SMS* দিয়ে পরীক্ষা করুন।
   এখানে কিছু না দিলে Chemical Order-এর SMS সেটিং ব্যবহার হবে। API key ডাটাবেসের গোপন টেবিলে থাকে, Super Admin ছাড়া কেউ এই সেটিং দেখতে পায় না।
   অ্যাকাউন্টের মোবাইল নম্বরেই কোড যায়, তাই প্রত্যেকের প্রোফাইলে সঠিক মোবাইল নম্বর থাকা দরকার।

## ধাপ ৩ — কোডে Supabase কী

`assets/config.js` ফাইলে `SUPABASE_URL` আর `SUPABASE_ANON_KEY` (anon public key) বসান। **service_role key কখনো কোনো ফাইলে লিখবেন না।**

## ধাপ ৪ — GitHub → Netlify

1. GitHub repo-তে এই ফোল্ডারের **ভেতরের সব কিছু** আপলোড করুন (Add file → Upload files)। নতুন ফাইলগুলোও যেন যায়:
   `profile.html`, `sw.js`, `manifest.webmanifest`, `assets/logo.png`, `assets/icon-192.png`,
   `netlify/functions/password-reset.mjs`, `netlify/functions/push.mjs`।
2. Netlify → Site configuration → Environment variables-এ এই তিনটা থাকতে হবে: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`।
   `netlify.toml` আগে থেকেই Netlify-কে বলে দেয় URL আর anon key পাবলিক, তাই secret scanning-এ build আটকাবে না।
3. পুশ নোটিফিকেশনের জন্য কিছু সেট করতে হয় না। প্রথমবার কেউ পুশ চালু করলে এনক্রিপশন key নিজে থেকেই তৈরি হয়ে ডাটাবেসে জমা হয়।

> Drag & Drop ডিপ্লয়ে সার্ভার ফাংশন ডিপ্লয় হয় না। তখন SMS, মোবাইলে রিসেট কোড আর পুশ চলবে না, তাই GitHub দিয়েই ডিপ্লয় করুন।

## ধাপ ৫ — পুরনো ডাটা আনা (একবার)

- **Chemical Order:** পুরনো অ্যাপ → Admin → Backup & Restore → *Lifetime* ব্যাকআপ → নতুন অ্যাপে *Restore from JSON*। এরপর Admin → PDF → "All PDF Upload" চাপুন।
- **Monthly Report:** পুরনো অ্যাপের সম্পূর্ণ ব্যাকআপ (JSON) → নতুন অ্যাপে একই জায়গায় Restore।
- **Attendance:** পুরনো শিটের `Employees` আর `Attendance` ট্যাব CSV হিসেবে নামান → Admin Console → Tools → **Data migration**।
  তারপর প্রত্যেক কর্মচারী অ্যাকাউন্ট খুললে Details-এ তার পুরনো Employee ID দিন, যাতে দুটো জুড়ে যায়।

## নতুন অ্যাপ যোগ করা

1. `apps/<key>/index.html` বানিয়ে শেষে এগুলো দিন:
   ```html
   <script src="/assets/config.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
   <script src="/assets/scs-core.js"></script>
   <script>SCS.bootApp('<key>', ['app.js']);</script>
   ```
   অ্যাপের টপ বারে (`<header>`) ⚙️ আইকন আর লোগো নিজে থেকেই বসে যাবে।
   কোডে যা পাওয়া যায়: `SCS.sb` (Supabase), `SCS.me` (ইউজার), `window.SCS_ROLE`, অ্যাডমিন পিনের জন্য `await SCS.askAdminPin()`, `SCS.t('English','বাংলা')`।
2. GitHub-এ আপলোড করুন। তারপর Admin Console → Apps & admin PINs → **Add app**-এ একই key আর path `/apps/<key>/` দিন।
   বাইরের কোনো ওয়েবসাইটের লিংকও (https://…) অ্যাপ হিসেবে যোগ করা যায়।
3. নতুন টেবিলে RLS: `has_app('<key>')`। Activity Log-এর জন্য: `select scs_attach_triggers('your_table', '<key>', 'Entity', 'ref_column');`
   নোটিফিকেশন পাঠাতে (SQL ফাংশনের ভেতর থেকে): `perform scs_notify_event('<key>.<event>', 'Title', 'Body', '/apps/<key>/', <target user বা null>, auth.uid());`
   `notif_rules` টেবিলে ইভেন্টটা যোগ করলে Admin Console থেকে চালু/বন্ধ ও প্রাপক বদলানো যায় (Leave অ্যাপটাই সবচেয়ে ভালো উদাহরণ: `apps/leave/` আর schema.sql-এর সেকশন 11)।

## টেকনিক্যাল নোট

- কোনো build লাগে না, সাধারণ HTML/JS। পুরনো অ্যাপের UI হুবহু রাখা হয়েছে। `assets/gas-bridge.js` পুরনো `google.script.run` কলগুলোকে প্রতিটা অ্যাপের `backend.js`-এ পাঠায়।
- Attendance আর Monthly Report-এর `app.js` হলো আগের এনকোড করা বান্ডেল, সাথে ছোট কিছু প্যাচ (`SCS_ROLE` / `SCS_CHECK_ADMIN_PIN` লিখে খুঁজলে দেখবেন)।
- Supabase নিজেই প্রতিদিন ডাটাবেস ব্যাকআপ রাখে। হাতে JSON ব্যাকআপ আগের মতোই নেওয়া যায়।
