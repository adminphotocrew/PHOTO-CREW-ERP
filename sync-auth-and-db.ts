import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

const FIXED_ACCOUNTS = [
  {
    email: 'owner@photocrew.com',
    password: 'owner@123',
    name: 'Business Owner',
    role: 'Business Owner',
    mobile: '+1 (555) 019-2834'
  },
  {
    email: 'sale@photocrew.com',
    password: 'sales@123',
    name: 'Sales',
    role: 'Sales Team',
    mobile: '+1 (555) 014-9988'
  },
  {
    email: 'operation@photocrew.com',
    password: 'ops@123',
    name: 'Operations',
    role: 'Operations Team',
    mobile: '+1 (555) 016-5544'
  },
  {
    email: 'production@photocrew.com',
    password: 'prod@123',
    name: 'Production',
    role: 'Production Team',
    mobile: '+1 (555) 012-3322'
  },
  {
    email: 'rupandas8811@gmail.com',
    password: 'owner@123',
    name: 'Rupand Das',
    role: 'Business Owner',
    mobile: '+1 (555) 019-2834'
  }
];

async function run() {
  console.log('Fetching auth users...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error fetching auth users:', authErr.message);
    return;
  }
  const authUsers = authData.users;

  console.log('Syncing pre-configured system accounts...');

  for (const acc of FIXED_ACCOUNTS) {
    const emailLower = acc.email.toLowerCase().trim();
    let authUser = authUsers.find(u => u.email?.toLowerCase().trim() === emailLower);

    if (!authUser) {
      console.log(`Auth user missing for ${emailLower}. Creating in Supabase Auth...`);
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          name: acc.name,
          role: acc.role,
          mobile: acc.mobile,
          password: acc.password
        }
      });

      if (createErr) {
        console.error(`Failed to create auth user for ${emailLower}:`, createErr.message);
        continue;
      }
      authUser = createData.user;
      console.log(`Successfully created auth user for ${emailLower} with ID: ${authUser.id}`);
    } else {
      console.log(`Auth user exists for ${emailLower} with ID: ${authUser.id}. Updating password and metadata...`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          name: acc.name,
          role: acc.role,
          mobile: acc.mobile,
          password: acc.password
        }
      });
      if (updateErr) {
        console.error(`Failed to update auth user ${emailLower}:`, updateErr.message);
      }
    }

    // Now, upsert into the public.users table with the EXACT same auth ID
    if (authUser) {
      console.log(`Syncing public.users record for ${emailLower} with ID: ${authUser.id}...`);
      
      // Clean any other public user records with this email to prevent unique constraints issues
      await supabase.from('users').delete().eq('email', acc.email);
      await supabase.from('users').delete().eq('email', emailLower);

      const { error: dbInsertErr } = await supabase.from('users').upsert({
        id: authUser.id,
        email: acc.email,
        name: acc.name,
        full_name: acc.name,
        role: acc.role,
        active: true,
        mobile: acc.mobile,
        phone: acc.mobile,
        username: emailLower.split('@')[0],
        password: acc.password,
        created_at: new Date().toISOString()
      });

      if (dbInsertErr) {
        console.error(`Failed to sync public.users for ${emailLower}:`, dbInsertErr.message);
      } else {
        console.log(`Successfully synced public.users for ${emailLower}`);
      }
    }
  }

  // Delete any other users in public.users that are NOT in FIXED_ACCOUNTS
  console.log('Cleaning up unused/demo public users from the database...');
  const { data: finalDbUsers } = await supabase.from('users').select('*');
  if (finalDbUsers) {
    for (const dbUser of finalDbUsers) {
      const email = dbUser.email?.toLowerCase().trim();
      const isFixed = FIXED_ACCOUNTS.some(acc => acc.email.toLowerCase().trim() === email);
      if (!isFixed) {
        console.log(`Deleting extra public user: ${email} (ID: ${dbUser.id})`);
        const { error: delErr } = await supabase.from('users').delete().eq('id', dbUser.id);
        if (delErr) {
          console.error(`Failed to delete extra user ${email}:`, delErr.message);
        }
      }
    }
  }

  console.log('Cleanup and alignment completed successfully.');
}

run();
