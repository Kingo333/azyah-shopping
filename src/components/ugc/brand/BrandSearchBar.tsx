import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateBrandModal } from './CreateBrandModal';

interface BrandSearchBarProps {
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onVerifiedChange: (verified: boolean | undefined) => void;
}

export const BrandSearchBar = ({
  onSearchChange,
  onCategoryChange,
  onVerifiedChange,
}: BrandSearchBarProps) => {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  return (
    <>
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands or agencies..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select onValueChange={onCategoryChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(val) => onVerifiedChange(val === 'all' ? undefined : val === 'verified')}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowCreateModal(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        </div>
      </div>

      <CreateBrandModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </>
  );
};
