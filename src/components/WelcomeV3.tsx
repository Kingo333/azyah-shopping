import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePublicProducts } from '@/hooks/usePublicProducts';
import { setGuestMode } from '@/hooks/useGuestMode';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

/**
 * Design v3 welcome (spec 7.18): one product photo, the wordmark, one
 * sentence and three ways in. Replaces the landing page and the 4-slide
 * intro for logged-out visitors while design v3 is on.
 */
export default function WelcomeV3() {
  const navigate = useNavigate();
  // Same query as the landing page, so the photo comes from the shared cache.
  const { data: products = [] } = usePublicProducts(24);
  const photo = products.map((p) => getPrimaryImageUrl(p)).find((url) => url && !url.includes('placeholder'));

  const browseFirst = () => {
    setGuestMode();
    navigate('/swipe');
  };

  return (
    <main
      className="flex min-h-[100dvh] flex-col bg-card"
      style={{ paddingTop: 'calc(var(--safe-top, 0px) + 12px)', paddingBottom: 'calc(var(--safe-bottom, 0px) + 20px)' }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] bg-fill">
          {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>

        <h1 className="mt-6 text-center font-wordmark text-[34px] font-medium leading-none text-ink">Azyah</h1>
        <p className="mx-auto mt-3 max-w-[300px] text-center text-[15px] text-ink-2">
          Find clothes you love and see them on you before you buy.
        </p>

        <div className="mt-6 space-y-3">
          <Button className="h-12 w-full text-[15px] font-semibold" onClick={() => navigate('/onboarding/signup')}>
            Continue with email
          </Button>
          <Button variant="outline" className="h-12 w-full border-line-strong bg-card text-[15px] font-semibold" onClick={browseFirst}>
            Browse first
          </Button>
          <button
            type="button"
            onClick={() => navigate('/onboarding/signup?mode=login')}
            className="block w-full py-2 text-center text-[15px] text-ink-2"
          >
            Already have an account? <span className="font-medium text-ink">Sign in</span>
          </button>
        </div>
      </div>
    </main>
  );
}
