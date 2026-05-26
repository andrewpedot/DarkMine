const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Fetched ${data.length} projects:`);
  data.forEach((p, idx) => {
    console.log(`\n--- Project ${idx + 1} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Title Original: ${p.title_original}`);
    console.log(`Title Final: ${p.title_final}`);
    console.log(`Status: ${p.status}`);
    console.log(`Market: ${p.market}`);
    console.log(`Channel SKU: ${p.channel_name}`);
    console.log(`PDF ref: ${p.reference_pdf ? p.reference_pdf.substring(0, 100) : 'none'}`);
  });
}

checkProjects();
