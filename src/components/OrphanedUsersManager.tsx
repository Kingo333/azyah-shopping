import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, RefreshCw, Users } from 'lucide-react';

interface OrphanedUser {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  brand_count: number;
  product_count: number;
}

const OrphanedUsersManager = () => {
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchOrphanedUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_orphaned_users');
      
      if (error) {
        throw error;
      }
      
      setOrphanedUsers(data || []);
      
      if (data?.length > 0) {
        toast.warning(`Found ${data.length} orphaned user(s) in the database`);
      } else {
        toast.success('No orphaned users detected');
      }
    } catch (error: any) {
      console.error('Error fetching orphaned users:', error);
      toast.error('Failed to fetch orphaned users');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrphanedUser = async (email: string, userId: string) => {
    if (!confirm(`Delete orphaned user ${email}? This cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          email,
          justification: 'Automated cleanup of orphaned user record',
          forceDelete: true
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(`Orphaned user ${email} has been deleted`);
        await fetchOrphanedUsers(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to delete orphaned user');
      }
    } catch (error: any) {
      console.error('Error deleting orphaned user:', error);
      toast.error(`Failed to delete orphaned user: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchOrphanedUsers();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Orphaned Users Manager
          </CardTitle>
          <CardDescription>
            Detect and clean up users that exist in the database but not in the authentication system.
            These records can be left behind when deletion processes are incomplete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-700 border-orange-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {orphanedUsers.length} Orphaned Users
              </Badge>
            </div>
            <Button 
              onClick={fetchOrphanedUsers}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {orphanedUsers.length === 0 && !loading && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                No orphaned users detected. The database integrity looks good!
              </AlertDescription>
            </Alert>
          )}

          {orphanedUsers.length > 0 && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Orphaned Users Detected:</strong> These users exist in the database but not in the authentication system.
                  They should be cleaned up to maintain data integrity.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {orphanedUsers.map((user) => (
                  <Card key={user.user_id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.email}</span>
                            <Badge variant="secondary">{user.role}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>User ID:</strong> {user.user_id}</p>
                            <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                            <p><strong>Brands:</strong> {user.brand_count} | <strong>Products:</strong> {user.product_count}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => deleteOrphanedUser(user.email, user.user_id)}
                          disabled={deleting === user.user_id}
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleting === user.user_id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrphanedUsersManager;