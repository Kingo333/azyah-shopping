import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiStudioModal from '@/components/AiStudioModal';

/**
 * Try On tab (navigation v2). Opens today's AI Studio (Photo, Video and Live
 * Cam) exactly as it works now; closing it returns to the previous screen.
 * Phase 4 replaces this with the full Try On screen.
 */
export default function TryOn() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
    if (window.history.length > 1) navigate(-1);
    else navigate('/swipe', { replace: true });
  };

  return (
    <main className="min-h-[100dvh] bg-background pb-20">
      <AiStudioModal open={open} onClose={close} />
    </main>
  );
}
