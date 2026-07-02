import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function fixLeadsRls() {
  console.log('Fixing RLS for leads table...');
  const sql = `
    DROP POLICY IF EXISTS "Enable update for authenticated users on leads" ON leads;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON leads;
    DROP POLICY IF EXISTS "Leads update policy" ON leads;
    
    CREATE POLICY "Enable update for authenticated users on leads" 
    ON leads FOR UPDATE 
    TO authenticated 
    USING (true);
  `;
  
  const { data, error } = await supabase.rpc('run_sql', { query: sql });
  if (error) {
    console.log("RPC run_sql might not exist, trying different approach...", error);
    // Let's try inserting via REST or checking if there's another way, but hopefully run_sql exists
  } else {
    console.log("Successfully ran SQL via RPC run_sql");
  }
}

fixLeadsRls();
