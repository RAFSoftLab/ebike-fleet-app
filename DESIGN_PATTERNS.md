# Design Patterns Implementation

This document describes the two design patterns implemented in the eBike Fleet Management application.

## 1. Singleton Pattern (Creational)

**Location:** `src/services/fleet/notification_service.py`

**Implementation:** The `NotificationService` class implements the Singleton pattern to ensure only one instance exists throughout the application lifecycle.

### Key Features:
- **Single Instance:** The `__new__` method ensures that only one instance of `NotificationService` is created
- **Lazy Initialization:** The instance is created only when first accessed
- **Global Access:** The `get_notification_service()` function provides convenient access to the singleton instance

### Code Example:
```python
# All these calls return the same instance
service1 = NotificationService()
service2 = NotificationService()
service3 = get_notification_service()

assert service1 is service2 is service3  # True - same instance
```

### Why Singleton?
- Centralized notification management: All notifications go through a single service
- Resource efficiency: Avoids creating multiple notification handlers
- Consistent state: All parts of the application use the same notification configuration

---

## 2. Strategy Pattern (Behavioral)

**Location:** `src/services/fleet/notification_service.py`

**Implementation:** The notification system uses the Strategy pattern to support different notification delivery methods (Email, SMS, In-App).

### Key Components:

1. **Abstract Strategy Interface:** `NotificationStrategy` (ABC)
   - Defines the contract for all notification strategies
   - Methods: `send()`, `get_strategy_name()`

2. **Concrete Strategies:**
   - `EmailNotificationStrategy`: Sends notifications via email
   - `SMSNotificationStrategy`: Sends notifications via SMS
   - `InAppNotificationStrategy`: Stores notifications in-app

3. **Context:** `NotificationService` (Singleton)
   - Manages and selects appropriate strategies
   - Allows runtime strategy switching

### Key Features:
- **Interchangeable Algorithms:** Different notification methods can be swapped at runtime
- **Open/Closed Principle:** New strategies can be added without modifying existing code
- **Runtime Selection:** The service can choose which strategy to use per notification

### Code Example:
```python
service = get_notification_service()

# Use default strategy (Email)
service.notify(recipient="user@example.com", ...)

# Use specific strategy
service.notify(recipient="user@example.com", ..., strategy_name="SMS")

# Use all strategies
service.notify_all_strategies(recipient="user@example.com", ...)
```

### Why Strategy Pattern?
- **Flexibility:** Easy to add new notification methods (Push notifications, Slack, etc.)
- **Separation of Concerns:** Each strategy handles its own delivery mechanism
- **Testability:** Strategies can be tested independently
- **Runtime Configuration:** Can switch strategies based on user preferences or system requirements

---

## Integration

The patterns are integrated into the fleet service (`src/services/fleet/service.py`):

1. **Rental Creation:** When a bike rental is created, the system notifies the user via Email strategy
2. **Maintenance Records:** When maintenance is completed, admins are notified via In-App strategy

### Example Usage in Code:
```python
# In create_rental() function
notification_service = get_notification_service()  # Singleton
notification_service.notify(
    recipient=user.email,
    subject="Bike Rental Confirmed",
    message=f"Your rental for bike {bike.serial_number}...",
    notification_type=NotificationType.BIKE_RENTED,
    strategy_name="Email"  # Strategy selection
)
```

---

## Testing

Tests are available in `tests/test_design_patterns.py`:
- Singleton pattern verification
- Strategy pattern functionality
- Integration tests
- Strategy registration tests

---

## Benefits

### Singleton Pattern Benefits:
- ✅ Single point of control for notifications
- ✅ Memory efficiency (one instance)
- ✅ Consistent configuration across the app

### Strategy Pattern Benefits:
- ✅ Easy to extend with new notification methods
- ✅ Clean separation of concerns
- ✅ Runtime flexibility
- ✅ Testable components

---

## Future Enhancements

Potential additions using these patterns:
- **New Strategies:** Push notifications, Slack integration, Webhooks
- **Strategy Selection:** User preferences, notification type routing
- **Strategy Chaining:** Multiple strategies for critical notifications
- **Strategy Metrics:** Track success rates per strategy

