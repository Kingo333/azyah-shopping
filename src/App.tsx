

import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleDashboard from "./components/RoleDashboard";
import Index from "./pages/Index";
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
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<RoleDashboard />} />
          <Route path="/toy-replica" element={<ProtectedRoute><ToyReplica /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
