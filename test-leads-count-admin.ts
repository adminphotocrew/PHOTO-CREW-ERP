import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.from('leads').select('lead_id');
  if (error) {
    console.error('Error fetching leads:', error.message);
  } else {
    console.log('Total leads in database (admin):', data.length);
  }
}

run();
