import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_columns', { table_name: 'predictions' });
  if (error) {
    // Fallback: try a query and see error
    console.log("Checking columns via query...");
    const { data: qData, error: qError } = await supabase.from('predictions').select('*').limit(1);
    if (qData && qData.length > 0) {
      console.log("Columns:", Object.keys(qData[0]));
    } else {
        console.log("Table empty or query failed:", qError?.message);
    }
  } else {
    console.log("Columns:", data);
  }
}

checkColumns();
