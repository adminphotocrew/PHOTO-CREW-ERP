import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

async function run() {
  const fetchUrl = `${url}/rest/v1/?apikey=${anonKey}`;
  console.log('Fetching REST API Schema from:', fetchUrl);
  try {
    const res = await fetch(fetchUrl);
    const schema = await res.json();
    console.log('Exposed tables in REST schema:');
    console.log(Object.keys(schema.definitions || {}));
  } catch (err: any) {
    console.error('Error fetching REST schema:', err);
  }
}

run();
