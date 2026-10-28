import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Plus, Shirt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { CreatePostModal } from '@/components/CreatePostModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { features } from '@/lib/features';

/**
 * Design v3 Community: the floating black Create button (the only shadow on
 * the screen). New outfit opens the outfit builder; New post opens today's
 * post composer.
 */
export function CommunityCreateButton({ onPostCreated }: { onPostCreated: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const choose = (action: string, run: () => void) => {
    setMenuOpen(false);
    requireAuth(action, run);
  };

  const rowClass = 'flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-[15px] text-ink active:bg-fill';
  const buttonClass =
    'fixed right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.22)] active:scale-95 transition-transform';
  const buttonStyle = { bottom: 'calc(64px + var(--safe-bottom, 0px) + 16px)' };

  // Posts are paused: Create goes straight to the outfit builder.
  if (!features.posts) {
    return (
      <>
        <button
          type="button"
          className={buttonClass}
          style={buttonStyle}
          onClick={() => requireAuth('create outfits', () => navigate('/dress-me/canvas'))}
        >
          <Plus className="h-5 w-5" />
          New outfit
        </button>
        <GuestActionPrompt open={showPrompt} onOpenChange={setShowPrompt} action={promptAction} />
      </>
    );
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={buttonClass} style={buttonStyle}>
            <Plus className="h-5 w-5" />
            Create
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-56 overflow-hidden rounded-[20px] border-0 p-0">
          <button type="button" className={rowClass} onClick={() => choose('create outfits', () => navigate('/dress-me/canvas'))}>
            <Shirt className="h-5 w-5 text-ink-2" />
            New outfit
          </button>
          <button
            type="button"
            className={`${rowClass} border-t border-line`}
            onClick={() => choose('share posts', () => setPostOpen(true))}
          >
            <PenLine className="h-5 w-5 text-ink-2" />
            New post
          </button>
        </PopoverContent>
      </Popover>

      {user && (
        <CreatePostModal
          isOpen={postOpen}
          onClose={() => setPostOpen(false)}
          onPostCreated={() => {
            setPostOpen(false);
            onPostCreated();
          }}
          userId={user.id}
        />
      )}
      <GuestActionPrompt open={showPrompt} onOpenChange={setShowPrompt} action={promptAction} />
    </>
  );
}
