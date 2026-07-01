import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  if (!url || !serviceRoleKey) {
    console.error('Missing credentials');
    return;
  }

  const supabase = createClient(url, serviceRoleKey);
  const { data, error } = await supabase.from('raw_footage').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total rows in raw_footage via service role:', data.length);
    console.log('Rows:', data);
  }
}

main();
