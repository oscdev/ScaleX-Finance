import { useState, useEffect, useRef } from 'react';
import { dedupeNotifications } from './dedupeNotifications';

export const useAdminNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isEnabled, setIsEnabled] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const settingsRes = await fetch('/api/global-setting');
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                const settings = settingsData.data;
                const enabled = settings?.notificationsIsEnabled ?? true;
                setIsEnabled(enabled);
                if (!enabled) return;
            }

            const res = await fetch(
                '/api/activity-logs?sort=createdAt:DESC&pagination[limit]=10&filters[severity][$in][0]=info&filters[severity][$in][1]=warning'
            );
            if (res.ok) {
                const data = await res.json();
                const logs = dedupeNotifications(data.data || []);
                const lastSeenId = parseInt(localStorage.getItem('last_seen_notification_id') || '0');
                const newUnreadCount = logs.filter((log: any) => log.id > lastSeenId).length;
                setNotifications(logs);
                setUnreadCount(newUnreadCount);
            }
        } catch (err) {
            // swallow
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 1000 * 30);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && notifications.length > 0) {
            localStorage.setItem('last_seen_notification_id', notifications[0].id.toString());
            setUnreadCount(0);
        }
    };

    return { notifications, isOpen, unreadCount, isEnabled, dropdownRef, toggleOpen };
};
