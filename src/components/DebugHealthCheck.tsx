import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function DebugHealthCheck() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async (functionName: string) => {
    setLoading(true);
    try {
      // Direct GET request to health endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ`,
        }
      });
      
      const data = await response.json();
      setHealthData({ [functionName]: data });
      console.log(`${functionName} health:`, data);
    } catch (error) {
      console.error(`${functionName} health check failed:`, error);
      setHealthData({ [functionName]: { error: error.message } });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Edge Function Health Check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => checkHealth('beauty-text-consult')} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          Check Text Consult Health
        </Button>
        
        <Button 
          onClick={() => checkHealth('beauty-consult')} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          Check Beauty Consult Health
        </Button>

        {healthData && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}