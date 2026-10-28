import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDesignV3 } from "@/hooks/useDesignV3";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const v3 = useDesignV3();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  if (v3) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 text-center">
        <h1 className="text-[26px] font-semibold text-ink">This page doesn't exist.</h1>
        <Button className="mt-6 h-12 px-6" onClick={() => navigate('/swipe')}>Go to Feed</Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
