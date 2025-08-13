import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safe scraping defaults
const SAFE_SCRAPE_DEFAULTS = {
  userAgent: 'AzyahImporter/1.0 (+contact: support@azyah.com)',
  cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

interface RobotsParser {
  domain: string;
  content: string;
  userAgent: string;
}

function parseRobots(robotsContent: string, userAgent: string = '*'): boolean {
  if (!robotsContent) return true;
  
  const lines = robotsContent.split('\n').map(line => line.trim().toLowerCase());
  let currentUserAgent = '';
  let rules: { directive: string; value: string }[] = [];
  let allowedPaths: string[] = [];
  let disallowedPaths: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('#') || line === '') continue;
    
    if (line.startsWith('user-agent:')) {
      // Process previous user-agent rules if they match
      if (currentUserAgent === userAgent.toLowerCase() || currentUserAgent === '*') {
        for (const rule of rules) {
          if (rule.directive === 'allow') {
            allowedPaths.push(rule.value);
          } else if (rule.directive === 'disallow') {
            disallowedPaths.push(rule.value);
          }
        }
      }
      
      currentUserAgent = line.split(':')[1]?.trim() || '';
      rules = [];
    } else if (line.includes(':')) {
      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      rules.push({ directive: directive.trim(), value });
    }
  }
  
  // Process final user-agent rules
  if (currentUserAgent === userAgent.toLowerCase() || currentUserAgent === '*') {
    for (const rule of rules) {
      if (rule.directive === 'allow') {
        allowedPaths.push(rule.value);
      } else if (rule.directive === 'disallow') {
        disallowedPaths.push(rule.value);
      }
    }
  }
  
  // Check if crawling is generally disallowed
  if (disallowedPaths.includes('/')) {
    return false;
  }
  
  // If no specific rules, assume allowed
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, userAgent = SAFE_SCRAPE_DEFAULTS.userAgent } = await req.json();
    
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking robots.txt for domain:', domain);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check cache first
    const { data: cachedRobots } = await supabase
      .from('robots_cache')
      .select('*')
      .eq('domain', domain)
      .single();

    const now = new Date();
    const cacheValid = cachedRobots && 
      (now.getTime() - new Date(cachedRobots.last_fetched).getTime()) < SAFE_SCRAPE_DEFAULTS.cacheExpiry;

    if (cacheValid) {
      console.log('Using cached robots.txt for', domain);
      return new Response(JSON.stringify({
        success: true,
        domain,
        allowed: cachedRobots.allows_crawling,
        cached: true,
        lastChecked: cachedRobots.last_fetched
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh robots.txt
    let robotsContent = '';
    let allowsCrawling = true;
    let fetchError = null;

    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      console.log('Fetching robots.txt from:', robotsUrl);
      
      const robotsResponse = await fetch(robotsUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/plain, text/*',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (robotsResponse.ok) {
        robotsContent = await robotsResponse.text();
        allowsCrawling = parseRobots(robotsContent, userAgent);
        console.log('Robots.txt fetched successfully. Allows crawling:', allowsCrawling);
      } else {
        console.log('Robots.txt not found or inaccessible, assuming allowed');
        allowsCrawling = true; // Be conservative - if no robots.txt, assume allowed
      }
    } catch (error) {
      console.log('Error fetching robots.txt:', error.message);
      fetchError = error.message;
      allowsCrawling = true; // Conservative default
    }

    // Update cache
    try {
      await supabase
        .from('robots_cache')
        .upsert({
          domain,
          robots_content: robotsContent,
          last_fetched: now.toISOString(),
          allows_crawling: allowsCrawling,
          user_agent_checked: userAgent,
          updated_at: now.toISOString()
        });
    } catch (cacheError) {
      console.error('Error updating robots cache:', cacheError);
    }

    return new Response(JSON.stringify({
      success: true,
      domain,
      allowed: allowsCrawling,
      cached: false,
      lastChecked: now.toISOString(),
      robotsContent: robotsContent.substring(0, 1000), // Truncate for response
      fetchError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in robots checker:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});