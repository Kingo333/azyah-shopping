import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSendFriendRequest, usePendingFriendRequests, useRespondFriendRequest } from '@/hooks/useFriends';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AddFriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const sendRequest = useSendFriendRequest();
  const { data: pendingRequests = [], isLoading: requestsLoading } = usePendingFriendRequests();
  const respondRequest = useRespondFriendRequest();

  // Search users
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!searchQuery && searchQuery.length >= 2,
  });

  const handleSendRequest = async (friendId: string) => {
    await sendRequest.mutateAsync(friendId);
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    await respondRequest.mutateAsync({ requestId, accept });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Friends</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="requests">
              Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {searching ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32 flex-1" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              ) : (
                searchResults.map((result) => (
                  <Card key={result.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback>
                          {result.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">@{result.username}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(result.id)}
                        disabled={sendRequest.isPending}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {requestsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32 flex-1" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending requests
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.requester?.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.requester?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">@{request.requester?.username}</p>
                        <p className="text-xs text-muted-foreground">Wants to be friends</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRespondRequest(request.id, true)}
                        disabled={respondRequest.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondRequest(request.id, false)}
                        disabled={respondRequest.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
