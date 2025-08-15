import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RoleDashboard from "./components/RoleDashboard";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import BrandDetail from "./pages/BrandDetail";
import RetailerDetail from "./pages/RetailerDetail";
import CategoryPage from "./pages/CategoryPage";
import SearchPage from "./pages/SearchPage";
import Closet from "./pages/Closet";
import Wishlist from "./pages/Wishlist";
import ToyReplica from '@/pages/ToyReplica';

function App() {
  const { toast } = useToast()
  const { session, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      toast({
        title: "Session Restored",
        description: "Welcome back!",
      })
      return;
    }

    setIsLoading(false);
  }, [session, user, toast]);

  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Toaster />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/brands/:id" element={<BrandDetail />} />
          <Route path="/retailers/:id" element={<RetailerDetail />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/closet" element={<ProtectedRoute><Closet /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/toy-replica" element={<ProtectedRoute><ToyReplica /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
