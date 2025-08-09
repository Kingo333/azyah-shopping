import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import {
  ShoppingCart,
  PackageOpen,
  CreditCard,
  Truck,
  RotateCcw,
  Heart,
  ExternalLink,
  Share2,
  Camera,
  Sparkles
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { Product } from '@/types';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { HoverCard, HoverCardContent, HoverCardDescription, HoverCardHeader, HoverCardTitle, HoverCardTrigger } from "@/components/ui/hover-card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { EnhancedProductGallery } from './EnhancedProductGallery';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    wishlist, 
    isInWishlist, 
    addToWishlist, 
    removeFromWishlist,
    isLoading: wishlistLoading 
  } = useWishlist(product?.id);

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleAddToBag = () => {
    toast({
      title: "Added to bag",
      description: "Check your cart to complete your order.",
    })
  };

  const handleWishlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to add items to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    if (isInWishlist) {
      try {
        await removeFromWishlist(wishlist?.id || '');
        toast({
          description: `${product.title} removed from wishlist.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove from wishlist. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      try {
        await addToWishlist();
        toast({
          description: `${product.title} added to wishlist!`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add to wishlist. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description || `Check out this awesome product: ${product.title}`,
          url: window.location.href,
        });
        toast({
          description: "Product shared successfully!",
        });
      } catch (error) {
        toast({
          title: "Sharing failed",
          description: "Could not share the product. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Your browser does not support the Web Share API.",
        variant: "destructive",
      });
    }
  };

  const handleExternalLink = () => {
    if (product.external_url) {
      window.open(product.external_url, '_blank');
    } else {
      toast({
        title: "No external link",
        description: "This product does not have an external link.",
        variant: "destructive",
      });
    }
  };

  const handleARTryOn = () => {
    // Close modal and navigate to AR Try-On with this product
    onClose();
    navigate(`/ar-tryOn?product=${product.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.title}
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AR Ready
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Images */}
          <div className="space-y-4">
            <EnhancedProductGallery
              images={product.media_urls || []}
              productTitle={product.title}
              productId={product.id}
              hasARMesh={!!product.ar_mesh_url}
              onARTryOn={handleARTryOn}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Product Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{product.title}</h2>
              <p className="text-muted-foreground">{product.description || 'No description available.'}</p>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{formatPrice(product.price_cents, product.currency)}</span>
                {product.compare_at_price_cents && product.compare_at_price_cents > product.price_cents && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compare_at_price_cents, product.currency)}</span>
                )}
              </div>
            </div>

            {/* AR Try-On Call-to-Action */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Try Before You Buy</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    See how this {product.title} looks on you with our advanced AR try-on experience. 
                    Perfect fit guaranteed!
                  </p>
                  <Button 
                    onClick={handleARTryOn}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Try in AR Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleWishlist}
                  variant="outline" 
                  className="gap-2"
                  disabled={wishlistLoading}
                >
                  <Heart className="h-4 w-4" />
                  {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </Button>
                <Button onClick={handleAddToBag} className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Add to Bag
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                {product.external_url && (
                  <Button variant="secondary" className="gap-2" onClick={handleExternalLink}>
                    <ExternalLink className="h-4 w-4" />
                    View on Retailer Site
                  </Button>
                )}
              </div>
            </div>

            {/* Size Chart */}
            <Accordion type="single" collapsible>
              <AccordionItem value="size-chart">
                <AccordionTrigger>
                  <h4 className="text-sm font-semibold">Size Chart</h4>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableCaption>Our size chart to ensure a perfect fit.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Size</TableHead>
                        <TableHead>Chest (in)</TableHead>
                        <TableHead>Waist (in)</TableHead>
                        <TableHead>Hips (in)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">XS</TableCell>
                        <TableCell>32-34</TableCell>
                        <TableCell>24-26</TableCell>
                        <TableCell>34-36</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">S</TableCell>
                        <TableCell>34-36</TableCell>
                        <TableCell>26-28</TableCell>
                        <TableCell>36-38</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M</TableCell>
                        <TableCell>36-38</TableCell>
                        <TableCell>28-30</TableCell>
                        <TableCell>38-40</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">L</TableCell>
                        <TableCell>38-40</TableCell>
                        <TableCell>30-32</TableCell>
                        <TableCell>40-42</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">XL</TableCell>
                        <TableCell>40-42</TableCell>
                        <TableCell>32-34</TableCell>
                        <TableCell>42-44</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Specifications */}
            <Accordion type="single" collapsible>
              <AccordionItem value="specifications">
                <AccordionTrigger>
                  <h4 className="text-sm font-semibold">Specifications</h4>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5">
                    <li>Material: {product.attributes?.material || 'Not specified'}</li>
                    <li>Color: {product.attributes?.color_primary || 'Not specified'}</li>
                    <li>Gender: {product.attributes?.gender_target || 'Unisex'}</li>
                    <li>Style: {product.attributes?.style_tags?.join(', ') || 'Casual'}</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
