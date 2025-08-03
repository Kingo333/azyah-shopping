import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Grid3X3, LayoutGrid, Heart, Eye, Share2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Closet {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  is_public: boolean;
  owner_name: string;
  owner_avatar: string | null;
  items_count: number;
  likes_count: number;
  views_count: number;
  created_at: string;
  tags: string[];
}

interface MoodBoard {
  id: string;
  title: string;
  description: string;
  images: string[];
  is_public: boolean;
  owner_name: string;
  likes_count: number;
  created_at: string;
}

const Closets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'explore' | 'my-closets' | 'mood-boards'>('explore');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [closets, setClosets] = useState<Closet[]>([]);
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCloset, setNewCloset] = useState({ title: '', description: '', tags: '' });

  // Mock data for demonstration
  useEffect(() => {
    const mockClosets: Closet[] = [
      {
        id: '1',
        title: 'Summer Essentials 2024',
        description: 'My curated collection of must-have summer pieces',
        cover_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        is_public: true,
        owner_name: 'Sarah Johnson',
        owner_avatar: null,
        items_count: 24,
        likes_count: 142,
        views_count: 1250,
        created_at: '2024-01-15',
        tags: ['summer', 'essentials', 'casual']
      },
      {
        id: '2',
        title: 'Workwear Capsule',
        description: 'Professional pieces that transition from desk to dinner',
        cover_image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
        is_public: true,
        owner_name: 'Maya Chen',
        owner_avatar: null,
        items_count: 18,
        likes_count: 89,
        views_count: 620,
        created_at: '2024-01-10',
        tags: ['workwear', 'professional', 'capsule']
      },
      {
        id: '3',
        title: 'Sustainable Fashion Finds',
        description: 'Eco-friendly brands and timeless pieces',
        cover_image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
        is_public: true,
        owner_name: 'Alex Rivera',
        owner_avatar: null,
        items_count: 31,
        likes_count: 203,
        views_count: 890,
        created_at: '2024-01-08',
        tags: ['sustainable', 'eco-friendly', 'ethical']
      }
    ];

    const mockMoodBoards: MoodBoard[] = [
      {
        id: '1',
        title: 'Minimalist Aesthetic',
        description: 'Clean lines and neutral tones',
        images: [
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300',
          'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300',
          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300'
        ],
        is_public: true,
        owner_name: 'Emma Wilson',
        likes_count: 156,
        created_at: '2024-01-12'
      }
    ];

    setClosets(mockClosets);
    setMoodBoards(mockMoodBoards);
    setIsLoading(false);
  }, []);

  const handleCreateCloset = async () => {
    if (!user || !newCloset.title.trim()) return;

    try {
      // This would integrate with the database when closet tables are created
      toast({
        title: "Closet created!",
        description: "Your new closet has been created successfully.",
      });
      
      setNewCloset({ title: '', description: '', tags: '' });
      setShowCreateModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create closet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = (closetId: string) => {
    setClosets(prev => prev.map(closet => 
      closet.id === closetId 
        ? { ...closet, likes_count: closet.likes_count + 1 }
        : closet
    ));
  };

  const filteredClosets = closets.filter(closet =>
    closet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    closet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    closet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Closets & Mood Boards</h1>
              <p className="text-muted-foreground">Discover and create curated fashion collections</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Closet
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-4">
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
            <Button
              variant={activeTab === 'mood-boards' ? 'default' : 'outline'}
              onClick={() => setActiveTab('mood-boards')}
            >
              Mood Boards
            </Button>
          </div>

          {/* Search and View Controls */}
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
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('masonry')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Closet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Closet</CardTitle>
              <CardDescription>Start curating your fashion collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Closet title..."
                  value={newCloset.title}
                  onChange={(e) => setNewCloset(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Description (optional)..."
                  value={newCloset.description}
                  onChange={(e) => setNewCloset(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Input
                  placeholder="Tags (comma separated)..."
                  value={newCloset.tags}
                  onChange={(e) => setNewCloset(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCloset} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl p-4">
        {activeTab === 'explore' && (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'columns-1 md:columns-2 lg:columns-3 xl:columns-4'
          }`}>
            {filteredClosets.map(closet => (
              <Card key={closet.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={closet.cover_image}
                    alt={closet.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate flex-1">{closet.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(closet.id)}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {closet.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={closet.owner_avatar || undefined} />
                      <AvatarFallback className="text-xs">{closet.owner_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">{closet.owner_name}</span>
                  </div>
                  
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {closet.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {closet.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {closet.likes_count}
                      </span>
                    </div>
                    <span>{closet.items_count} items</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'my-closets' && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Grid3X3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No closets yet</h3>
              <p className="text-muted-foreground">
                Create your first closet to start curating your fashion collection
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Closet
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'mood-boards' && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {moodBoards.map(board => (
              <Card key={board.id} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-1">
                  {board.images.slice(0, 4).map((image, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden">
                      <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{board.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{board.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">by {board.owner_name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {board.likes_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Closets;