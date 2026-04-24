import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg1Nzk2NywiZXhwIjoyMDkyNDMzOTY3fQ.TyI3QUOarOJh6-xCHnlbpCmYRTWZZBxsVbI-b_f0tsc"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getUsers() {
  console.log('Fetching users...')
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Fetch users failed:', error)
  } else {
    console.log('Users found:', data.users.length)
    if (data.users.length > 0) {
      console.log('First User ID:', data.users[0].id)
    }
  }
}

getUsers()
