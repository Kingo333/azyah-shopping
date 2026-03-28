import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

interface EventARButtonProps {
  eventId: string;
  brandId: string;
  brandName: string;
  hasARProducts: boolean;
}

export function EventARButton({ eventId, brandId, brandName, hasARProducts }: EventARButtonProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const arUrl = `${window.location.origin}/ar/${eventId}/${brandId}`;

  useEffect(() => {
    if (showQRModal && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, arUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    }
  }, [showQRModal, arUrl]);

  if (!hasARProducts) return null;

  return (
    <>
      <Button
        size="sm"
        onClick={() => setShowQRModal(true)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
      >
        <Smartphone className="h-4 w-4 mr-1" />
        AR Try-On
      </Button>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>AR Try-On: {brandName}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl shadow-inner">
              <canvas ref={canvasRef} />
            </div>

            {/* Instructions */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Scan with your phone camera to try on {brandName} products in AR
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Smartphone className="h-3 w-3" />
                Works on iOS Safari & Android Chrome
              </p>
            </div>

            {/* Direct link for mobile users */}
            <Button
              variant="outline"
              onClick={() => window.open(arUrl, '_blank')}
              className="w-full"
            >
              Open AR Experience
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
