import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, X, Upload } from 'lucide-react';
import { usePortfolio, usePortfolioMutations, uploadPortfolioImages, MAX_PORTFOLIO_ITEMS, MAX_IMAGES_PER_ITEM, PortfolioItem } from '@/hooks/usePortfolio';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';

interface PortfolioManagerProps {
  brandId: string;
}

interface FormData {
  title: string;
  description: string;
  image_urls: string[];
}

const DEFAULT_FORM: FormData = {
  title: '',
  description: '',
  image_urls: []
};

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({ brandId }) => {
  const { data: portfolioItems = [], isLoading } = usePortfolio(brandId);
  const { createItem, updateItem, deleteItem, isCreating, isUpdating, isDeleting } = usePortfolioMutations(brandId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canAddMore = portfolioItems.length < MAX_PORTFOLIO_ITEMS;
  const isSaving = isCreating || isUpdating;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const currentImageCount = formData.image_urls.length + pendingFiles.length;
    const remainingSlots = MAX_IMAGES_PER_ITEM - currentImageCount;
    
    if (remainingSlots <= 0) return;
    
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);
    setPendingFiles(prev => [...prev, ...filesToAdd]);
  }, [formData.image_urls.length, pendingFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: formData.image_urls.length + pendingFiles.length >= MAX_IMAGES_PER_ITEM
  });

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingItem(null);
    setPendingFiles([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      image_urls: item.image_urls
    });
    setPendingFiles([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const removeExistingImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;
    
    let finalImageUrls = [...formData.image_urls];
    
    // Upload pending files
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadedUrls = await uploadPortfolioImages(brandId, pendingFiles);
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      } finally {
        setIsUploading(false);
      }
    }
    
    if (editingItem) {
      updateItem({
        id: editingItem.id,
        title: formData.title,
        description: formData.description,
        image_urls: finalImageUrls
      });
    } else {
      createItem({
        title: formData.title,
        description: formData.description,
        image_urls: finalImageUrls
      });
    }
    
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalImages = formData.image_urls.length + pendingFiles.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TutorialTooltip
                feature="portfolio-intro"
                content={
                  <div className="space-y-2">
                    <p className="font-medium">Showcase Your Work ✨</p>
                    <ul className="text-sm space-y-1">
                      <li>• Upload photos of your best work</li>
                      <li>• Add titles and descriptions</li>
                      <li>• Customers see this on your profile</li>
                      <li>• Max {MAX_PORTFOLIO_ITEMS} items, {MAX_IMAGES_PER_ITEM} images each</li>
                    </ul>
                  </div>
                }
              >
                <CardTitle>Portfolio</CardTitle>
              </TutorialTooltip>
            </div>
            {canAddMore && (
              <Button onClick={openAddModal} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Work
              </Button>
            )}
          </div>
          <CardDescription>
            Showcase your past work to attract customers ({portfolioItems.length}/{MAX_PORTFOLIO_ITEMS} items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No portfolio items yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload photos of your past work to showcase your expertise
              </p>
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Work
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioItems.map((item) => (
                <div key={item.id} className="group relative rounded-lg overflow-hidden border bg-card">
                  {/* Image preview */}
                  <div className="aspect-[4/3] bg-muted">
                    {item.image_urls[0] ? (
                      <img
                        src={item.image_urls[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {item.image_urls.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        +{item.image_urls.length - 1}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-3">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditModal(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={isDeleting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Portfolio Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the details of your portfolio item'
                : 'Add photos of your work with a title and description'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Bridal Hair & Makeup"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this work..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Images ({totalImages}/{MAX_IMAGES_PER_ITEM})
              </label>
              
              {/* Image previews */}
              {(formData.image_urls.length > 0 || pendingFiles.length > 0) && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {/* Existing images */}
                  {formData.image_urls.map((url, index) => (
                    <div key={url} className="relative aspect-square rounded-md overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {/* Pending files */}
                  {pendingFiles.map((file, index) => (
                    <div key={file.name + index} className="relative aspect-square rounded-md overflow-hidden group bg-muted">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePendingFile(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Dropzone */}
              {totalImages < MAX_IMAGES_PER_ITEM && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop images here...' : 'Drag & drop images or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB per image, up to {MAX_IMAGES_PER_ITEM - totalImages} more
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.title.trim() || isSaving || isUploading}
              >
                {(isSaving || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortfolioManager;
