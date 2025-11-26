import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthProvider, useAuth } from "./modules/auth/AuthContext";
import { CurrencyProvider } from "./shared/CurrencyContext";
import { LoginPage } from "./modules/auth/LoginPage";
import { Dashboard } from "./modules/shell/Dashboard";
import { AppShell } from "./modules/shell/AppShell";
import { DriversPage } from "./modules/shell/DriversPage";
import { BikesPage } from "./modules/shell/BikesPage";
import { BatteriesPage } from "./modules/shell/BatteriesPage";
import { RentalsPage } from "./modules/shell/RentalsPage";
import { useCurrentUser } from "./modules/users/useCurrentUser";

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const currentUserQuery = useCurrentUser();
  
  if (currentUserQuery.isLoading) {
    return <p className="text-sm text-gray-600">Loading…</p>;
  }
  
  if (currentUserQuery.isError || !currentUserQuery.data) {
    return <p className="text-sm text-red-600">Unable to load user.</p>;
  }
  
  if (currentUserQuery.data.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
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
                        <Route path="drivers" element={<AdminRoute><DriversPage /></AdminRoute>} />
                        <Route path="bikes" element={<AdminRoute><BikesPage /></AdminRoute>} />
                        <Route path="batteries" element={<AdminRoute><BatteriesPage /></AdminRoute>} />
                        <Route path="rentals" element={<AdminRoute><RentalsPage /></AdminRoute>} />
                      </Routes>
                    </AppShell>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

