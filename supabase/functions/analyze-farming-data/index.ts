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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { predictions, stats } = await req.json();

    const prompt = `You are an expert Rice (Paddy) Agricultural AI Analyst. 
    Analyze the following farming data and provide a structured report. 
    IMPORTANT: Do NOT use markdown symbols like # or **. Instead, use raw HTML <b> tags for headings and important words.
    
    Structure your response exactly as follows:
    <b>🌾 Rice Cultivation Analysis Report</b>
    
    <b>📈 1. Paddy Situation Overview</b>
    [Your analysis here with occasional emoji]
    
    <b>🚨 2. Critical Alerts</b>
    [List critical risks here with ⚠️ or 🛑 emojis]
    
    <b>💡 3. Rice Cultivation Recommendations</b>
    [Bullet points using <b> for key actions and relevant farming emojis]

    Field Data:
    - Total Rice Analyses: ${stats.total}
    - Disease Scans: ${stats.diseases}
    - Pest Scans: ${stats.pests}
    - Recent Predictions: ${predictions.map((p: any) => p.prediction).join(", ")}

    Keep it under 150 words. Use professional language.`;

    let insights = "Unable to generate insights at this time.";
    let aiSuccess = false;

    // Try Gemini
    try {
      const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          insights = text;
          aiSuccess = true;
        }
      } else {
        console.warn(`Gemini API error: ${aiResp.status}`);
      }
    } catch (e) {
      console.error("Gemini failed:", e.message);
    }

    // Try Groq as Fallback
    if (!aiSuccess) {
      const groqApiKey = Deno.env.get("GROQ_API_KEY");
      if (groqApiKey) {
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
              temperature: 0.7
            }),
          });

          if (groqResp.ok) {
            const groqData = await groqResp.json();
            const text = groqData.choices?.[0]?.message?.content;
            if (text) {
              insights = text;
              aiSuccess = true;
            }
          }
        } catch (e) {
          console.error("Groq fallback failed:", e.message);
        }
      }
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
