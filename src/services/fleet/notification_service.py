"""
Notification Service - Singleton Pattern Implementation

This service provides a centralized notification system for fleet events.
Uses Singleton pattern to ensure only one instance exists throughout the application.
"""
from typing import List, Optional
from abc import ABC, abstractmethod
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Types of notifications that can be sent."""
    BIKE_RENTED = "bike_rented"
    BIKE_RETURNED = "bike_returned"
    MAINTENANCE_DUE = "maintenance_due"
    MAINTENANCE_COMPLETED = "maintenance_completed"
    BATTERY_LOW = "battery_low"
    RENTAL_EXPIRING = "rental_expiring"


class NotificationStrategy(ABC):
    """
    Strategy Pattern: Abstract base class for notification strategies.
    Different strategies can be implemented (Email, SMS, In-App, etc.)
    """
    
    @abstractmethod
    def send(self, recipient: str, subject: str, message: str, notification_type: NotificationType) -> bool:
        """
        Send a notification.
        
        Args:
            recipient: Recipient identifier (email, phone, user_id, etc.)
            subject: Notification subject/title
            message: Notification message content
            notification_type: Type of notification
            
        Returns:
            True if notification was sent successfully, False otherwise
        """
        pass
    
    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this notification strategy."""
        pass


class EmailNotificationStrategy(NotificationStrategy):
    """Strategy for sending notifications via email."""
    
    def send(self, recipient: str, subject: str, message: str, notification_type: NotificationType) -> bool:
        """Send notification via email."""
        logger.info(f"[Email] To: {recipient}, Subject: {subject}, Type: {notification_type.value}")
        logger.info(f"[Email] Message: {message}")
        # In a real implementation, this would send an actual email
        # For now, we'll just log it
        return True
    
    def get_strategy_name(self) -> str:
        return "Email"


class SMSNotificationStrategy(NotificationStrategy):
    """Strategy for sending notifications via SMS."""
    
    def send(self, recipient: str, subject: str, message: str, notification_type: NotificationType) -> bool:
        """Send notification via SMS."""
        logger.info(f"[SMS] To: {recipient}, Type: {notification_type.value}")
        logger.info(f"[SMS] Message: {message}")
        # In a real implementation, this would send an actual SMS
        # For now, we'll just log it
        return True
    
    def get_strategy_name(self) -> str:
        return "SMS"


class InAppNotificationStrategy(NotificationStrategy):
    """Strategy for sending in-app notifications."""
    
    def __init__(self):
        self._notifications: List[dict] = []
    
    def send(self, recipient: str, subject: str, message: str, notification_type: NotificationType) -> bool:
        """Store notification in-app (could be persisted to database in real implementation)."""
        notification = {
            "recipient": recipient,
            "subject": subject,
            "message": message,
            "type": notification_type.value,
            "read": False
        }
        self._notifications.append(notification)
        logger.info(f"[In-App] Notification stored for user: {recipient}, Type: {notification_type.value}")
        return True
    
    def get_strategy_name(self) -> str:
        return "In-App"
    
    def get_notifications(self, recipient: str) -> List[dict]:
        """Get all notifications for a recipient."""
        return [n for n in self._notifications if n["recipient"] == recipient]


class NotificationService:
    """
    Singleton Pattern: Ensures only one instance of NotificationService exists.
    
    This service manages notifications using the Strategy pattern to support
    different notification delivery methods (Email, SMS, In-App).
    """
    _instance: Optional['NotificationService'] = None
    _initialized: bool = False
    
    def __new__(cls):
        """Singleton implementation: return the same instance if it exists."""
        if cls._instance is None:
            cls._instance = super(NotificationService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the notification service with default strategies."""
        # Prevent re-initialization if instance already exists
        if NotificationService._initialized:
            return
        
        self._strategies: List[NotificationStrategy] = []
        self._default_strategy: Optional[NotificationStrategy] = None
        
        # Register default strategies
        self.register_strategy(EmailNotificationStrategy())
        self.register_strategy(SMSNotificationStrategy())
        self.register_strategy(InAppNotificationStrategy())
        
        # Set email as default strategy
        self.set_default_strategy("Email")
        
        NotificationService._initialized = True
    
    def register_strategy(self, strategy: NotificationStrategy):
        """Register a new notification strategy."""
        # Remove existing strategy of the same type if it exists
        self._strategies = [s for s in self._strategies if s.get_strategy_name() != strategy.get_strategy_name()]
        self._strategies.append(strategy)
        logger.info(f"Registered notification strategy: {strategy.get_strategy_name()}")
    
    def set_default_strategy(self, strategy_name: str):
        """Set the default notification strategy."""
        for strategy in self._strategies:
            if strategy.get_strategy_name() == strategy_name:
                self._default_strategy = strategy
                logger.info(f"Default notification strategy set to: {strategy_name}")
                return
        logger.warning(f"Strategy '{strategy_name}' not found. Default strategy not changed.")
    
    def get_strategy(self, strategy_name: Optional[str] = None) -> Optional[NotificationStrategy]:
        """Get a specific strategy by name, or return the default strategy."""
        if strategy_name:
            for strategy in self._strategies:
                if strategy.get_strategy_name() == strategy_name:
                    return strategy
            return None
        return self._default_strategy
    
    def notify(
        self,
        recipient: str,
        subject: str,
        message: str,
        notification_type: NotificationType,
        strategy_name: Optional[str] = None
    ) -> bool:
        """
        Send a notification using the specified strategy or default strategy.
        
        Args:
            recipient: Recipient identifier
            subject: Notification subject
            message: Notification message
            notification_type: Type of notification
            strategy_name: Optional strategy name (uses default if not specified)
            
        Returns:
            True if notification was sent successfully, False otherwise
        """
        strategy = self.get_strategy(strategy_name)
        if not strategy:
            logger.error(f"Notification strategy '{strategy_name}' not found")
            return False
        
        try:
            success = strategy.send(recipient, subject, message, notification_type)
            if success:
                logger.info(f"Notification sent successfully via {strategy.get_strategy_name()}")
            return success
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    def notify_all_strategies(
        self,
        recipient: str,
        subject: str,
        message: str,
        notification_type: NotificationType
    ) -> dict:
        """
        Send notification using all registered strategies.
        
        Returns:
            Dictionary with strategy names as keys and success status as values
        """
        results = {}
        for strategy in self._strategies:
            try:
                success = strategy.send(recipient, subject, message, notification_type)
                results[strategy.get_strategy_name()] = success
            except Exception as e:
                logger.error(f"Error sending notification via {strategy.get_strategy_name()}: {e}")
                results[strategy.get_strategy_name()] = False
        return results
    
    def get_available_strategies(self) -> List[str]:
        """Get list of available notification strategy names."""
        return [strategy.get_strategy_name() for strategy in self._strategies]


# Convenience function to get the singleton instance
def get_notification_service() -> NotificationService:
    """Get the singleton instance of NotificationService."""
    return NotificationService()

