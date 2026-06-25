import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, anonKey);

async function run() {
  console.log('Logging in as rupandas8811@gmail.com...');
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'rupandas8811@gmail.com',
    password: '123456789'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr.message);
    return;
  }

  console.log('Attempting to select from leads...');
  const { data, error } = await supabase.from('leads').select('*').limit(5);
  if (error) {
    console.error("Select failed! Error:", error);
  } else {
    console.log("Select succeeded! Found rows:", data.length);
    if (data.length > 0) {
      console.log("Sample lead ID:", data[0].lead_id);
    }
  }
}

run();
