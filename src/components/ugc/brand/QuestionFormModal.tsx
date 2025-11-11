import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateQuestion, useUGCBrands } from '@/hooks/useUGCBrand';
import { CreateBrandModal } from './CreateBrandModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface QuestionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuestionFormModal = ({ open, onOpenChange }: QuestionFormModalProps) => {
  const [brandId, setBrandId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  const { data: brands } = useUGCBrands();
  const createQuestion = useCreateQuestion();

  const handleSubmit = async () => {
    if (!brandId || !title) return;

    await createQuestion.mutateAsync({
      brand_id: brandId,
      title,
      body: body || undefined,
    });

    // Reset form
    setBrandId('');
    setTitle('');
    setBody('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ask a Question</DialogTitle>
            <DialogDescription>
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your question will be posted anonymously
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
              <Label htmlFor="title">Question Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to know?"
              />
            </div>

            <div>
              <Label htmlFor="body">Additional Details</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Provide more context (optional)..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={!brandId || !title || createQuestion.isPending}
              className="w-full"
            >
              {createQuestion.isPending ? 'Posting...' : 'Post Question'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateBrandModal open={showCreateBrand} onOpenChange={setShowCreateBrand} />
    </>
  );
};