import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  userType: 'shopper' | 'brand' | 'retailer';
  feedbackType: 'feedback' | 'issue';
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userType, feedbackType, subject, message }: FeedbackRequest = await req.json();

    if (!userType || !feedbackType || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailSubject = `[${feedbackType.toUpperCase()}] ${subject} - ${userType.charAt(0).toUpperCase() + userType.slice(1)} Portal`;
    
    const emailHtml = `
      <h2>New ${feedbackType} from ${userType.charAt(0).toUpperCase() + userType.slice(1)} Portal</h2>
      <p><strong>Type:</strong> ${feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)}</p>
      <p><strong>User Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Sent from Azyah Style Platform</small></p>
    `;

    console.log('Sending feedback email:', { userType, feedbackType, subject });

    const emailResponse = await resend.emails.send({
      from: "Azyah Style <noreply@resend.dev>",
      to: ["info@azyahstyle.com"],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);