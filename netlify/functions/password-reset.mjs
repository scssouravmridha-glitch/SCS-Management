/* Netlify function (ঐচ্ছিক বিকল্প): আসল কোড supabase/functions/scs-api/index.ts এ।
 * সাইট সাধারণত Supabase Edge Function (scs-api) ব্যবহার করে; সেটা না পেলে Netlify-তে এটা চলে।
 * Netlify > Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * (SMS/ইমেইলের জন্য ঐচ্ছিক: SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID, SMTP_USER, SMTP_PASS) */
import { handle } from '../../supabase/functions/scs-api/index.ts';
export default (req) => handle(req, 'auth');
