import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg1Nzk2NywiZXhwIjoyMDkyNDMzOTY3fQ.TyI3QUOarOJh6-xCHnlbpCmYRTWZZBxsVbI-b_f0tsc"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log('Checking tables...')
  const { data, error } = await supabase.from('predictions').select('count', { count: 'exact', head: true })

  if (error) {
    console.error('Check failed:', error)
  } else {
    console.log('Predictions table exists.')
  }
}

checkTables()
