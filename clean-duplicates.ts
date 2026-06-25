import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Fetching database users...');
  const { data: dbUsers } = await supabase.from('users').select('*');
  if (!dbUsers) return;

  const validEmails = [
    'owner@photocrew.com',
    'sale@photocrew.com',
    'operation@photocrew.com',
    'production@photocrew.com',
    'rupandas8811@gmail.com'
  ];

  for (const user of dbUsers) {
    const emailLower = user.email.toLowerCase().trim();
    if (!validEmails.includes(emailLower)) {
      console.log(`Deleting extra user: ${user.email} (ID: ${user.id})`);
      await supabase.from('users').delete().eq('id', user.id);
    }
  }

  // Also remove duplicate capitalized rows with hardcoded IDs
  const badIds = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
  ];
  for (const id of badIds) {
    console.log(`Deleting bad ID if exists: ${id}`);
    await supabase.from('users').delete().eq('id', id);
  }

  console.log('Database users table is cleaned up!');
}

run();
