import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Heart, 
  Share2, 
  MoreVertical, 
  Pin, 
  Eye,
  Grid3X3,
  LayoutGrid,
  Search,
  Filter,
  Download,
  Copy,
  Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface MoodBoardPin {
  id: string;
  image_url: string;
  title: string;
  description?: string;
  source_url?: string;
  product_id?: string;
}

interface MoodBoard {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  is_public: boolean;
  owner_name: string;
  owner_avatar: string | null;
  pins_count: number;
  likes_count: number;
  views_count: number;
  created_at: string;
  tags: string[];
  pins: MoodBoardPin[];
  is_collaborative?: boolean;
  collaborators?: string[];
}

interface MasonryMoodBoardsProps {
  viewMode?: 'grid' | 'masonry';
  onPinProduct?: (productId: string, boardId: string) => void;
  onShare?: (board: MoodBoard) => void;
}

const MasonryMoodBoards = ({ 
  viewMode = 'masonry', 
  onPinProduct, 
  onShare 
}: MasonryMoodBoardsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<MoodBoard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoard, setNewBoard] = useState({ 
    title: '', 
    description: '', 
    tags: '',
    is_public: true,
    is_collaborative: false
  });
  const [draggedPin, setDraggedPin] = useState<MoodBoardPin | null>(null);
  const masonryRef = useRef<HTMLDivElement>(null);

  // Mock data generator
  const generateMockBoards = (): MoodBoard[] => {
    const mockImages = [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=800',
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=500',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=700',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=600',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=550',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=750',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=600'
    ];

    const boardTitles = [
      'Minimalist Aesthetic',
      'Summer Vibes 2024',
      'Workwear Essentials',
      'Street Style Inspiration',
      'Vintage Fashion',
      'Sustainable Brands',
      'Color Blocking Ideas',
      'Capsule Wardrobe'
    ];

    return boardTitles.map((title, index) => {
      const pinCount = Math.floor(Math.random() * 15) + 5;
      const pins = Array.from({ length: pinCount }, (_, pinIndex) => ({
        id: `pin-${index}-${pinIndex}`,
        image_url: mockImages[pinIndex % mockImages.length],
        title: `Pin ${pinIndex + 1}`,
        description: `Beautiful fashion inspiration piece ${pinIndex + 1}`,
        source_url: 'https://example.com',
        product_id: `product-${pinIndex}`
      }));

      return {
        id: `board-${index}`,
        title,
        description: `A curated collection of ${title.toLowerCase()} inspiration`,
        cover_image: mockImages[index % mockImages.length],
        is_public: Math.random() > 0.3,
        owner_name: ['Sarah J.', 'Maya C.', 'Alex R.', 'Emma W.'][index % 4],
        owner_avatar: null,
        pins_count: pinCount,
        likes_count: Math.floor(Math.random() * 200) + 10,
        views_count: Math.floor(Math.random() * 1000) + 50,
        created_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['fashion', 'style', 'inspiration'].slice(0, Math.floor(Math.random() * 3) + 1),
        pins,
        is_collaborative: Math.random() > 0.7,
        collaborators: Math.random() > 0.5 ? ['user1', 'user2'] : []
      };
    });
  };

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setBoards(generateMockBoards());
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleCreateBoard = async () => {
    if (!user || !newBoard.title.trim()) return;

    try {
      const board: MoodBoard = {
        id: `new-board-${Date.now()}`,
        title: newBoard.title,
        description: newBoard.description,
        cover_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        is_public: newBoard.is_public,
        owner_name: user?.email?.split('@')[0] || 'Anonymous',
        owner_avatar: null,
        pins_count: 0,
        likes_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        tags: newBoard.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        pins: [],
        is_collaborative: newBoard.is_collaborative,
        collaborators: []
      };

      setBoards(prev => [board, ...prev]);
      
      toast({
        title: "Mood board created!",
        description: "Your new mood board is ready for pins.",
      });
      
      setNewBoard({ title: '', description: '', tags: '', is_public: true, is_collaborative: false });
      setShowCreateModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create mood board. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = (boardId: string) => {
    setBoards(prev => prev.map(board => 
      board.id === boardId 
        ? { ...board, likes_count: board.likes_count + 1 }
        : board
    ));
    
    toast({
      title: "Liked!",
      description: "You liked this mood board.",
    });
  };

  const handlePinDragStart = (pin: MoodBoardPin) => {
    setDraggedPin(pin);
  };

  const handlePinDragEnd = () => {
    setDraggedPin(null);
  };

  const handleBoardDrop = (e: React.DragEvent, boardId: string) => {
    e.preventDefault();
    if (draggedPin && onPinProduct) {
      onPinProduct(draggedPin.product_id || '', boardId);
      toast({
        title: "Pin added!",
        description: "Product has been pinned to the mood board.",
      });
    }
  };

  const handleShare = (board: MoodBoard) => {
    if (onShare) {
      onShare(board);
    } else {
      // Note: /mood-boards/:id route requires auth - sharing current page for logged-in context
      const shareUrl = `${window.location.origin}/mood-boards/${board.id}`;
      if (navigator.share) {
        navigator.share({
          title: board.title,
          text: board.description,
          url: shareUrl
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Mood board link copied to clipboard.",
        });
      }
    }
  };

  const filteredBoards = boards.filter(board =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'columns-1 md:columns-2 lg:columns-3 xl:columns-4'
        }`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div 
              key={i} 
              className={`bg-muted rounded-lg animate-pulse ${
                viewMode === 'masonry' ? 'mb-4' : ''
              }`}
              style={{ 
                height: viewMode === 'masonry' 
                  ? `${Math.floor(Math.random() * 200) + 200}px` 
                  : '300px' 
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mood boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Mood Board</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Board title..."
                  value={newBoard.title}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Description (optional)..."
                  value={newBoard.description}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
                <Input
                  placeholder="Tags (comma separated)..."
                  value={newBoard.tags}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, tags: e.target.value }))}
                />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newBoard.is_public}
                      onChange={(e) => setNewBoard(prev => ({ ...prev, is_public: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newBoard.is_collaborative}
                      onChange={(e) => setNewBoard(prev => ({ ...prev, is_collaborative: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Collaborative</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateBoard} className="flex-1">Create</Button>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mood Boards Grid */}
      <div 
        ref={masonryRef}
        className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
            : 'columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4'
        }`}
      >
        {filteredBoards.map(board => (
          <Card 
            key={board.id} 
            className={`overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer ${
              viewMode === 'masonry' ? 'break-inside-avoid mb-4' : ''
            }`}
            onClick={() => setSelectedBoard(board)}
            onDrop={(e) => handleBoardDrop(e, board.id)}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Cover Image */}
            <div className="relative overflow-hidden">
              <img
                src={board.cover_image}
                alt={board.title}
                className="w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Actions Overlay */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/20 backdrop-blur-sm border-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(board.id);
                  }}
                >
                  <Heart className="h-4 w-4 text-white" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/20 backdrop-blur-sm border-white/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleShare(board)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pin className="h-4 w-4 mr-2" />
                      Pin to Board
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Pins Count Indicator */}
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-white/20">
                  {board.pins_count} pins
                </Badge>
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg truncate flex-1">{board.title}</h3>
                {board.is_collaborative && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Collab
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {board.description}
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={board.owner_avatar || undefined} />
                  <AvatarFallback className="text-xs">{board.owner_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">{board.owner_name}</span>
                {board.collaborators && board.collaborators.length > 0 && (
                  <span className="text-xs text-muted-foreground">+ {board.collaborators.length}</span>
                )}
              </div>
              
              <div className="flex gap-1 mb-3 flex-wrap">
                {board.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {board.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{board.tags.length - 3}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {board.views_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {board.likes_count}
                  </span>
                </div>
                <span>{formatDistanceToNow(new Date(board.created_at), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Board Detail Modal */}
      {selectedBoard && (
        <Dialog open={!!selectedBoard} onOpenChange={() => setSelectedBoard(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedBoard.owner_avatar || undefined} />
                  <AvatarFallback>{selectedBoard.owner_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl">{selectedBoard.title}</h2>
                  <p className="text-sm text-muted-foreground">by {selectedBoard.owner_name}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedBoard.description}</p>
              
              <div className="flex gap-2 flex-wrap">
                {selectedBoard.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
              
              {/* Pins Grid */}
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                {selectedBoard.pins.map(pin => (
                  <div 
                    key={pin.id} 
                    className="break-inside-avoid mb-4 group cursor-pointer"
                    draggable
                    onDragStart={() => handlePinDragStart(pin)}
                    onDragEnd={handlePinDragEnd}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={pin.image_url}
                        alt={pin.title}
                        className="w-full transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {pin.title && (
                      <p className="text-sm font-medium mt-2">{pin.title}</p>
                    )}
                    {pin.description && (
                      <p className="text-xs text-muted-foreground mt-1">{pin.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {filteredBoards.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No mood boards found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or create a new mood board
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasonryMoodBoards;