import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useClosets, useCreateCloset, useAddToCloset } from '@/hooks/useClosets';
import { Plus } from 'lucide-react';

interface AddToClosetModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

export const AddToClosetModal: React.FC<AddToClosetModalProps> = ({
  isOpen,
  onClose,
  productId
}) => {
  const { data: closets, isLoading } = useClosets();
  const createCloset = useCreateCloset();
  const addToCloset = useAddToCloset();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClosetTitle, setNewClosetTitle] = useState('');
  const [newClosetDescription, setNewClosetDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleAddToExistingCloset = async (closetId: string) => {
    try {
      await addToCloset.mutateAsync({ closetId, productId });
      onClose();
    } catch (error) {
      console.error('Error adding to closet:', error);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newClosetTitle.trim()) return;

    try {
      const newCloset = await createCloset.mutateAsync({
        title: newClosetTitle,
        description: newClosetDescription,
        is_public: isPublic
      });
      
      await addToCloset.mutateAsync({ closetId: newCloset.id, productId });
      onClose();
      setNewClosetTitle('');
      setNewClosetDescription('');
      setIsPublic(false);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating closet and adding item:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Closet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              {/* Existing Closets */}
              <div className="space-y-2">
                <Label>Choose a closet</Label>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading closets...
                  </div>
                ) : closets?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {closets.map((closet) => (
                      <Card key={closet.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div 
                            className="flex items-center justify-between"
                            onClick={() => handleAddToExistingCloset(closet.id)}
                          >
                            <div>
                              <h4 className="font-medium">{closet.title}</h4>
                              {closet.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {closet.description}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {closet.is_public ? 'Public' : 'Private'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No closets yet
                  </div>
                )}
              </div>

              {/* Create New Closet Button */}
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Closet
              </Button>
            </>
          ) : (
            <>
              {/* Create New Closet Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Closet Name</Label>
                  <Input
                    id="title"
                    value={newClosetTitle}
                    onChange={(e) => setNewClosetTitle(e.target.value)}
                    placeholder="My New Closet"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newClosetDescription}
                    onChange={(e) => setNewClosetDescription(e.target.value)}
                    placeholder="Describe your closet..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="public">Make closet public</Label>
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
                
                {isPublic && (
                  <p className="text-xs text-muted-foreground">
                    Public closets can be viewed and rated by other users
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateAndAdd}
                  disabled={!newClosetTitle.trim() || createCloset.isPending || addToCloset.isPending}
                  className="flex-1"
                >
                  Create & Add
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
