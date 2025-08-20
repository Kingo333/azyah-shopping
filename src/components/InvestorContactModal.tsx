import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvestorContactModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvestorContactModal = ({ isOpen, onOpenChange }: InvestorContactModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link with form data
    const subject = encodeURIComponent(`Investment Inquiry from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Company: ${formData.company}\n\n` +
      `Message:\n${formData.message}`
    );
    
    const mailtoLink = `mailto:info@azyahstyle.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
    
    toast({
      title: "Email opened",
      description: "Your default email client should open with the message pre-filled.",
    });
    
    // Reset form and close modal
    setFormData({ name: "", email: "", company: "", message: "" });
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Contact for Investment Opportunities
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="investor-name">Name *</Label>
            <Input
              id="investor-name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="investor-email">Email *</Label>
            <Input
              id="investor-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="your.email@company.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="investor-company">Company/Fund</Label>
            <Input
              id="investor-company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              placeholder="Your company or fund name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="investor-message">Message *</Label>
            <Textarea
              id="investor-message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              placeholder="Tell us about your investment interest, fund size, thesis, and how you'd like to work with Azyah..."
              rows={4}
              required
            />
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={!formData.name || !formData.email || !formData.message}
            >
              <Send className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This will open your email client with a pre-filled message to info@azyahstyle.com
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};