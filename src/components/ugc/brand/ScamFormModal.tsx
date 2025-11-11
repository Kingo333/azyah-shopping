import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateScamReport, useUGCBrands } from '@/hooks/useUGCBrand';
import { CreateBrandModal } from './CreateBrandModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ScamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScamFormModal = ({ open, onOpenChange }: ScamFormModalProps) => {
  const [brandId, setBrandId] = useState('');
  const [title, setTitle] = useState('');
  const [scamType, setScamType] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  const { data: brands } = useUGCBrands();
  const createScamReport = useCreateScamReport();

  const handleSubmit = async () => {
    if (!brandId || !title || !scamType || !description) return;

    await createScamReport.mutateAsync({
      brand_id: brandId,
      title,
      scam_type: scamType as any,
      description,
      evidence_urls: [],
    });

    // Reset form
    setBrandId('');
    setTitle('');
    setScamType('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report a Scam</DialogTitle>
            <DialogDescription>
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your report will be posted anonymously
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Brand *</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="link" 
                className="mt-2 p-0 h-auto"
                onClick={() => setShowCreateBrand(true)}
              >
                + Add new brand
              </Button>
            </div>

            <div>
              <Label htmlFor="title">Scam Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief headline of the scam"
              />
            </div>

            <div>
              <Label>Scam Type *</Label>
              <Select value={scamType} onValueChange={setScamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonpayment">Non-Payment</SelectItem>
                  <SelectItem value="counterfeit">Counterfeit Products</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="ghosting">Ghosting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened in detail..."
                rows={6}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={!brandId || !title || !scamType || !description || createScamReport.isPending}
              className="w-full"
              variant="destructive"
            >
              {createScamReport.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateBrandModal open={showCreateBrand} onOpenChange={setShowCreateBrand} />
    </>
  );
};