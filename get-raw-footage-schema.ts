import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  if (!url || !serviceRoleKey) {
    console.error('Missing credentials');
    return;
  }

  console.log('Fetching OpenAPI schema from:', `${url}/rest/v1/`);
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });

    if (!res.ok) {
      console.error('Error:', res.status, res.statusText);
      return;
    }

    const schema = await res.json();
    console.log('--- raw_footage definition ---');
    const definition = schema.definitions?.raw_footage;
    if (definition) {
      console.log('Properties:');
      Object.entries(definition.properties).forEach(([name, val]: [string, any]) => {
        console.log(`- ${name}: ${val.type} (format: ${val.format}, description: ${val.description || ''})`);
      });
      console.log('Required fields:', definition.required);
    } else {
      console.log('raw_footage definition not found!');
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

main();
