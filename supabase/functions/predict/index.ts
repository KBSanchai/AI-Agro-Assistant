const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== predict started ===");
    const authHeader = req.headers.get("Authorization");
    console.log("Step: auth | header present:", !!authHeader);

    if (!authHeader) {
      console.error("FAIL: no auth header");
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 200, // Return 200 so client can read the error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    console.log("Step: env | url:", !!supabaseUrl, "| key:", !!supabaseKey, "| google:", !!googleApiKey);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log("Step: getUser | user:", !!user, "| error:", userError?.message ?? "none");

    if (userError || !user) {
      console.error("FAIL: invalid token -", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid token: " + (userError?.message ?? "no user") }), {
        status: 200, // Return 200 so client can read the error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_url, model_type, temperature, humidity, plant_id } = await req.json();
    console.log("Step: json | image_url:", !!image_url, "| model_type:", model_type, "| temp:", temperature, "| hum:", humidity, "| plant:", plant_id);

    if (!image_url || !model_type) {
      return new Response(JSON.stringify({ error: "Missing image_url or model_type" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download image and send to Hugging Face
    console.log("Step: HF request");
    const imageResp = await fetch(image_url);
    const imageBlob = await imageResp.blob();

    const hfUrl = model_type === "fertilizer"
      ? "https://sanchaikb-fertilizer-model.hf.space/predict"
      : "https://sanchaikb-crop-insect-classifier.hf.space/predict";

    const hfFormData = new FormData();
    hfFormData.append("file", imageBlob, "image.jpg");

    const hfResp = await fetch(hfUrl, { method: "POST", body: hfFormData });
    let prediction = "Unknown";
    if (hfResp.ok) {
      const hfData = await hfResp.json();
      prediction = hfData.prediction || hfData.label || hfData.class || JSON.stringify(hfData);
    } else {
      console.error("HF error:", hfResp.status);
    }
    console.log("Step: HF done | prediction:", prediction);

    // Google Gemini
    let cure = "Treatment advice unavailable.";
    if (googleApiKey) {
      try {
        const prompt = `You are a friendly farming advisor. Write in very simple language for a farmer.

Format EXACTLY like this:

🔍 What is it?
[1-2 sentences]

⚠️ How bad is it?
[1 sentence]

💊 What to do
• [Step 1]
• [Step 2]
• [Step 3]

🛡️ How to prevent it
• [Tip 1]
• [Tip 2]

The AI detected: "${prediction}" (model: ${model_type}). Under 150 words.`;

        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        console.log("Step: Gemini | status:", geminiResp.status);
        if (geminiResp.ok) {
          const geminiData = await geminiResp.json();
          cure = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || cure;
        } else {
          const errText = await geminiResp.text();
          console.error("Gemini error:", errText);
        }
      } catch (e: any) {
        console.error("Gemini fetch error:", e.message);
      }
    }

    // Save to DB
    const { error: dbError } = await supabase.from("predictions").insert({
      user_id: user.id,
      image_url,
      model_type,
      prediction,
      cure,
      temperature: temperature || null,
      humidity: humidity || null,
      plant_id: (plant_id && plant_id !== "none") ? plant_id : null,
    });
    if (dbError) console.error("DB error:", dbError.message);
    console.log("Step: DB saved | error:", dbError?.message ?? "none");

    console.log("=== predict success ===");
    return new Response(
      JSON.stringify({ prediction, cure, user_email: user.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("CRASH:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
