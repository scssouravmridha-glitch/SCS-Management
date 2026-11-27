/* Netlify function (ঐচ্ছিক বিকল্প): আসল কোড supabase/functions/scs-api/index.ts এ। */
import { handle } from '../../supabase/functions/scs-api/index.ts';
export default (req) => handle(req, 'push');
