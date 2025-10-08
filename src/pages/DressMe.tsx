import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, Save, Share2, Plus, Trash2, Upload } from 'lucide-react';
import { DressMeCanvas } from '@/components/DressMeCanvas';
import { DressMeRow } from '@/components/DressMeRow';
import { WardrobeUploadModal } from '@/components/WardrobeUploadModal';
import { useWardrobeItems, WardrobeItem } from '@/hooks/useWardrobeItems';
import { useDressMe, useShuffleOutfit } from '@/hooks/useDressMe';
import { useSaveOutfit } from '@/hooks/useOutfits';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORY_OPTIONS = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'accessory', label: 'Accessories' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'bag', label: 'Bags' },
];

export default function DressMe() {
  const { data: allItems = [], isLoading } = useWardrobeItems();
  const { selectedOutfit, pinnedCategories, togglePin, selectItem, setSelectedOutfit } = useDressMe();
  const { shuffleOutfit } = useShuffleOutfit();
  const saveOutfit = useSaveOutfit();

  const [activeCategories, setActiveCategories] = useState<string[]>(['top', 'bottom', 'shoes']);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState('');

  const getItemsByCategory = useCallback((category: string): WardrobeItem[] => {
    return allItems.filter(item => item.category === category);
  }, [allItems]);

  const handleShuffle = async () => {
    const newOutfit = await shuffleOutfit(
      activeCategories,
      pinnedCategories,
      selectedOutfit,
      getItemsByCategory
    );
    setSelectedOutfit(newOutfit);
    toast.success('Outfit shuffled!');
  };

  const handleSave = () => {
    const outfitData: Record<string, string> = {};
    activeCategories.forEach(cat => {
      if (selectedOutfit[cat]) {
        outfitData[cat] = selectedOutfit[cat]!.id;
      }
    });

    if (Object.keys(outfitData).length === 0) {
      toast.error('Please create an outfit first');
      return;
    }

    saveOutfit.mutate({
      outfit_data: outfitData,
      name: outfitName || null,
      occasion: occasion || null,
      image_preview: null,
    });
  };

  const handleShare = () => {
    toast.success('Share functionality coming soon!');
  };

  const addCategory = (category: string) => {
    if (activeCategories.length >= 4) {
      toast.error('Maximum 4 categories allowed');
      return;
    }
    if (!activeCategories.includes(category)) {
      setActiveCategories([...activeCategories, category]);
    }
  };

  const removeCategory = (category: string) => {
    if (activeCategories.length <= 2) {
      toast.error('Minimum 2 categories required');
      return;
    }
    setActiveCategories(activeCategories.filter(cat => cat !== category));
    const newOutfit = { ...selectedOutfit };
    delete newOutfit[category];
    setSelectedOutfit(newOutfit);
  };

  const availableCategories = CATEGORY_OPTIONS.filter(
    opt => !activeCategories.includes(opt.value)
  );

  // Show onboarding if no items
  if (!isLoading && allItems.length === 0) {
    return (
      <>
        <SEOHead
          title="Dress Me - AI Wardrobe Stylist"
          description="Shuffle your wardrobe and get instant outfit ideas with AI-powered styling"
        />
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <Card className="max-w-md p-8 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to Dress Me! 👗</h1>
              <p className="text-muted-foreground">
                Upload your wardrobe items to start creating amazing outfits with AI-powered suggestions
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium">How it works:</h3>
                <ol className="text-sm text-muted-foreground text-left space-y-1">
                  <li>1. Upload photos of your clothing items</li>
                  <li>2. AI automatically removes backgrounds</li>
                  <li>3. Shuffle to create instant outfit combinations</li>
                  <li>4. Save and share your favorite looks</li>
                </ol>
              </div>

              <Button onClick={() => setIsUploadModalOpen(true)} size="lg" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Item
              </Button>
            </div>
          </Card>
          
          <WardrobeUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Dress Me - AI Wardrobe Stylist"
        description="Shuffle your wardrobe and get instant outfit ideas with AI-powered styling"
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dress Me 👗</h1>
            <p className="text-muted-foreground">Shuffle your wardrobe and get outfit ideas instantly</p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Canvas */}
            <div className="space-y-4">
              <DressMeCanvas outfit={selectedOutfit} activeCategories={activeCategories} />
              
              {/* Outfit Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Outfit name (optional)"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                />
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="party">Party</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleShuffle} className="flex-1">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Shuffle
                </Button>
                <Button onClick={handleSave} variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleShare} variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Right: Category Rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Categories</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Items
                </Button>
              </div>

              {/* Active Category Rows */}
              <div className="space-y-4">
                {activeCategories.map((category) => (
                  <Card key={category} className="p-4 relative">
                    {activeCategories.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeCategory(category)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <DressMeRow
                      category={category}
                      items={getItemsByCategory(category)}
                      selectedItem={selectedOutfit[category] || null}
                      isPinned={pinnedCategories[category] || false}
                      onPin={() => togglePin(category)}
                      onSelect={(item) => selectItem(category, item)}
                    />
                  </Card>
                ))}
              </div>

              {/* Add Category */}
              {activeCategories.length < 4 && availableCategories.length > 0 && (
                <Select onValueChange={addCategory}>
                  <SelectTrigger>
                    <Plus className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Add category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <WardrobeUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      </div>
    </>
  );
}
