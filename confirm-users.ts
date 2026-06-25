import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Fetching auth users...');
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth users:', authErr.message);
    return;
  }

  console.log(`Found ${users.length} auth users. Confirming emails...`);
  for (const user of users) {
    if (!user.email_confirmed_at) {
      console.log(`Confirming email for ${user.email}...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      if (updateErr) {
        console.error(`Failed to confirm email for ${user.email}:`, updateErr.message);
      } else {
        console.log(`Successfully confirmed email for ${user.email}`);
      }
    } else {
      console.log(`Email for ${user.email} is already confirmed.`);
    }
  }
}

run();
