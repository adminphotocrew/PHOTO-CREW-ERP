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

  console.log(`Found ${users.length} auth users. Fetching public users...`);
  const { data: dbUsers, error: dbErr } = await supabase.from('users').select('*');
  if (dbErr) {
    console.error('Error fetching public users:', dbErr.message);
    return;
  }

  for (const authUser of users) {
    const email = authUser.email?.toLowerCase().trim();
    if (!email) continue;

    const matchedDbUser = dbUsers.find(u => u.email?.toLowerCase().trim() === email);
    if (matchedDbUser) {
      if (matchedDbUser.id !== authUser.id) {
        console.log(`Aligning ID for ${email}: ${matchedDbUser.id} -> ${authUser.id}`);
        
        // Let's delete the temporary/old one if any, or just update the ID.
        // Since ID is primary key, updating it is clean if we do it via service role.
        const { error: updateErr } = await supabase
          .from('users')
          .update({ id: authUser.id })
          .eq('email', email);

        if (updateErr) {
          console.error(`Failed to update ID for ${email}:`, updateErr.message);
        } else {
          console.log(`Successfully aligned ID for ${email}`);
        }
      } else {
        console.log(`User ${email} is already aligned (ID: ${authUser.id})`);
      }
    } else {
      console.log(`No db user found for ${email}. Creating one...`);
      const { error: insertErr } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: email,
          name: authUser.user_metadata?.name || email.split('@')[0],
          full_name: authUser.user_metadata?.name || email.split('@')[0],
          role: authUser.user_metadata?.role || 'Sales Team',
          active: true,
          mobile: authUser.user_metadata?.mobile || '',
          phone: authUser.user_metadata?.mobile || ''
        });
      if (insertErr) {
        console.error(`Failed to insert public user for ${email}:`, insertErr.message);
      } else {
        console.log(`Successfully created public user for ${email}`);
      }
    }
  }
}

run();
