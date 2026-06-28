import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log("Using SUPABASE_URL:", url);
  console.log("Service Role / Anon Key available:", !!serviceRoleKey);

  // Let's find an existing lead to try updating
  const { data: leads, error: fetchErr } = await supabase.from('leads').select('lead_id, status, current_status, remarks').limit(1);
  if (fetchErr || !leads || leads.length === 0) {
    console.error("Failed to fetch leads for testing:", fetchErr);
    return;
  }

  const lead = leads[0];
  console.log("Target lead:", lead);

  // Let's attempt an update with typical fields
  const updates = {
    status: 'Follow Up',
    current_status: 'Follow Up',
    updated_at: new Date().toISOString()
  };

  console.log("Attempting to update lead status/current_status to Follow Up...");
  const { data: updateData, error: updateErr } = await supabase
    .from('leads')
    .update(updates)
    .eq('lead_id', lead.lead_id)
    .select();

  if (updateErr) {
    console.error("Update failed! Error details:", JSON.stringify(updateErr, null, 2));
  } else {
    console.log("Update succeeded! Result:", updateData);
  }
}

run();
