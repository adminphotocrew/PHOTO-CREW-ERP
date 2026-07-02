import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchColumns() {
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
    const leadsPath = spec.paths['/leads'];
    if (leadsPath) {
      console.log('Leads schema description/parameters:', leadsPath.get?.parameters || leadsPath.post?.parameters);
    } else {
      console.log('No /leads path found in OpenAPI spec');
    }
  } catch (err) {
    console.error('Error fetching leads columns:', err);
  }
}
fetchColumns();
