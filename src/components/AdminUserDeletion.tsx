import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

export const AdminUserDeletion = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleDeleteUser = async () => {
    const confirmed = confirm(
      `Are you absolutely sure you want to permanently delete abdullahiking33@gmail.com and ALL their data? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = confirm(
      `This will permanently delete the user and all associated data. Type YES in the next prompt to confirm.`
    );
    
    if (!doubleConfirm) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {}
      });

      if (error) {
        throw error;
      }

      toast({
        title: "User Deleted",
        description: "User abdullahiking33@gmail.com has been permanently deleted.",
      });

      console.log('Deletion result:', data);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Admin User Deletion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Target User: <strong>abdullahiking33@gmail.com</strong></p>
          <p className="text-xs mt-2 text-destructive">
            ⚠️ This will permanently delete the user and all their data
          </p>
        </div>
        
        <Button
          onClick={handleDeleteUser}
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting User...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              DELETE USER PERMANENTLY
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};