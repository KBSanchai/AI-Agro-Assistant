const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- AWS LAB CREDENTIALS (PASTE NEW KEYS HERE) ---
const LAB_ACCESS_KEY = ""; 
const LAB_SECRET_KEY = "";
const LAB_SESSION_TOKEN = "";
// ------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now accepting multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const model_type = formData.get("model_type") as string;

    if (!file || !model_type) {
      return new Response(JSON.stringify({ error: "file and model_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/${timestamp}.${fileExt}`;

    // 1. Upload to Supabase Storage (using service_role for direct access)
    const { data: storageData, error: storageError } = await supabase.storage
      .from("crop-images")
      .upload(filePath, fileBytes, { contentType: file.type, upsert: true });

    if (storageError) {
      console.error("Supabase storage sync error:", storageError);
    }

    const { data: { publicUrl: supabaseImageUrl } } = supabase.storage
      .from("crop-images")
      .getPublicUrl(filePath);

    // 2. Upload to S3 for backup (using LAB keys if provided, else Secrets)
    let s3Url: string | null = null;
    try {
      const accessKeyId = LAB_ACCESS_KEY || Deno.env.get("AWS_ACCESS_KEY_ID");
      const secretAccessKey = LAB_SECRET_KEY || Deno.env.get("AWS_SECRET_ACCESS_KEY");
      const sessionToken = LAB_SESSION_TOKEN || Deno.env.get("AWS_SESSION_TOKEN");
      const region = Deno.env.get("AWS_REGION") || "us-east-1";
      const bucket = Deno.env.get("AWS_S3_BUCKET") || "cropimagesave";

      if (accessKeyId && secretAccessKey) {
        const key = `${user.id}/${timestamp}_backup.${fileExt}`;
        const contentType = file.type || "image/jpeg";

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").substring(0, 15) + "Z";
        const dateStamp = amzDate.substring(0, 8);
        const host = `${bucket}.s3.${region}.amazonaws.com`;

        const payloadHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", fileBytes)))
          .map(b => b.toString(16).padStart(2, '0')).join('');

        const canonicalUri = "/" + key.split("/").map(encodeURIComponent).join("/");
        
        let canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        let signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
        if (sessionToken) {
          canonicalHeaders += `x-amz-security-token:${sessionToken}\n`;
          signedHeaders += ";x-amz-security-token";
        }

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
        
        const headers: Record<string, string> = { 
          "Content-Type": contentType, "Host": host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, "Authorization": authorization 
        };
        if (sessionToken) headers["x-amz-security-token"] = sessionToken;

        const s3Resp = await fetch(s3PutUrl, { method: "PUT", headers, body: fileBytes });
        if (s3Resp.ok) {
          s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          console.log("S3 backup uploaded:", s3Url);
        } else {
          console.warn("S3 backup failed:", s3Resp.status, await s3Resp.text());
        }
      }
    } catch (s3Err) {
      console.warn("S3 backup error:", s3Err);
    }

    // 3. Send to HF
    const hfUrl = model_type === "fertilizer"
        ? "https://sanchaiKB-fertilizer-model.hf.space/predict"
        : "https://sanchaikb-crop-insect-classifier.hf.space/predict";

    const hfFormData = new FormData();
    hfFormData.append("file", file, file.name);

    const hfResp = await fetch(hfUrl, { method: "POST", body: hfFormData });
    
    let prediction = "Unknown";
    if (hfResp.ok) {
      const hfData = await hfResp.json();
      prediction = hfData.prediction || hfData.label || hfData.class || JSON.stringify(hfData);
    } else {
      console.error("HF API error:", hfResp.status);
      prediction = "Model unavailable";
    }

    // 4. Call Lovable AI for cure
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a friendly farming advisor. Use simple language. Under 150 words." },
          { role: "user", content: `Detected: "${prediction}" on a crop (${model_type}). Give treatment advice.` },
        ],
      }),
    });

    let cure = "Unable to generate treatment recommendation.";
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      cure = aiData.choices?.[0]?.message?.content || cure;
    }

    // 5. Store in DB
    const { error: dbError } = await supabase.from("predictions").insert({
      user_id: user.id,
      image_url: supabaseImageUrl,
      s3_url: s3Url,
      model_type,
      prediction,
      cure,
    });
    if (dbError) console.error("Database insert error:", dbError);

    return new Response(JSON.stringify({ prediction, cure, user_email: user.email, s3_url: s3Url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
