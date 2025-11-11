import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star } from 'lucide-react';
import { useCreateReview, useUGCBrands } from '@/hooks/useUGCBrand';
import { CreateBrandModal } from './CreateBrandModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ReviewFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBrandId?: string;
}

export const ReviewFormModal = ({ open, onOpenChange, preselectedBrandId }: ReviewFormModalProps) => {
  const [step, setStep] = useState(1);
  const [brandId, setBrandId] = useState(preselectedBrandId || '');
  const [rating, setRating] = useState(0);
  const [paymentRating, setPaymentRating] = useState(0);
  const [vibeRating, setVibeRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [workType, setWorkType] = useState<string>('');
  const [deliverables, setDeliverables] = useState('');
  const [payout, setPayout] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [timeToPay, setTimeToPay] = useState('');
  const [wouldWorkAgain, setWouldWorkAgain] = useState<boolean | null>(null);
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  const { data: brands } = useUGCBrands();
  const createReview = useCreateReview();

  const handleSubmit = async () => {
    if (!brandId || !rating || !title || !workType) return;

    await createReview.mutateAsync({
      brand_id: brandId,
      rating,
      payment_rating: paymentRating || undefined,
      vibe_rating: vibeRating || undefined,
      title,
      body: body || undefined,
      work_type: workType as any,
      deliverables: deliverables || undefined,
      payout: payout ? parseFloat(payout) : undefined,
      currency,
      time_to_pay_days: timeToPay ? parseInt(timeToPay) : undefined,
      would_work_again: wouldWorkAgain ?? undefined,
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
    setPaymentRating(0);
    setVibeRating(0);
    setTitle('');
    setBody('');
    setWorkType('');
    setDeliverables('');
    setPayout('');
    setTimeToPay('');
    setWouldWorkAgain(null);
  };

  const renderStars = (value: number, onChange: (val: number) => void, size: 'small' | 'large' = 'small') => {
    const starSize = size === 'large' ? 'h-8 w-8' : 'h-6 w-6';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} cursor-pointer transition-colors ${
              star <= value 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-muted-foreground hover:text-yellow-200 stroke-muted-foreground/30'
            } stroke-1`}
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
            <DialogTitle>Write a Review - Step {step} of 4</DialogTitle>
            <DialogDescription>
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your review will be posted anonymously to protect your privacy
                </AlertDescription>
              </Alert>
            </DialogDescription>
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
                <Label className="text-lg font-semibold">Overall Rating *</Label>
                <div className="mt-2">
                  {renderStars(rating, setRating, 'large')}
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!brandId || !rating}
                className="w-full"
              >
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Payment Rating</Label>
                <p className="text-xs text-muted-foreground mb-2">How timely was the payment?</p>
                {renderStars(paymentRating, setPaymentRating)}
              </div>

              <div>
                <Label>Vibe/Chemistry Rating</Label>
                <p className="text-xs text-muted-foreground mb-2">How was the working relationship?</p>
                {renderStars(vibeRating, setVibeRating)}
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

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!title} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
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
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={!workType} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
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

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
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