import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useCallback } from "react";
import type { QaKey } from "@/components/quick-actions/config";

const DEFAULT_SECTION: QaKey = "shop";

export function useQuickActionsSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selected = (params.get("section") as QaKey) || DEFAULT_SECTION;

  const setSelected = useCallback((key: QaKey) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set("section", key);
    navigate(
      { 
        pathname: location.pathname, 
        search: newParams.toString() 
      }, 
      { replace: true }
    );
    
    // Analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'qa_tab_select', {
        section: key
      });
    }
  }, [navigate, location]);

  return { selected, setSelected };
}