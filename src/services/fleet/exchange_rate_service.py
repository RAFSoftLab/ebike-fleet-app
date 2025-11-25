"""
Exchange Rate Service

Fetches and caches exchange rates from external API.
Uses exchangerate-api.com (free tier: 1,500 requests/month)
"""
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from . import models
import httpx
import logging

logger = logging.getLogger(__name__)

# ExchangeRate-API.com free tier endpoint (no API key needed for basic usage)
# For production, consider using a paid API with API key
EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/{base_currency}"


def get_exchange_rate_from_api(base_currency: str, target_currency: str) -> Optional[Decimal]:
    """
    Fetch exchange rate from external API.
    Returns rate to convert from base_currency to target_currency.
    """
    if base_currency == target_currency:
        return Decimal("1.0")
    
    try:
        url = EXCHANGE_RATE_API_URL.format(base_currency=base_currency.upper())
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            response.raise_for_status()
            data = response.json()
            
            rates = data.get("rates", {})
            if target_currency.upper() in rates:
                rate = Decimal(str(rates[target_currency.upper()]))
                return rate
            else:
                logger.warning(f"Currency {target_currency} not found in API response")
                return None
    except Exception as e:
        logger.error(f"Error fetching exchange rate from API: {e}")
        return None


def get_cached_exchange_rate(
    db: Session,
    base_currency: str,
    target_currency: str,
    rate_date: Optional[date] = None
) -> Optional[models.ExchangeRate]:
    """
    Get cached exchange rate from database.
    If rate_date is None, uses today's date.
    """
    if base_currency == target_currency:
        # Return a dummy rate object for same currency
        return None
    
    if rate_date is None:
        rate_date = date.today()
    
    return (
        db.query(models.ExchangeRate)
        .filter(
            models.ExchangeRate.base_currency == base_currency.upper(),
            models.ExchangeRate.target_currency == target_currency.upper(),
            models.ExchangeRate.rate_date == rate_date
        )
        .first()
    )


def cache_exchange_rate(
    db: Session,
    base_currency: str,
    target_currency: str,
    rate: Decimal,
    rate_date: Optional[date] = None
) -> models.ExchangeRate:
    """
    Cache exchange rate in database.
    If rate_date is None, uses today's date.
    """
    if rate_date is None:
        rate_date = date.today()
    
    # Check if rate already exists
    existing = get_cached_exchange_rate(db, base_currency, target_currency, rate_date)
    if existing:
        existing.rate = rate
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new rate
    exchange_rate = models.ExchangeRate(
        base_currency=base_currency.upper(),
        target_currency=target_currency.upper(),
        rate=rate,
        rate_date=rate_date
    )
    db.add(exchange_rate)
    db.commit()
    db.refresh(exchange_rate)
    return exchange_rate


def get_exchange_rate(
    db: Session,
    base_currency: str,
    target_currency: str,
    rate_date: Optional[date] = None,
    use_cache: bool = True
) -> Optional[Decimal]:
    """
    Get exchange rate, using cache if available, otherwise fetching from API.
    
    Args:
        db: Database session
        base_currency: Source currency code (e.g., 'RSD')
        target_currency: Target currency code (e.g., 'EUR')
        rate_date: Date for the rate (defaults to today)
        use_cache: Whether to use cached rates (default True)
    
    Returns:
        Exchange rate as Decimal, or None if unavailable
    """
    if base_currency == target_currency:
        return Decimal("1.0")
    
    if rate_date is None:
        rate_date = date.today()
    
    # Try cache first
    if use_cache:
        cached_rate = get_cached_exchange_rate(db, base_currency, target_currency, rate_date)
        if cached_rate:
            return cached_rate.rate
    
    # Fetch from API (only for today's date, historical rates would need different API)
    if rate_date == date.today():
        rate = get_exchange_rate_from_api(base_currency, target_currency)
        if rate:
            # Cache it
            cache_exchange_rate(db, base_currency, target_currency, rate, rate_date)
            return rate
    
    # Try to get most recent cached rate as fallback
    if use_cache:
        recent_rate = (
            db.query(models.ExchangeRate)
            .filter(
                models.ExchangeRate.base_currency == base_currency.upper(),
                models.ExchangeRate.target_currency == target_currency.upper(),
                models.ExchangeRate.rate_date <= rate_date
            )
            .order_by(models.ExchangeRate.rate_date.desc())
            .first()
        )
        if recent_rate:
            logger.info(f"Using cached rate from {recent_rate.rate_date} for {base_currency}->{target_currency}")
            return recent_rate.rate
    
    logger.warning(f"Could not get exchange rate for {base_currency}->{target_currency}")
    return None


def convert_amount(
    db: Session,
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    transaction_date: Optional[date] = None
) -> Optional[Decimal]:
    """
    Convert amount from one currency to another.
    
    Args:
        db: Database session
        amount: Amount to convert
        from_currency: Source currency code
        to_currency: Target currency code
        transaction_date: Date of transaction (for historical rates)
    
    Returns:
        Converted amount as Decimal, or None if conversion unavailable
    """
    if from_currency == to_currency:
        return amount
    
    rate = get_exchange_rate(db, from_currency, to_currency, transaction_date)
    if rate is None:
        return None
    
    return amount * rate


def refresh_exchange_rates(db: Session, base_currency: str = "RSD") -> dict:
    """
    Refresh exchange rates for all supported currencies from API.
    Returns dict with success status and updated currencies.
    """
    supported_currencies = ["RSD", "EUR", "USD"]
    updated = {}
    failed = []
    
    for target in supported_currencies:
        if target == base_currency:
            continue
        
        rate = get_exchange_rate_from_api(base_currency, target)
        if rate:
            cache_exchange_rate(db, base_currency, target, rate)
            updated[target] = str(rate)
        else:
            failed.append(target)
    
    return {
        "success": len(failed) == 0,
        "updated": updated,
        "failed": failed,
        "base_currency": base_currency
    }

