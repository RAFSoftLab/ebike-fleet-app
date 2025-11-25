import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { formatCurrency, getCurrencySymbol, getAvailableCurrencies } from "./currency";

type CurrencyContextValue = {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  formatCurrency: (amount: number | string) => string;
  convertAmount: (amount: number | string, fromCurrency: string, transactionDate?: string) => Promise<number | null>;
  getCurrencySymbol: () => string;
  availableCurrencies: Array<{ code: string; name: string; symbol: string }>;
  isLoading: boolean;
};

const CurrencyContext = React.createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch current currency setting
  const currencyQuery = useQuery({
    queryKey: ["currency"],
    queryFn: async () => {
      try {
        const resp = await api.get("/fleet/settings/currency");
        return resp.data.currency as string;
      } catch (error) {
        // If endpoint doesn't exist or fails, default to RSD
        return "RSD";
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const currency = currencyQuery.data ?? "RSD";

  // Mutation to update currency
  const updateCurrencyMutation = useMutation({
    mutationFn: async (newCurrency: string) => {
      const resp = await api.put("/fleet/settings/currency", { currency: newCurrency });
      return resp.data.currency as string;
    },
    onSuccess: (newCurrency) => {
      queryClient.setQueryData(["currency"], newCurrency);
      // Invalidate related queries that might display currency
      queryClient.invalidateQueries({ queryKey: ["financial-analytics"] });
    },
  });

  const setCurrency = async (newCurrency: string) => {
    await updateCurrencyMutation.mutateAsync(newCurrency);
  };

  const convertAmount = async (
    amount: number | string,
    fromCurrency: string,
    transactionDate?: string
  ): Promise<number | null> => {
    if (fromCurrency === currency) {
      return typeof amount === "string" ? parseFloat(amount) : amount;
    }

    try {
      const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
      const params = new URLSearchParams({
        amount: numAmount.toString(),
        from_currency: fromCurrency,
        to_currency: currency,
      });
      if (transactionDate) {
        params.append("transaction_date", transactionDate);
      }
      const resp = await api.get(`/fleet/exchange-rates/convert?${params.toString()}`);
      return parseFloat(resp.data.converted_amount);
    } catch (error) {
      console.error("Failed to convert amount:", error);
      return null;
    }
  };

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    formatCurrency: (amount: number | string) => formatCurrency(amount, currency),
    convertAmount,
    getCurrencySymbol: () => getCurrencySymbol(currency),
    availableCurrencies: getAvailableCurrencies(),
    isLoading: currencyQuery.isLoading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

