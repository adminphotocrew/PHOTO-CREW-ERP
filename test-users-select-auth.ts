import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  console.log('Logging in as sales@demo.com...');
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'sales@demo.com',
    password: 'demo123'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr.message);
    return;
  }

  console.log('Attempting to select from users table...');
  const { data, error } = await supabase.from('users').select('id, name, role').eq('id', authData.user?.id);
  if (error) {
    console.error('Select failed! Error:', error);
  } else {
    console.log('Select succeeded! Row:', data);
  }
}

run();
