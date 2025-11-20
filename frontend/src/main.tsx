import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthProvider, useAuth } from "./modules/auth/AuthContext";
import { LoginPage } from "./modules/auth/LoginPage";
import { Dashboard } from "./modules/shell/Dashboard";
import { AppShell } from "./modules/shell/AppShell";
import { DriversPage } from "./modules/shell/DriversPage";
import { BikesPage } from "./modules/shell/BikesPage";
import { BatteriesPage } from "./modules/shell/BatteriesPage";
import { RentalsPage } from "./modules/shell/RentalsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, tryRefreshOnBoot } = useAuth();
  React.useEffect(() => {
    // Attempt silent refresh on first mount
    tryRefreshOnBoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="drivers" element={<DriversPage />} />
                      <Route path="bikes" element={<BikesPage />} />
                      <Route path="batteries" element={<BatteriesPage />} />
                      <Route path="rentals" element={<RentalsPage />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

