import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UserDeletionTool = () => {
  const [email, setEmail] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDeleteUser = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!justification.trim() || justification.length < 10) {
      toast.error('Please provide a detailed justification (minimum 10 characters)');
      return;
    }

    const confirmed = window.confirm(
      `Are you absolutely sure you want to PERMANENTLY delete all data for user: ${email}?\n\n` +
      `This action CANNOT be undone and will:\n` +
      `- Delete ALL user data across all tables\n` +
      `- Remove the user from the authentication system\n` +
      `- Delete any brands/retailers they own\n` +
      `- Delete all their products, posts, and content\n\n` +
      `Type "DELETE" to confirm this is intentional.`
    );

    if (!confirmed) return;

    const secondConfirmation = window.prompt(
      'Type "DELETE" to confirm permanent deletion:'
    );

    if (secondConfirmation !== 'DELETE') {
      toast.error('Confirmation failed. User deletion cancelled.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: {
          email: email.trim(),
          justification: justification.trim()
        }
      });

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast.success(`User ${email} has been completely deleted from the system`);
        setEmail('');
        setJustification('');
      } else {
        toast.error(data.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'An error occurred while deleting the user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ User Deletion Tool</CardTitle>
          <CardDescription>
            Permanently delete a user and ALL associated data from the system. 
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              User Email to Delete
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="justification" className="block text-sm font-medium mb-2">
              Justification for Deletion (Required)
            </label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide a detailed reason for this deletion..."
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 10 characters required
            </p>
          </div>

          <Button 
            onClick={handleDeleteUser}
            disabled={loading || !email.trim() || justification.length < 10}
            variant="destructive"
            className="w-full"
          >
            {loading ? 'Deleting User...' : 'DELETE USER PERMANENTLY'}
          </Button>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                  Deletion Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDeletionTool;