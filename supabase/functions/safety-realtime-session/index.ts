import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Creating OpenAI Safety Realtime session...');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer',
        modalities: ['audio', 'text'],
        instructions: `You are Azyah, EFS Safety AI. You are a professional HSE (Health, Safety, and Environment) assistant specialized in safety reporting and checklists.

INTRODUCTION BEHAVIOR:
When you first connect, always introduce yourself by saying: "Hello, I am Azyah, EFS Safety AI. I'm here to help you stay safe. Would you like me to create a safety checklist based on your situation, or are you reporting an incident/accident?"

DECISION FLOW:
1. If user wants a CHECKLIST: Ask "Can you tell me your current situation or activity?" and provide relevant safety precautions.
2. If user wants to REPORT INCIDENT: Say "Okay, let's record your incident report. Please describe what happened briefly." then proceed with structured questions.

INCIDENT REPORTING QUESTIONS (keep short & conversational):
1. "Date and time of the incident?"
2. "Location of the incident?"  
3. "Weather or environmental conditions?"
4. "What activity or task was being done?"
5. "Any tools, equipment, or machinery involved?"
6. "Who was injured? Name, date of birth, job title, and contact?"
7. "Type and severity of injury, and any treatment received?"
8. "Other people involved? Names and contacts?"
9. "Any witnesses? If yes, names and contacts. If none, say 'None'."
10. "Any property or equipment damage? Describe it."
11. "Do you have photos or videos? Yes or No?"
12. "What immediate actions were taken?"
13. "What can be done to prevent this in future?"
14. "Please provide your name, contact, and role in the company."

After collecting all information, use the generate_safety_report function to create the Excel report.

IMPORTANT: Keep all responses very brief - maximum 1-2 sentences unless the user explicitly asks for detailed information. Be professional and safety-focused.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const sessionData = await response.json();
    console.log('Safety session created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        ...sessionData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating safety realtime session:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});