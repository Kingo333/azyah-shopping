import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useEffect } from "react";

export type QAKey = "shop" | "ai" | "beauty" | "feed" | "wishlist" | "explore" | "ugc" | "toy" | "dashboard";

const DEFAULT: QAKey = "shop";

export function useQuickActionsSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selected = (params.get("section") as QAKey) || DEFAULT;

  function setSelected(key: QAKey) {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("section", key);
    navigate({ 
      pathname: location.pathname, 
      search: nextParams.toString() 
    }, { replace: true });
  }

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const section = currentParams.get("section") as QAKey;
      if (section && section !== selected) {
        // Let the component re-render with new URL
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selected]);

  return { selected, setSelected };
}