import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTc5NjcsImV4cCI6MjA5MjQzMzk2N30.ZOYmj2kraBgDa3i8AAhoWzL9qI2gv3mNxf6BalT7Doc"
const supabase = createClient(supabaseUrl, supabaseKey)

async function testInvoke() {
  console.log('Testing invoke...')
  const { data, error } = await supabase.functions.invoke('predict', {
    body: { image_url: "https://example.com/test.jpg", model_type: "fertilizer" }
  })
  console.log('Error:', error)
  console.log('Data:', data)
}

testInvoke()
