import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContextRefactored";
import { useEffect, Suspense, lazy } from "react";
import { initializeApp } from "@/utils/appInit";
import ErrorBoundary from "@/components/ErrorBoundary";
import { errorService } from "@/services/ErrorService";
const Index = lazy(() => import("./pages/Index"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Receipt = lazy(() => import("./pages/Receipt"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    // Initialize app with all necessary setup
    initializeApp();
    
    // Initialize error service
    console.log('🔧 Initializing error service...');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/payment/:orderId" element={<Payment />} />
                  <Route path="/receipt/:orderId" element={<Receipt />} />
                  <Route path="/admin" element={<Admin />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
