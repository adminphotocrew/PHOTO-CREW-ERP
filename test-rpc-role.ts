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

  const { data: role, error: rpcErr } = await supabase.rpc('get_user_role');
  if (rpcErr) {
    console.error('RPC get_user_role failed:', rpcErr);
  } else {
    console.log('Role returned by RPC:', role);
  }
}

run();
