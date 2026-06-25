import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  console.log('--- AUTH USERS ---');
  if (authErr) {
    console.error(authErr);
  } else {
    authUsers.users.forEach(u => console.log(`Auth ID: ${u.id}, Email: ${u.email}`));
  }

  const { data: dbUsers, error: dbErr } = await supabase.from('users').select('*');
  console.log('--- DATABASE USERS ---');
  if (dbErr) {
    console.error(dbErr);
  } else {
    dbUsers.forEach(u => console.log(`Db ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Active: ${u.active}`));
  }
}

run();
