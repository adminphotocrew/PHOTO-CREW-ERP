import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Querying pg_policies...');
  // Since we are using service role key, we can read pg_policies
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'leads');

  if (error) {
    console.log('Direct select on pg_policies failed. Attempting raw RPC or alternative schema queries...');
    // Let's try fetching via rpc or query information_schema orpg_catalog
    const { data: d2, error: err2 } = await supabase
      .from('pg_catalog.pg_policies')
      .select('*')
      .eq('tablename', 'leads');
    if (err2) {
      console.error('Failed to query policies:', err2.message);
    } else {
      console.log('Policies on leads table (pg_catalog):', d2);
    }
  } else {
    console.log('Policies on leads table:', data);
  }
}

run();
