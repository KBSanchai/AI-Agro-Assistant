async function listModels() {
  const apiKey = "AIzaSyBnvmbHwmyvLldL2k73qzdvppLWu9Ebgrs"
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  
  const resp = await fetch(url)
  
  if (resp.ok) {
    const data = await resp.json()
    const genModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"))
    console.log('Supported generateContent models:\n' + genModels.map(m => m.name).join('\n'))
  } else {
    console.log('Response:', await resp.text())
  }
}

listModels()
