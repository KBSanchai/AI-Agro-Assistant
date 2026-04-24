import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg1Nzk2NywiZXhwIjoyMDkyNDMzOTY3fQ.TyI3QUOarOJh6-xCHnlbpCmYRTWZZBxsVbI-b_f0tsc"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listTables() {
  console.log('Listing tables via RPC...')
  // Using a trick to list tables if possible, or just trying multiple names
  const tables = ['predictions', 'profiles', 'users']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Table ${table}: Error - ${error.message}`)
    } else {
      console.log(`Table ${table}: EXISTS and SELECT works.`)
    }
  }
}

listTables()
