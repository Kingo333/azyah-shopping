import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, User, AlertTriangle, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface UserStatus {
  existsInPublic: boolean;
  existsInAuth: boolean;
  userId?: string;
  role?: string;
  brandCount?: number;
  productCount?: number;
  createdAt?: string;
  isOrphaned?: boolean;
}

const UserDeletionTool = () => {
  const [email, setEmail] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [result, setResult] = useState<any>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const checkUserStatus = async () => {
    if (!email.trim()) return;
    
    setChecking(true);
    try {
      // Check if user exists in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, role, created_at')
        .ilike('email', email.trim()) // Case insensitive search
        .maybeSingle();

      if (publicError && publicError.code !== 'PGRST116') {
        throw publicError;
      }

      // Check if user exists in auth by calling our enhanced admin function
      const { data: statusCheck } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          email: email.trim(),
          justification: 'Status check only',
          checkOnly: true
        }
      });

      // Check brand count if user exists
      let brandCount = 0;
      let productCount = 0;
      if (publicUser) {
        const { data: brands } = await supabase
          .from('brands')
          .select('id')
          .eq('owner_user_id', publicUser.id);
        
        brandCount = brands?.length || 0;

        if (brandCount > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id')
            .in('brand_id', brands?.map(b => b.id) || []);
          
          productCount = products?.length || 0;
        }
      }

      const existsInAuth = statusCheck?.userFound?.inAuth || false;
      const isOrphaned = !!publicUser && !existsInAuth;

      setUserStatus({
        existsInPublic: !!publicUser,
        existsInAuth,
        userId: publicUser?.id,
        role: publicUser?.role,
        brandCount,
        productCount,
        createdAt: publicUser?.created_at,
        isOrphaned
      });
    } catch (error: any) {
      console.error('Error checking user status:', error);
      toast.error('Failed to check user status');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (email.trim()) {
      checkUserStatus();
    }
  }, [email]);

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
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          email: email.trim(),
          justification: justification.trim(),
          forceDelete: forceDelete
        }
      });

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast.success(`User ${email} has been completely deleted from the system`);
        // Refresh user status to confirm deletion
        await checkUserStatus();
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
              disabled={loading || checking}
            />
            {checking && (
              <p className="text-xs text-muted-foreground mt-1">Checking user status...</p>
            )}
          </div>

          {userStatus && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">User Status:</span>
                    {userStatus.existsInPublic ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Found in Database
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Not Found - Can Sign Up
                      </Badge>
                    )}
                    {userStatus.isOrphaned && (
                      <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-700">
                        <AlertTriangle className="h-3 w-3" />
                        Orphaned User
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Auth Status:</span>
                    {userStatus.existsInAuth ? (
                      <Badge variant="secondary">In Auth System</Badge>
                    ) : (
                      <Badge variant="outline">Not in Auth</Badge>
                    )}
                  </div>
                  
                  {userStatus.existsInPublic && (
                    <div className="text-sm space-y-1">
                      <p><strong>User ID:</strong> {userStatus.userId}</p>
                      <p><strong>Role:</strong> {userStatus.role}</p>
                      <p><strong>Created:</strong> {new Date(userStatus.createdAt!).toLocaleString()}</p>
                      <p><strong>Brands Owned:</strong> {userStatus.brandCount}</p>
                      <p><strong>Products:</strong> {userStatus.productCount}</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {userStatus?.isOrphaned && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Orphaned User Detected:</strong> This user exists in the database but not in the authentication system. 
                This can happen when deletion was incomplete. Use Force Delete to clean up orphaned records.
              </AlertDescription>
            </Alert>
          )}

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

          {userStatus?.existsInPublic && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This user still exists in the system and has {userStatus.brandCount} brand(s) and {userStatus.productCount} product(s).
                Deletion will permanently remove ALL associated data.
              </AlertDescription>
            </Alert>
          )}

          {userStatus?.existsInPublic && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="force-delete" 
                checked={forceDelete}
                onCheckedChange={(checked) => setForceDelete(checked === true)}
              />
              <label htmlFor="force-delete" className="text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Force Delete (bypass additional checks for orphaned users)
                </div>
              </label>
            </div>
          )}

          <Button 
            onClick={handleDeleteUser}
            disabled={loading || checking || !email.trim() || justification.length < 10 || (!userStatus?.existsInPublic && !forceDelete)}
            variant="destructive"
            className="w-full"
          >
            {loading ? 'Deleting User...' : checking ? 'Checking User...' : userStatus?.existsInPublic || forceDelete ? 'DELETE USER PERMANENTLY' : 'User Not Found - No Action Needed'}
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