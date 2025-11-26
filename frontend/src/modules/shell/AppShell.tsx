import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCurrency } from "../../shared/CurrencyContext";
import { useCurrentUser } from "../users/useCurrentUser";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency, availableCurrencies, getCurrencySymbol } = useCurrency();
  const currentUserQuery = useCurrentUser();
  const isAdmin = currentUserQuery.data?.role === "admin";
  const [showCurrencySelector, setShowCurrencySelector] = React.useState(false);
  
  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    await setCurrency(newCurrency);
    setShowCurrencySelector(false);
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
            <Link to="/profile" className="hover:underline">
              Profile
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowCurrencySelector(!showCurrencySelector)}
                  className="text-sm text-gray-700 hover:underline flex items-center gap-1"
                  title="Change Currency"
                >
                  <span>{getCurrencySymbol()}</span>
                  <span className="text-xs">{currency}</span>
                </button>
                {showCurrencySelector && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCurrencySelector(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                      <div className="p-2 border-b">
                        <div className="text-xs font-semibold text-gray-600">Select Currency</div>
                      </div>
                      <div className="divide-y">
                        {availableCurrencies.map((curr) => (
                          <button
                            key={curr.code}
                            onClick={() => handleCurrencyChange(curr.code)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                              currency === curr.code ? "bg-blue-50" : ""
                            }`}
                          >
                            <div>
                              <div className="font-medium">{curr.name}</div>
                              <div className="text-xs text-gray-500">{curr.code}</div>
                            </div>
                            <span className="text-lg">{curr.symbol}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
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

