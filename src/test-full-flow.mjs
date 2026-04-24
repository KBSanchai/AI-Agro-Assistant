import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://avjpdkizgfhwaknbidja.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg1Nzk2NywiZXhwIjoyMDkyNDMzOTY3fQ.TyI3QUOarOJh6-xCHnlbpCmYRTWZZBxsVbI-b_f0tsc"
const supabase = createClient(supabaseUrl, supabaseKey)

async function testFullFlow() {
  console.log('Reading local image...')
  const fileBuffer = fs.readFileSync('public/satellite_field.png')
  
  const filePath = 'test-folder/' + Date.now() + '.png'
  
  console.log('Uploading to bucket...')
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('crop-images')
    .upload(filePath, fileBuffer, { contentType: 'image/png' })
    
  if (uploadError) {
    console.error('Upload failed:', uploadError)
    return
  }
  
  const { data: urlData } = supabase.storage.from('crop-images').getPublicUrl(filePath)
  const publicUrl = urlData.publicUrl
  console.log('Uploaded! Public URL:', publicUrl)
  
  console.log('Invoking predict function...')
  const { data, error } = await supabase.functions.invoke('predict', {
    body: { image_url: publicUrl, model_type: 'fertilizer' }
  })
  
  console.log('Invoke Error:', error)
  console.log('Invoke Data:', data)
}

testFullFlow()
