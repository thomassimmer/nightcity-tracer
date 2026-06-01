import { Bell, AlertTriangle, X } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';

interface NotificationCenterProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const levelColors = {
  info: 'text-cyan-400 border-cyan-500/40',
  warning: 'text-yellow-400 border-yellow-500/40',
  critical: 'text-red-400 border-red-500/60',
} as const;

const levelIcons = {
  info: <Bell size={10} />,
  warning: <AlertTriangle size={10} />,
  critical: <AlertTriangle size={10} />,
} as const;

export function NotificationCenter({ open, onOpen, onClose }: NotificationCenterProps) {
  const { activeAlerts, markAllAlertsRead } = useSimulationStore();

  const unreadCount = activeAlerts.filter((a) => !a.read).length;
  const hasCritical = activeAlerts.some((a) => !a.read && a.level === 'critical');

  function handleOpen() {
    markAllAlertsRead();
    onOpen();
  }

  return (
    <>
      <button
        data-tutorial-id="notif-btn"
        onClick={handleOpen}
        title="Notifications [N]"
        aria-label="Notifications"
        className={`relative flex items-center gap-1.5 text-xs font-mono border px-2 py-1 rounded transition-all
          ${unreadCount > 0
            ? 'border-theme-primary text-theme-primary'
            : 'border-gray-700 text-gray-400 hover:border-theme-primary hover:text-theme-primary'
          }`}
      >
        <Bell size={12} className={unreadCount > 0 && hasCritical ? 'animate-pulse' : ''} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold leading-none
            ${hasCritical ? 'bg-red-500 text-white' : 'bg-theme-primary text-black'}`}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="cyber-panel w-full max-w-md max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cyber-panel-header">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-theme-primary" />
                <span>NOTIFICATIONS ({activeAlerts.length})</span>
              </div>
              <button onClick={onClose} aria-label="Close" className="opacity-60 hover:opacity-100"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 text-xs">
              {activeAlerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-gray-600">No notifications</p>
              ) : (
                [...activeAlerts].reverse().map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-900 ${levelColors[alert.level]} ${alert.read ? 'opacity-50' : ''}`}
                  >
                    <span className="shrink-0 mt-0.5">{levelIcons[alert.level]}</span>
                    <span className="flex-1 leading-relaxed">{alert.message}</span>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-theme-border flex justify-end">
              <button onClick={onClose} className="cyber-button text-xs">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
