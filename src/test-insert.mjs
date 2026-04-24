import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg1Nzk2NywiZXhwIjoyMDkyNDMzOTY3fQ.TyI3QUOarOJh6-xCHnlbpCmYRTWZZBxsVbI-b_f0tsc"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testInsert() {
  console.log('Testing insert into predictions with service role...')
  const { data, error } = await supabase.from('predictions').insert({
    user_id: '0e233992-ab26-4c23-85c7-fb80287870fd',
    image_url: 'https://example.com/test.jpg',
    model_type: 'fertilizer',
    prediction: 'Test Prediction',
    cure: 'Test Cure'
  })

  if (error) {
    console.error('Insert failed:', error)
  } else {
    console.log('Insert successful!')
  }
}

testInsert()
