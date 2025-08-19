import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Simple embedder using OpenAI
async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: texts
    })
  });
  
  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];

    console.log(`Processing ${files.length} files for document ingestion`);

    const points: any[] = [];

    for (const file of files) {
      console.log(`Processing file: ${file.name}, type: ${file.type}`);
      
      const buf = new Uint8Array(await file.arrayBuffer());
      const mime = file.type.toLowerCase();

      if (mime.includes("pdf")) {
        // Simple PDF handling - in production, use proper PDF parser
        const text = `PDF Document: ${file.name} (${buf.length} bytes)`;
        const chunks = text.match(/[\s\S]{1,1000}/g) ?? [];
        const vectors = await embed(chunks);
        
        chunks.forEach((content, i) => {
          points.push({
            id: crypto.randomUUID(),
            vector: vectors[i],
            payload: { 
              content, 
              source_type: "pdf", 
              file_name: file.name, 
              timestamp: new Date().toISOString() 
            }
          });
        });
      } else if (mime.includes("image/")) {
        // Process image with GPT-4o vision
        const base64 = btoa(String.fromCharCode(...buf));
        
        const vision = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: 'Extract structured beauty product info from images. For shade charts, return detailed product information.' 
              },
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: 'Extract product names, brands, categories, finishes, undertones, shade names and hex codes. Return as JSON array.' 
                  },
                  { 
                    type: 'image_url', 
                    image_url: { url: `data:${file.type};base64,${base64}` }
                  }
                ]
              }
            ]
          })
        });
        
        const visionResult = await vision.json();
        const textJSON = visionResult.choices[0]?.message?.content ?? "[]";
        
        const vectors = await embed([textJSON]);
        points.push({
          id: crypto.randomUUID(),
          vector: vectors[0],
          payload: { 
            content: textJSON, 
            source_type: "image", 
            file_name: file.name, 
            timestamp: new Date().toISOString() 
          }
        });
      } else if (mime.includes("csv") || mime.includes("json")) {
        const text = new TextDecoder().decode(buf);
        const chunks = text.match(/[\s\S]{1,2000}/g) ?? [];
        const vectors = await embed(chunks);
        
        chunks.forEach((content, i) => {
          points.push({
            id: crypto.randomUUID(),
            vector: vectors[i],
            payload: { 
              content, 
              source_type: mime.includes("csv") ? "csv" : "json", 
              file_name: file.name, 
              timestamp: new Date().toISOString() 
            }
          });
        });
      }
    }

    console.log(`Generated ${points.length} points for vector storage`);

    // In production, this would upsert to Qdrant
    // await qdrant.upsert(COLLECTION_DOCS, { wait: true, points });

    return new Response(
      JSON.stringify({ ok: true, count: points.length, message: "Documents processed successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in beauty-ingest-docs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});