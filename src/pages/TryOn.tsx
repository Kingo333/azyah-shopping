import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiStudioModal from '@/components/AiStudioModal';
import { useDesignV3 } from '@/hooks/useDesignV3';

/**
 * Try On tab. Design v3 shows AI Studio (Picture, Video and Live Cam) as a
 * full screen; otherwise today's AI Studio pop-up opens and closing it
 * returns to the previous screen.
 */
export default function TryOn() {
  const navigate = useNavigate();
  const v3 = useDesignV3();
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
    if (window.history.length > 1) navigate(-1);
    else navigate('/swipe', { replace: true });
  };

  if (v3) {
    return (
      <main className="min-h-[100dvh] bg-ground pb-20">
        {/* A page has nothing to close; leaving the tab unmounts it (Live Cam cleans up as before). */}
        <AiStudioModal open presentation="page" onClose={() => {}} />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-20">
      <AiStudioModal open={open} onClose={close} />
    </main>
  );
}
