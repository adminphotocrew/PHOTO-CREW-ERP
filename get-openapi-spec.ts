import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchSpec() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey
      }
    });
    if (!res.ok) {
      console.log('HTTP Error:', res.status, await res.text());
      return;
    }
    const spec = await res.json();
    console.log('Tables/Views found in paths:', Object.keys(spec.paths).filter(p => !p.startsWith('/rpc/')));
    console.log('RPCs found in paths:', Object.keys(spec.paths).filter(p => p.startsWith('/rpc/')));
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err);
  }
}
fetchSpec();
