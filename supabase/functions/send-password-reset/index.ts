import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client to generate reset link
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate password reset link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || `${Deno.env.get('APP_DASHBOARD_URL') || 'https://azyahstyle.com'}/auth?type=recovery`
      }
    });

    if (error) {
      throw new Error(`Failed to generate reset link: ${error.message}`);
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Azyah <noreply@azyahstyle.com>",
      to: [email],
      subject: "Reset Your Azyah Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Secure your Azyah account</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 32px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                Hello,
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 32px 0;">
                We received a request to reset the password for your Azyah account. Click the button below to create a new password:
              </p>
              
              <!-- Reset Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.properties.action_link}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 32px 0 0 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
                <strong>Security tip:</strong> This link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.
              </p>
              
              <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 24px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
                <br>
                <a href="${data.properties.action_link}" style="color: #667eea; word-break: break-all;">${data.properties.action_link}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Best regards,<br>
                <strong>The Azyah Team</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send password reset email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);