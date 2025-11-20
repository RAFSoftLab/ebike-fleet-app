import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="font-semibold">eBike Fleet</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="hover:underline">
              Dashboard
            </Link>
            <Link to="/drivers" className="hover:underline">
              Drivers
            </Link>
            <Link to="/bikes" className="hover:underline">
              Bikes
            </Link>
            <Link to="/batteries" className="hover:underline">
              Batteries
            </Link>
            <Link to="/rentals" className="hover:underline">
              Rentals
            </Link>
          </nav>
          <div className="ml-auto">
            <button onClick={onLogout} className="text-sm text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

