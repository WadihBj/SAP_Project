import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AssistantLogin from "./pages/AssistantLogin";

// User pages
import UserDashboard from "./pages/UserDashboard";
import NewInquiry from "./pages/NewInquiry";
import InquiryDetails from "./pages/InquiryDetails";

// Assistant pages
import AssistantDashboard from "./pages/AssistantDashboard";
import AssistantInventory from "./pages/AssistantInventory";

// Legacy pages (will refactor later)
import Submit from "./pages/Submit";
import Reports from "./pages/Reports";

const queryClient = new QueryClient();

// Route component that uses auth
function AppRoutes() {
  const { user, isAssistant } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" /> : <Register />}
      />
      <Route
        path="/assistant/login"
        element={
          user && isAssistant ? (
            <Navigate to="/assistant/dashboard" />
          ) : (
            <AssistantLogin />
          )
        }
      />

      {/* User Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inquiry/new"
        element={
          <ProtectedRoute>
            <NewInquiry />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inquiry/:id"
        element={
          <ProtectedRoute>
            <InquiryDetails />
          </ProtectedRoute>
        }
      />

      {/* Assistant Protected Routes */}
      <Route
        path="/assistant/dashboard"
        element={
          <ProtectedRoute requireAssistant={true}>
            <AssistantDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant/inventory"
        element={
          <ProtectedRoute requireAssistant={true}>
            <AssistantInventory />
          </ProtectedRoute>
        }
      />

      {/* Legacy Routes (will be refactored) */}
      <Route path="/submit" element={<Submit />} />
      <Route path="/reports" element={<Reports />} />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppContent() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
