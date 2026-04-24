const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logs: string[] = [];
  logs.push("Function started");

  try {
    const authHeader = req.headers.get("Authorization");
    const apikey = req.headers.get("apikey");
    if (!authHeader && !apikey) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", logs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY")!;
    logs.push(`Config Check: Gemini Key is ${googleApiKey ? 'Available' : 'NOT FOUND'}`);
    
    logs.push("Creating supabase client");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { image_url, model_type, user_id, temperature, humidity, latitude, longitude } = await req.json();
    logs.push(`Request for ${model_type} from user ${user_id}`);

    if (!image_url || !model_type || !user_id) {
      return new Response(JSON.stringify({ success: false, error: "image_url, model_type and user_id required", logs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logs.push("Downloading image");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    let imageResp;
    try {
      imageResp = await fetch(image_url, { signal: controller.signal });
      if (!imageResp.ok) throw new Error(`Failed to download image: ${imageResp.status} ${imageResp.statusText}`);
    } catch (e) {
      clearTimeout(timeoutId);
      throw new Error("Image download failed or timed out: " + e.message);
    }
    const imageBlob = await imageResp.blob();
    clearTimeout(timeoutId);

    const hfUrl =
      model_type === "fertilizer"
        ? "https://sanchaiKB-fertilizer-model.hf.space/predict"
        : "https://sanchaikb-crop-insect-classifier.hf.space/predict";

    logs.push(`Calling HF API: ${hfUrl}`);
    const formData = new FormData();
    formData.append("file", imageBlob, "image.jpg");

    const hfController = new AbortController();
    const hfTimeoutId = setTimeout(() => hfController.abort(), 25000); // 25s timeout for AI

    let hfResp;
    let prediction = "Unknown";
    try {
      hfResp = await fetch(hfUrl, { method: "POST", body: formData, signal: hfController.signal });
      clearTimeout(hfTimeoutId);
      if (hfResp.ok) {
        const hfData = await hfResp.json();
        prediction = hfData.prediction || hfData.label || hfData.class || JSON.stringify(hfData);
        logs.push(`Prediction received: ${prediction}`);
      } else {
        const errText = await hfResp.text();
        logs.push(`HF API error: ${hfResp.status} - ${errText}`);
        prediction = "Model unavailable - please try again later";
      }
    } catch (e) {
      clearTimeout(hfTimeoutId);
      logs.push("HF API failed or timed out: " + e.message);
      prediction = "Model unavailable - timeout";
    }

    logs.push("Calling Gemini AI (1.5 Flash)");
    const prompt = `The AI detected: "${prediction}" on a crop. Give advice strictly in the following format. Include the emojis exactly as shown.
🔍 What is it?
(Brief 1-2 sentence description)
⚠️ How bad is it?
(Short sentence on severity)
💊 What to do
• (Action 1)
• (Action 2)
🛡️ How to prevent it
• (Prevention 1)
• (Prevention 2)`;

    const geminiController = new AbortController();
    const geminiTimeoutId = setTimeout(() => geminiController.abort(), 25000);

    // Rule-based fallback for common rice conditions
    function getFallbackAdvice(pred: string): string {
      const p = pred.toLowerCase();
      if (p.includes("neck blast") || p.includes("blast")) {
        return `🔍 What is it?\nNeck Blast is a fungal disease (Magnaporthe oryzae) attacking the panicle neck, blocking grain filling.\n⚠️ How bad is it?\nExtremely severe — can cause 100% yield loss if untreated at heading stage.\n💊 What to do\n• Spray Tricyclazole 75WP (0.6g/L) or Isoprothiolane immediately\n• Remove infected tillers and burn them\n🛡️ How to prevent it\n• Use blast-resistant varieties (IR64, Swarna Sub1)\n• Avoid excess nitrogen fertilizer`;
      }
      if (p.includes("brown spot")) {
        return `🔍 What is it?\nBrown Spot is a fungal disease caused by Bipolaris oryzae, forming oval brown lesions on leaves.\n⚠️ How bad is it?\nModerate severity; can reduce yield 5–45% if widespread.\n💊 What to do\n• Apply Mancozeb 75WP or Propiconazole at first sign\n• Ensure proper potassium fertilization\n🛡️ How to prevent it\n• Use certified disease-free seeds\n• Maintain balanced soil nutrients (K, Zn)`;
      }
      if (p.includes("leaf folder") || p.includes("leafroller")) {
        return `🔍 What is it?\nLeaf Folder (Cnaphalocrocis medinalis) is a moth larva that rolls rice leaves and feeds inside.\n⚠️ How bad is it?\nModerate; causes 10–30% yield loss at high infestation levels.\n💊 What to do\n• Spray Chlorpyrifos 20EC or Cartap hydrochloride\n• Release Trichogramma parasitoids for biological control\n🛡️ How to prevent it\n• Drain fields periodically to disrupt larval habitat\n• Avoid excess nitrogen which encourages soft leaf growth`;
      }
      if (p.includes("stem borer") || p.includes("borer")) {
        return `🔍 What is it?\nStem Borers (Scirpophaga spp.) are larvae that bore into rice stems causing Dead Heart and White Ear.\n⚠️ How bad is it?\nVery severe — White Ear at heading stage can cause up to 80% yield loss.\n💊 What to do\n• Apply Carbofuran 3G granules at base of plants\n• Cut and destroy egg masses from leaves\n🛡️ How to prevent it\n• Plant synchronously across the field\n• Use light traps to catch adult moths`;
      }
      if (p.includes("healthy") || p.includes("normal")) {
        return `🔍 What is it?\nYour crop appears healthy with no visible disease or pest symptoms.\n⚠️ How bad is it?\nNo current threat detected. Maintain current field management.\n💊 What to do\n• Continue scheduled fertilization and irrigation\n• Monitor weekly for early signs of stress\n🛡️ How to prevent it\n• Rotate crops each season\n• Keep field bunds clear to reduce pest habitat`;
      }
      // Generic fallback
      return `🔍 What is it?\nDetected: ${pred}. Consult your local agricultural extension officer for precise identification.\n⚠️ How bad is it?\nSeverity depends on spread — act early for best results.\n💊 What to do\n• Isolate affected area immediately\n• Contact your local agri-extension center for specific treatment\n🛡️ How to prevent it\n• Use certified seeds and practice crop rotation\n• Conduct regular field scouting every 7–10 days`;
    }

    let cure = getFallbackAdvice(prediction);
    let aiSuccess = false;
    let retries = 3;

    // Phase 1: Try Gemini
    logs.push("Attempting Gemini AI...");
    while (retries > 0 && !aiSuccess) {
      try {
        const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: geminiController.signal
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            cure = text;
            logs.push("Gemini advice received successfully");
            aiSuccess = true;
          }
        } else if (aiResp.status === 429) {
          logs.push(`Gemini rate limited (429). Retrying... (${retries - 1} left)`);
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 2000));
        } else {
          const errText = await aiResp.text();
          logs.push(`Gemini API error: ${aiResp.status} - ${errText}`);
          break; 
        }
      } catch (e) {
        logs.push("Gemini API attempt failed: " + e.message);
        retries--;
      }
    }

    // Phase 2: Try Groq as fallback
    if (!aiSuccess) {
      const groqApiKey = Deno.env.get("GROQ_API_KEY");
      if (groqApiKey) {
        logs.push("Gemini failed. Attempting Groq AI fallback...");
        try {
          const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: "You are a professional rice agricultural expert." },
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 500
            }),
            signal: geminiController.signal
          });

          if (groqResp.ok) {
            const groqData = await groqResp.json();
            const text = groqData.choices?.[0]?.message?.content;
            if (text) {
              cure = text;
              logs.push("Groq advice received successfully");
              aiSuccess = true;
            }
          } else {
            logs.push(`Groq API error: ${groqResp.status}`);
          }
        } catch (e) {
          logs.push("Groq API attempt failed: " + e.message);
        }
      } else {
        logs.push("Groq API Key not found, skipping Groq fallback.");
      }
    }

    if (!aiSuccess) {
      logs.push("All AI providers failed. Using built-in expert advice fallback.");
    }
    
    clearTimeout(geminiTimeoutId);

    logs.push("Saving to database");
    try {
      const { error: insertError } = await supabase.from("predictions").insert({
        user_id,
        image_url,
        model_type,
        prediction,
        cure,
        temperature,
        humidity,
        latitude,
        longitude
      });
      if (insertError) logs.push(`DB Insert Error: ${insertError.message}`);
      else logs.push("Saved successfully");
    } catch (dbErr: any) {
      logs.push(`DB Exception: ${dbErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, prediction, cure, user_email: null, logs }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message, logs: logs || [] }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
