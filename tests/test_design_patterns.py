"""
Tests for Design Patterns Implementation

This file demonstrates and tests the two design patterns implemented:
1. Singleton Pattern - NotificationService
2. Strategy Pattern - Notification Strategies
"""
import pytest
from services.fleet.notification_service import (
    NotificationService,
    NotificationType,
    EmailNotificationStrategy,
    SMSNotificationStrategy,
    InAppNotificationStrategy,
    get_notification_service
)


def test_singleton_pattern():
    """Test that NotificationService follows Singleton pattern - only one instance exists."""
    # Create multiple instances
    service1 = NotificationService()
    service2 = NotificationService()
    service3 = get_notification_service()
    
    # All should be the same instance
    assert service1 is service2, "Singleton pattern violated: different instances created"
    assert service1 is service3, "Singleton pattern violated: get_notification_service() returns different instance"
    assert service2 is service3, "Singleton pattern violated: instances are not the same"
    
    # Verify that initialization only happens once
    initial_strategies = len(service1.get_available_strategies())
    service4 = NotificationService()
    assert len(service4.get_available_strategies()) == initial_strategies, "Strategies re-initialized"


def test_strategy_pattern():
    """Test that Strategy pattern works correctly with different notification strategies."""
    service = get_notification_service()
    
    # Test Email strategy
    email_strategy = service.get_strategy("Email")
    assert email_strategy is not None, "Email strategy not found"
    assert isinstance(email_strategy, EmailNotificationStrategy), "Wrong strategy type"
    assert email_strategy.get_strategy_name() == "Email", "Strategy name incorrect"
    
    # Test SMS strategy
    sms_strategy = service.get_strategy("SMS")
    assert sms_strategy is not None, "SMS strategy not found"
    assert isinstance(sms_strategy, SMSNotificationStrategy), "Wrong strategy type"
    
    # Test In-App strategy
    inapp_strategy = service.get_strategy("In-App")
    assert inapp_strategy is not None, "In-App strategy not found"
    assert isinstance(inapp_strategy, InAppNotificationStrategy), "Wrong strategy type"
    
    # Test that strategies are interchangeable
    result1 = email_strategy.send(
        recipient="test@example.com",
        subject="Test",
        message="Test message",
        notification_type=NotificationType.BIKE_RENTED
    )
    assert result1 is True, "Email strategy failed"
    
    result2 = sms_strategy.send(
        recipient="+1234567890",
        subject="Test",
        message="Test message",
        notification_type=NotificationType.BIKE_RENTED
    )
    assert result2 is True, "SMS strategy failed"
    
    result3 = inapp_strategy.send(
        recipient="user123",
        subject="Test",
        message="Test message",
        notification_type=NotificationType.BIKE_RENTED
    )
    assert result3 is True, "In-App strategy failed"


def test_notification_service_integration():
    """Test the integration of Singleton and Strategy patterns."""
    service = get_notification_service()
    
    # Test default strategy
    default_strategy = service.get_strategy()
    assert default_strategy is not None, "Default strategy not set"
    
    # Test sending notification with default strategy
    result = service.notify(
        recipient="test@example.com",
        subject="Test Notification",
        message="This is a test notification",
        notification_type=NotificationType.BIKE_RENTED
    )
    assert result is True, "Notification failed"
    
    # Test sending notification with specific strategy
    result = service.notify(
        recipient="test@example.com",
        subject="Test Notification",
        message="This is a test notification",
        notification_type=NotificationType.BIKE_RENTED,
        strategy_name="SMS"
    )
    assert result is True, "SMS notification failed"
    
    # Test sending to all strategies
    results = service.notify_all_strategies(
        recipient="test@example.com",
        subject="Test Notification",
        message="This is a test notification",
        notification_type=NotificationType.MAINTENANCE_DUE
    )
    assert len(results) > 0, "No strategies executed"
    assert all(results.values()), "Some strategies failed"
    
    # Test In-App strategy stores notifications
    inapp_strategy = service.get_strategy("In-App")
    assert isinstance(inapp_strategy, InAppNotificationStrategy), "Wrong strategy type"
    notifications = inapp_strategy.get_notifications("test@example.com")
    assert len(notifications) > 0, "In-App notifications not stored"


def test_strategy_registration():
    """Test that new strategies can be registered dynamically."""
    service = get_notification_service()
    
    # Test replacing an existing strategy (count should stay the same)
    initial_count = len(service.get_available_strategies())
    
    # Create a new Email strategy to replace the existing one
    class EnhancedEmailStrategy(EmailNotificationStrategy):
        def get_strategy_name(self) -> str:
            return "Email"
    
    enhanced_email = EnhancedEmailStrategy()
    service.register_strategy(enhanced_email)
    
    # Count should remain the same since we replaced Email, not added
    assert len(service.get_available_strategies()) == initial_count, "Strategy count changed when replacing"
    assert "Email" in service.get_available_strategies(), "Email strategy not found after replacement"
    
    # Test adding a new strategy (count should increase)
    class CustomStrategy(InAppNotificationStrategy):
        def get_strategy_name(self) -> str:
            return "Custom"
    
    custom_strategy = CustomStrategy()
    count_before_custom = len(service.get_available_strategies())
    service.register_strategy(custom_strategy)
    
    # Count should increase by 1 since Custom is a new strategy
    assert len(service.get_available_strategies()) == count_before_custom + 1, "Custom strategy not added"
    assert "Custom" in service.get_available_strategies(), "Custom strategy not registered"
    
    # Test using the custom strategy
    result = service.notify(
        recipient="test@example.com",
        subject="Test",
        message="Test message",
        notification_type=NotificationType.BIKE_RENTED,
        strategy_name="Custom"
    )
    assert result is True, "Custom strategy failed"


def test_notification_types():
    """Test that all notification types are properly defined."""
    assert NotificationType.BIKE_RENTED.value == "bike_rented"
    assert NotificationType.BIKE_RETURNED.value == "bike_returned"
    assert NotificationType.MAINTENANCE_DUE.value == "maintenance_due"
    assert NotificationType.MAINTENANCE_COMPLETED.value == "maintenance_completed"
    assert NotificationType.BATTERY_LOW.value == "battery_low"
    assert NotificationType.RENTAL_EXPIRING.value == "rental_expiring"

