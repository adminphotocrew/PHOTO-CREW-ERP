import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(url, serviceRoleKey);

async function run() {
  const { data: leads, error: fetchErr } = await supabase.from('leads').select('lead_id, status, current_status').limit(1);
  if (fetchErr || !leads || leads.length === 0) {
    console.error("Failed to fetch leads for testing:", fetchErr);
    return;
  }

  const lead = leads[0];
  console.log("Target lead:", lead);

  const updates = {
    deliverables_description: 'Test description ' + Math.random(),
    notes_special_customizations: 'Test customization ' + Math.random(),
    package_price: 15000
  };

  console.log("Attempting to update lead with deliverables_description, notes_special_customizations, package_price...");
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
