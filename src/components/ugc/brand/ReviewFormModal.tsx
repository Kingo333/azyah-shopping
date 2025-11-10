import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Star } from 'lucide-react';
import { useCreateReview, useUGCBrands } from '@/hooks/useUGCBrand';
import { CreateBrandModal } from './CreateBrandModal';

interface ReviewFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBrandId?: string;
}

export const ReviewFormModal = ({ open, onOpenChange, preselectedBrandId }: ReviewFormModalProps) => {
  const [step, setStep] = useState(1);
  const [brandId, setBrandId] = useState(preselectedBrandId || '');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [workType, setWorkType] = useState<string>('');
  const [deliverables, setDeliverables] = useState('');
  const [payout, setPayout] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [timeToPay, setTimeToPay] = useState('');
  const [communicationRating, setCommunicationRating] = useState(0);
  const [fairnessRating, setFairnessRating] = useState(0);
  const [wouldWorkAgain, setWouldWorkAgain] = useState<boolean | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  const { data: brands } = useUGCBrands();
  const createReview = useCreateReview();

  const handleSubmit = async () => {
    if (!brandId || !rating || !title || !workType) return;

    await createReview.mutateAsync({
      brand_id: brandId,
      rating,
      title,
      body: body || undefined,
      work_type: workType as any,
      deliverables: deliverables || undefined,
      payout: payout ? parseFloat(payout) : undefined,
      currency,
      time_to_pay_days: timeToPay ? parseInt(timeToPay) : undefined,
      communication_rating: communicationRating || undefined,
      fairness_rating: fairnessRating || undefined,
      would_work_again: wouldWorkAgain ?? undefined,
      is_anonymous: isAnonymous,
      evidence_urls: [],
    });

    // Reset form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setStep(1);
    setBrandId('');
    setRating(0);
    setTitle('');
    setBody('');
    setWorkType('');
    setDeliverables('');
    setPayout('');
    setTimeToPay('');
    setCommunicationRating(0);
    setFairnessRating(0);
    setWouldWorkAgain(null);
    setIsAnonymous(false);
  };

  const renderStars = (value: number, onChange: (val: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted hover:text-yellow-200'
            }`}
            onClick={() => onChange(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Review - Step {step} of 3</DialogTitle>
          </DialogHeader>

          {step === 1 && (
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
                <Label>Overall Rating *</Label>
                {renderStars(rating, setRating)}
              </div>

              <div>
                <Label htmlFor="title">Review Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of your experience"
                />
              </div>

              <div>
                <Label htmlFor="body">Details</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share more details about your experience..."
                  rows={4}
                />
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!brandId || !rating || !title}
                className="w-full"
              >
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Work Type *</Label>
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGC">UGC</SelectItem>
                    <SelectItem value="Affiliate">Affiliate</SelectItem>
                    <SelectItem value="Gifted">Gifted</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deliverables">Deliverables</Label>
                <Input
                  id="deliverables"
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  placeholder="e.g., 3 UGC videos, 5 photos"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payout">Payout Amount</Label>
                  <Input
                    id="payout"
                    type="number"
                    value={payout}
                    onChange={(e) => setPayout(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="timeToPay">Time to Payment (days)</Label>
                <Input
                  id="timeToPay"
                  type="number"
                  value={timeToPay}
                  onChange={(e) => setTimeToPay(e.target.value)}
                  placeholder="e.g., 14"
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!workType} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Communication Rating</Label>
                {renderStars(communicationRating, setCommunicationRating)}
              </div>

              <div>
                <Label>Fairness Rating</Label>
                {renderStars(fairnessRating, setFairnessRating)}
              </div>

              <div>
                <Label>Would you work with them again?</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={wouldWorkAgain === true ? 'default' : 'outline'}
                    onClick={() => setWouldWorkAgain(true)}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={wouldWorkAgain === false ? 'default' : 'outline'}
                    onClick={() => setWouldWorkAgain(false)}
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <Label htmlFor="anonymous">Post anonymously</Label>
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createReview.isPending}
                  className="flex-1"
                >
                  {createReview.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateBrandModal open={showCreateBrand} onOpenChange={setShowCreateBrand} />
    </>
  );
};
