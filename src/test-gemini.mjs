async function testGemini() {
  const apiKey = "AIzaSyBnvmbHwmyvLldL2k73qzdvppLWu9Ebgrs"
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
  
  const prompt = `The AI detected: "NeckBlast" on a crop. Give advice strictly in the following format. Include the emojis exactly as shown.
🔍 What is it?
(Brief 1-2 sentence description)
⚠️ How bad is it?
(Short sentence on severity)
💊 What to do
• (Action 1)
• (Action 2)
🛡️ How to prevent it
• (Prevention 1)
• (Prevention 2)`

  console.log('Testing Gemini API...')
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })
  
  console.log('Status:', resp.status)
  const data = await resp.text()
  console.log('Response:', data)
}

testGemini()
