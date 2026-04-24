async function debugFunction() {
  const url = "https://avjpdkizgfhwaknbidja.supabase.co/functions/v1/predict"
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2anBka2l6Z2Zod2FrbmJpZGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTc5NjcsImV4cCI6MjA5MjQzMzk2N30.ZOYmj2kraBgDa3i8AAhoWzL9qI2gv3mNxf6BalT7Doc"
  
  console.log('Calling edge function...')
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image_url: "https://avjpdkizgfhwaknbidja.supabase.co/storage/v1/object/public/crop-images/test.jpg",
        model_type: "fertilizer"
      })
    })

    console.log('Status:', resp.status)
    const text = await resp.text()
    console.log('Response:', text)
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

debugFunction()
