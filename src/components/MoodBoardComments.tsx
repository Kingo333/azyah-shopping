import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Reply, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  look_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  likes_count: number;
  replies?: Comment[];
}

interface MoodBoardCommentsProps {
  lookId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MoodBoardComments: React.FC<MoodBoardCommentsProps> = ({ lookId, isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockComments: Comment[] = [
          {
            id: '1',
            user_id: 'user1',
            look_id: lookId,
            content: 'Love this outfit combination! The colors work so well together.',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user_name: 'Sarah M.',
            user_avatar: undefined,
            likes_count: 5,
            replies: [
              {
                id: '1-1',
                user_id: 'user2',
                look_id: lookId,
                content: 'Totally agree! Where did you find that jacket?',
                created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                user_name: 'Emma K.',
                user_avatar: undefined,
                likes_count: 2,
              }
            ]
          },
          {
            id: '2',
            user_id: 'user3',
            look_id: lookId,
            content: 'This is giving me major inspiration for my next shopping trip! 🛍️',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            user_name: 'Alex R.',
            user_avatar: undefined,
            likes_count: 3,
          }
        ];
        setComments(mockComments);
        setIsLoading(false);
      }, 500);
    }
  }, [lookId, isOpen]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      const comment: Comment = {
        id: `new-${Date.now()}`,
        user_id: user.id,
        look_id: lookId,
        content: newComment,
        created_at: new Date().toISOString(),
        user_name: user.email?.split('@')[0] || 'Anonymous',
        user_avatar: undefined,
        likes_count: 0,
      };

      setComments(prev => [comment, ...prev]);
      setNewComment('');
      
      toast({
        title: "Comment posted!",
        description: "Your comment has been added to the mood board.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, likes_count: comment.likes_count + 1 }
        : comment
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="flex flex-col h-[60vh]">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                      <div className="h-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user_avatar} />
                      <AvatarFallback>{comment.user_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleLikeComment(comment.id)}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          {comment.likes_count}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={reply.user_avatar} />
                            <AvatarFallback className="text-xs">{reply.user_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{reply.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm mb-2">{reply.content}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleLikeComment(reply.id)}
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              {reply.likes_count}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>

          {/* Add Comment */}
          {user && (
            <div className="border-t p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>{user.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Posting..." : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MoodBoardComments;