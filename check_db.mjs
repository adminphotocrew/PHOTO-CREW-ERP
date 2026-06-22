import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('operations').select('event_status, operation_id');
  if (error) {
    console.error(error);
  } else {
    console.log("Operations event_status values:", data);
  }
}
check();

