import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFits } from '@/hooks/useFits';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

/**
 * Design v3 Community: make an outfit and get back to your own outfits,
 * the way Profile's closet card used to. Sits above the community outfits.
 */
export function YourOutfitsRow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: fits = [], isLoading } = useFits();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();

  const createOutfit = () => requireAuth('create outfits', () => navigate('/dress-me/canvas'));

  return (
    <section aria-label="Your outfits" className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Your outfits</h2>
        {user && fits.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/dress-me/wardrobe?tab=outfits')}
            className="flex items-center gap-0.5 text-[13px] text-ink-2"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={createOutfit}
          className="flex aspect-[3/4] w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-card text-ink active:opacity-70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-[12px] font-medium">Create outfit</span>
        </button>

        {user && isLoading &&
          [0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] w-24 shrink-0 rounded-2xl bg-line" />)}

        {fits.slice(0, 10).map((fit) => {
          const image = fit.render_path || (fit as { image_preview?: string | null }).image_preview;
          return (
            <button
              key={fit.id}
              type="button"
              onClick={() => navigate(`/dress-me/outfit/${fit.id}`)}
              className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl bg-card active:opacity-70"
            >
              {image ? (
                <img src={image} alt={fit.title || 'Outfit'} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[11px] text-ink-3">No preview</span>
              )}
            </button>
          );
        })}

        {user && !isLoading && fits.length === 0 && (
          <p className="flex w-40 shrink-0 items-center text-[13px] text-ink-2">
            Put pieces from your closet together and share them here.
          </p>
        )}
      </div>

      <GuestActionPrompt open={showPrompt} onOpenChange={setShowPrompt} action={promptAction} />
    </section>
  );
}
