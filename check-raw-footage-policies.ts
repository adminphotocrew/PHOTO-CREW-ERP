import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('Querying database policies for table: raw_footage...');
  
  const query = `
    SELECT 
      schemaname, 
      tablename, 
      policyname, 
      permissive, 
      roles, 
      cmd, 
      qual, 
      with_check 
    FROM pg_policies 
    WHERE tablename = 'raw_footage';
  `;

  const { data, error } = await supabase.rpc('run_sql', { query });
  if (error) {
    console.error('Error running SQL:', error);
  } else {
    console.log('Existing policies for raw_footage:');
    console.log(JSON.stringify(data, null, 2));
  }

  // Check RLS status of raw_footage
  const rlsQuery = `
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'raw_footage';
  `;
  const { data: rlsData, error: rlsError } = await supabase.rpc('run_sql', { query: rlsQuery });
  if (rlsError) {
    console.error('Error querying pg_class:', rlsError);
  } else {
    console.log('RLS Status of raw_footage:', rlsData);
  }

  // Also check column schema for raw_footage
  const colQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'raw_footage';
  `;
  const { data: colData, error: colError } = await supabase.rpc('run_sql', { query: colQuery });
  if (colError) {
    console.error('Error querying column info:', colError);
  } else {
    console.log('Columns in raw_footage:', colData);
  }
}

run();
