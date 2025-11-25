// Currency codes and their symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  RSD: "дин.",
  EUR: "€",
  USD: "$",
};

// Currency names for display
export const CURRENCY_NAMES: Record<string, string> = {
  RSD: "Serbian Dinar",
  EUR: "Euro",
  USD: "US Dollar",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency.toUpperCase();
}

export function formatCurrency(amount: number | string, currency: string = "RSD"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${getCurrencySymbol(currency)}0.00`;
  
  const symbol = getCurrencySymbol(currency);
  const formatted = numAmount.toFixed(2);
  
  // Format based on currency conventions
  // RSD typically uses symbol after amount
  if (currency.toUpperCase() === "RSD") {
    return `${formatted} ${symbol}`;
  }
  // Most other currencies use symbol before amount
  return `${symbol}${formatted}`;
}

export function getAvailableCurrencies(): Array<{ code: string; name: string; symbol: string }> {
  const all = Object.keys(CURRENCY_SYMBOLS).map((code) => ({
    code,
    name: CURRENCY_NAMES[code] || code,
    symbol: CURRENCY_SYMBOLS[code],
  }));
  
  // Prioritize RSD, EUR, USD at the top
  const priority = ["RSD", "EUR", "USD"];
  const prioritized = priority
    .map(code => all.find(c => c.code === code))
    .filter(Boolean) as Array<{ code: string; name: string; symbol: string }>;
  
  const rest = all
    .filter(c => !priority.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return [...prioritized, ...rest];
}

