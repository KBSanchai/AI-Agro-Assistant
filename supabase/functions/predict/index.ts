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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_url, model_type } = await req.json();

    if (!image_url || !model_type) {
      return new Response(JSON.stringify({ error: "image_url and model_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also upload to S3 for backup (non-blocking, don't fail if S3 is down)
    let s3Url: string | null = null;
    try {
      const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
      const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
      const region = Deno.env.get("AWS_REGION") || "us-east-1";
      const bucket = Deno.env.get("AWS_S3_BUCKET") || "cropimagesave";

      if (accessKeyId && secretAccessKey) {
        const imageResp = await fetch(image_url);
        const imageBytes = new Uint8Array(await imageResp.arrayBuffer());
        const key = `${user.id}/${Date.now()}_backup.jpg`;
        const contentType = "image/jpeg";

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").substring(0, 15) + "Z";
        const dateStamp = amzDate.substring(0, 8);
        const host = `${bucket}.s3.${region}.amazonaws.com`;

        const payloadHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", imageBytes)))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        const canonicalUri = "/" + key.split("/").map(encodeURIComponent).join("/");
        const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
        const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

        const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
        const crHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crHash}`;

        async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
          const ck = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          return new Uint8Array(await crypto.subtle.sign("HMAC", ck, new TextEncoder().encode(msg)));
        }
        let sigKey = await hmac(new TextEncoder().encode("AWS4" + secretAccessKey), dateStamp);
        sigKey = await hmac(sigKey, region);
        sigKey = await hmac(sigKey, "s3");
        sigKey = await hmac(sigKey, "aws4_request");
        const sig = Array.from(await hmac(sigKey, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');

        const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
        const s3PutUrl = `https://${host}${canonicalUri}`;
        const s3Resp = await fetch(s3PutUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType, "Host": host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, "Authorization": authorization },
          body: imageBytes,
        });

        if (s3Resp.ok) {
          s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          console.log("S3 backup uploaded:", s3Url);
        } else {
          console.warn("S3 backup failed (non-critical):", s3Resp.status, await s3Resp.text());
        }
      }
    } catch (s3Err) {
      console.warn("S3 backup error (non-critical):", s3Err);
    }

    // Download image and send to HF
    const imageResp = await fetch(image_url);
    const imageBlob = await imageResp.blob();

    const hfUrl =
      model_type === "fertilizer"
        ? "https://sanchaiKB-fertilizer-model.hf.space/predict"
        : "https://sanchaikb-crop-insect-classifier.hf.space/predict";

    const formData = new FormData();
    formData.append("file", imageBlob, "image.jpg");

    const hfResp = await fetch(hfUrl, { method: "POST", body: formData });
    
    let prediction = "Unknown";
    if (hfResp.ok) {
      const hfData = await hfResp.json();
      prediction = hfData.prediction || hfData.label || hfData.class || JSON.stringify(hfData);
    } else {
      console.error("HF API error:", hfResp.status, await hfResp.text());
      prediction = "Model unavailable - using sample prediction";
    }

    // Call Lovable AI (Gemini Flash) for cure
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a friendly farming advisor speaking to a regular farmer. Write in very simple, clear language that anyone can understand. Avoid scientific jargon. Use short sentences.

Format your response EXACTLY like this:

🔍 What is it?
[1-2 simple sentences explaining what the problem is]

⚠️ How bad is it?
[1 sentence - mild/moderate/severe]

💊 What to do:
• [Step 1 - simple action]
• [Step 2 - simple action]
• [Step 3 - simple action]

🛡️ How to prevent it:
• [Tip 1]
• [Tip 2]

Keep the entire response under 150 words. Use everyday words a farmer would understand.`,
          },
          {
            role: "user",
            content: `The AI detected: "${prediction}" on a crop. Model used: ${model_type}. Give simple treatment advice.`,
          },
        ],
      }),
    });

    let cure = "Unable to generate treatment recommendation.";
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      cure = aiData.choices?.[0]?.message?.content || cure;
    } else {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        cure = "Rate limited. Please try again in a moment.";
      } else if (aiResp.status === 402) {
        cure = "AI credits exhausted. Please add funds.";
      }
    }

    // Store in DB
    await supabase.from("predictions").insert({
      user_id: user.id,
      image_url,
      model_type,
      prediction,
      cure,
    });

    return new Response(JSON.stringify({ prediction, cure, user_email: user.email, s3_url: s3Url }), {
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
