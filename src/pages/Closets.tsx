import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useClosets, usePublicClosets, useCreateCloset } from '@/hooks/useClosets';
import { Grid3X3, Search, Plus, Star, Lock, Globe, Heart, Palette } from 'lucide-react';
import { MoodBoardBuilder } from '@/components/MoodBoardBuilder';

const LoadingFallback = () => (
  <div className="space-y-4">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-64 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

const Closets = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'my-closets'>('my-closets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClosetData, setNewClosetData] = useState({
    title: '',
    description: '',
    is_public: false
  });
  const [showMoodBoardBuilder, setShowMoodBoardBuilder] = useState(false);
  const [selectedClosetId, setSelectedClosetId] = useState<string | null>(null);

  const { data: myClosets, isLoading: loadingMyClosets } = useClosets();
  const { data: publicClosets, isLoading: loadingPublicClosets } = usePublicClosets();
  const createClosetMutation = useCreateCloset();

  const handleCreateCloset = async () => {
    if (!newClosetData.title.trim()) return;
    
    try {
      await createClosetMutation.mutateAsync(newClosetData);
      setShowCreateModal(false);
      setNewClosetData({ title: '', description: '', is_public: false });
    } catch (error) {
      console.error('Error creating closet:', error);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Closets</h1>
                <p className="text-muted-foreground">Discover and create curated fashion collections</p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="flex gap-4">
              <Button
                variant={activeTab === 'explore' ? 'default' : 'outline'}
                onClick={() => setActiveTab('explore')}
              >
                Explore
              </Button>
              <Button
                variant={activeTab === 'my-closets' ? 'default' : 'outline'}
                onClick={() => setActiveTab('my-closets')}
              >
                My Closets
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  if (myClosets && myClosets.length > 0) {
                    setSelectedClosetId(myClosets[0].id);
                    setShowMoodBoardBuilder(true);
                  }
                }}
                disabled={!myClosets || myClosets.length === 0}
              >
                <Palette className="h-4 w-4 mr-2" />
                Create Look
              </Button>
              
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Closet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Closet</DialogTitle>
                  </DialogHeader>
                  <CreateClosetForm 
                    newClosetData={newClosetData}
                    setNewClosetData={setNewClosetData}
                    onSubmit={handleCreateCloset}
                    isLoading={createClosetMutation.isPending}
                    onCancel={() => setShowCreateModal(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search closets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-4">
        {activeTab === 'explore' && (
          <div>
            {loadingPublicClosets ? (
              <LoadingFallback />
            ) : publicClosets && publicClosets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {publicClosets.map((closet: any) => (
                  <Card key={closet.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg truncate">{closet.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-green-500" />
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm ml-1">
                              {closet.closet_ratings?.length > 0 
                                ? (closet.closet_ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / closet.closet_ratings.length).toFixed(1)
                                : '0.0'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      {closet.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{closet.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary" />
                          <span className="text-sm">{closet.users?.name || 'Anonymous'}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <Heart className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-4">No public closets found</h3>
                <p className="text-muted-foreground">Be the first to share your closet with the community!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-closets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your Fashion Collections</h2>
                <p className="text-sm text-muted-foreground">Organize your wardrobe and create stunning mood boards</p>
              </div>
            </div>
            {loadingMyClosets ? (
              <LoadingFallback />
            ) : myClosets && myClosets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myClosets.map((closet) => (
                  <ClosetCard 
                    key={closet.id} 
                    closet={closet}
                    onCreateLook={() => {
                      setSelectedClosetId(closet.id);
                      setShowMoodBoardBuilder(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyClosetsState 
                onCreateFirst={() => setShowCreateModal(true)}
                newClosetData={newClosetData}
                setNewClosetData={setNewClosetData}
                handleCreateCloset={handleCreateCloset}
                createClosetMutation={createClosetMutation}
              />
            )}
          </div>
        )}

        {/* Mood Board Builder */}
        {showMoodBoardBuilder && selectedClosetId && (
          <MoodBoardBuilder
            closetId={selectedClosetId}
            onClose={() => {
              setShowMoodBoardBuilder(false);
              setSelectedClosetId(null);
            }}
          />
        )}

      </div>
    </div>
  );
};

// Separate components for better organization
interface ClosetCardProps {
  closet: any;
  onCreateLook: () => void;
}

const ClosetCard: React.FC<ClosetCardProps> = ({ closet, onCreateLook }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{closet.title}</CardTitle>
          <div className="flex items-center gap-2">
            {closet.is_public ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-gray-500" />
            )}
            <Badge variant={closet.is_public ? 'default' : 'secondary'}>
              {closet.is_public ? 'Public' : 'Private'}
            </Badge>
          </div>
        </div>
        {closet.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{closet.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Item thumbnails preview */}
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center"
              >
                <span className="text-xs text-gray-500">{i}</span>
              </div>
            ))}
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-white flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Created {new Date(closet.created_at).toLocaleDateString()}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Items
              </Button>
              <Button size="sm" onClick={onCreateLook}>
                <Palette className="h-4 w-4 mr-1" />
                Create Look
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface CreateClosetFormProps {
  newClosetData: any;
  setNewClosetData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onCancel: () => void;
}

const CreateClosetForm: React.FC<CreateClosetFormProps> = ({
  newClosetData,
  setNewClosetData,
  onSubmit,
  isLoading,
  onCancel
}) => {
  return (
    <div className="space-y-4">
      {/* Inspiration thumbnails */}
      <div className="space-y-2">
        <Label>Get inspired by these collections</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'Minimalist', color: 'from-gray-100 to-gray-200' },
            { name: 'Colorful', color: 'from-pink-100 to-purple-200' },
            { name: 'Professional', color: 'from-blue-100 to-indigo-200' },
            { name: 'Casual', color: 'from-green-100 to-emerald-200' }
          ].map((style) => (
            <div 
              key={style.name}
              className={`aspect-square rounded-lg bg-gradient-to-br ${style.color} flex items-center justify-center cursor-pointer hover:scale-105 transition-transform`}
              onClick={() => setNewClosetData(prev => ({ ...prev, title: style.name + ' Collection' }))}
            >
              <span className="text-xs font-medium text-gray-700">{style.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Closet Name</Label>
        <Input
          id="title"
          value={newClosetData.title}
          onChange={(e) => setNewClosetData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="My Fashion Collection"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={newClosetData.description}
          onChange={(e) => setNewClosetData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your closet..."
          rows={3}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="public"
          checked={newClosetData.is_public}
          onCheckedChange={(checked) => setNewClosetData(prev => ({ ...prev, is_public: checked }))}
        />
        <Label htmlFor="public">Make this closet public</Label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Closet'}
        </Button>
      </div>
    </div>
  );
};

interface EmptyClosetsStateProps {
  onCreateFirst: () => void;
  newClosetData: any;
  setNewClosetData: (data: any) => void;
  handleCreateCloset: () => void;
  createClosetMutation: any;
}

const EmptyClosetsState: React.FC<EmptyClosetsStateProps> = ({
  onCreateFirst,
  newClosetData,
  setNewClosetData,
  handleCreateCloset,
  createClosetMutation
}) => {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Grid3X3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No closets yet</h3>
        <p className="text-muted-foreground">
          Create your first closet to start curating your fashion collection and building stunning mood boards
        </p>
        <Button onClick={onCreateFirst}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Closet
        </Button>
      </div>
    </div>
  );
};

export default Closets;