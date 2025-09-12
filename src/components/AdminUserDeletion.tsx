import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export const AdminUserDeletion = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const deleteUser = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          email: 'gabelaka79@gmail.com',
          justification: 'Complete user deletion requested by admin',
          forceDelete: true,
          checkOnly: false
        }
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete user",
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      toast({
        title: "User Deleted",
        description: `User gabelaka79@gmail.com has been completely deleted`,
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Delete User: gabelaka79@gmail.com</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={deleteUser} 
          disabled={isDeleting}
          variant="destructive"
          className="w-full"
        >
          {isDeleting ? 'Deleting User...' : 'Delete User Completely'}
        </Button>
        
        {result && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Deletion Result:</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};