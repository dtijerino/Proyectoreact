/**
 * NotificationSystem Component
 * Displays toast notifications with animations
 */
import { useEffect } from 'react';
import './NotificationSystem.css';

const NotificationSystem = ({ 
  notifications = [], 
  onRemove 
}) => {
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration > 0) {
        const timer = setTimeout(() => {
          onRemove(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onRemove]);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-system">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => onRemove(notification.id)}
        >
          <div className="notification-icon">
            {getIcon(notification.type)}
          </div>
          <div className="notification-content">
            <div className="notification-message">
              {notification.message}
            </div>
            {notification.description && (
              <div className="notification-description">
                {notification.description}
              </div>
            )}
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notification.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
