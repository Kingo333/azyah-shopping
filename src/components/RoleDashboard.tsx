import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Copy, Edit, Trash, UserPlus, CheckCircle, XCircle, AlertTriangle, ShieldAlert, ShieldCheck, ArrowLeft, ArrowRight, RefreshCcw, Plus, User, Mail, Lock, HelpCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GlassPanel } from '@/components/ui/glass-panel';
import { AiStudioModal } from '@/components/AiStudioModal';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

const RoleDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAiStudioModalOpen, setIsAiStudioModalOpen] = useState(false);
  const [showAiStudio, setShowAiStudio] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            role,
            created_at,
            updated_at,
            is_active,
            profile:profiles!inner(full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching profiles:', error);
          setError(error.message);
        } else if (data) {
          setProfiles(data as UserProfile[]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [user, router]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({
        title: 'Error',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            role: 'user', // Default role
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Error creating user:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        console.log('User created successfully:', data);
        toast({
          title: 'Success',
          description: 'User created successfully. Check email to verify.',
        });
        setIsCreateModalOpen(false);
        setNewEmail('');
        setNewPassword('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId);

      if (error) {
        console.error('Error toggling active status:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setProfiles(profiles.map(p =>
          p.id === profileId ? { ...p, is_active: !currentStatus } : p
        ));
        toast({
          title: 'Success',
          description: `User ${currentStatus ? 'deactivated' : 'activated'} successfully.`,
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      router.push('/login');
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading profiles...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Role Dashboard</h1>
          <p className="text-muted-foreground">Manage user roles and permissions.</p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Profiles</CardTitle>
          <CardDescription>A list of all user profiles in the system.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar>
                        <AvatarImage src={profile.profile?.avatar_url || `https://avatar.vercel.sh/${profile.profile?.full_name || profile.email}.png`} />
                        <AvatarFallback>{profile.profile?.full_name?.slice(0, 2)?.toUpperCase() || profile.email?.slice(0, 2)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{profile.profile?.full_name || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.role}</TableCell>
                  <TableCell>
                    <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(profile.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy user ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(profile.id, profile.is_active)}>
                          {profile.is_active ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Enter the email and password for the new user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input type="password" id="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateUser}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Studio Button */}
      <Button onClick={() => setShowAiStudio(true)} className="w-full mt-4">
        <Sparkles className="h-4 w-4 mr-2" />
        Open AI Studio
      </Button>

      {/* AI Studio Modal */}
      <AiStudioModal 
        isOpen={showAiStudio} 
        onClose={() => setShowAiStudio(false)} 
      />
    </div>
  );
};

export default RoleDashboard;
