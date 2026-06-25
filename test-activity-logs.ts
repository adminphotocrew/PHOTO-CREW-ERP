import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.from('activity_logs').select('*').limit(1);
  if (error) {
    console.error('Error fetching activity_logs:', error.message);
  } else {
    console.log('activity_logs table exists! Sample:', data);
  }
}

run();
