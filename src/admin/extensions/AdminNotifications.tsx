import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Flex,
    Badge,
    Portal,
    Button
} from '@strapi/design-system';

export const AdminNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isEnabled, setIsEnabled] = useState(true);

    const fetchNotifications = async () => {
        try {
            // First, check if notifications are globally enabled
            const settingsRes = await fetch('/api/global-setting');
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                const settings = settingsData.data;
                const enabled = settings?.notificationsIsEnabled ?? true;
                setIsEnabled(enabled);
                
                if (!enabled) return;
            }

            // Fetch last 10 logs (filtered for leads and security)
            const res = await fetch('/api/activity-logs?sort=createdAt:DESC&pagination[limit]=10&filters[severity][$in][0]=info&filters[severity][$in][1]=warning');
            if (res.ok) {
                const data = await res.json();
                const logs = data.data || [];
                
                // Track unread (using localStorage to store last seen ID)
                const lastSeenId = parseInt(localStorage.getItem('last_seen_notification_id') || '0');
                const newUnreadCount = logs.filter((log: any) => log.id > lastSeenId).length;
                
                setNotifications(logs);
                setUnreadCount(newUnreadCount);
            }
        } catch (err) {
            // console.error('[Notifications] Fetch failed:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 1000 * 30); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && notifications.length > 0) {
            // Mark as read
            localStorage.setItem('last_seen_notification_id', notifications[0].id.toString());
            setUnreadCount(0);
        }
    };

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isEnabled) return null;

    return (
        <Box style={{ position: 'relative' }} ref={dropdownRef}>
            <Button
                variant="tertiary"
                onClick={toggleOpen}
                style={{
                    padding: '8px',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                }}
            >
                {/* Bell Icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>

                {unreadCount > 0 && (
                    <Badge
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '2px 5px',
                            fontSize: '10px',
                            minWidth: '18px',
                            borderRadius: '10px'
                        }}
                    >
                        {unreadCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <Box
                    padding={3}
                    background="neutral0"
                    shadow="filterShadow"
                    hasRadius
                    style={{
                        position: 'absolute',
                        top: '50px',
                        right: '0',
                        width: '320px',
                        zIndex: 9999,
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid #dcdce4'
                    }}
                >
                    <Typography variant="sigma" textColor="neutral600" style={{ marginBottom: '12px', display: 'block' }}>
                        Recent Activity
                    </Typography>

                    {notifications.length === 0 ? (
                        <Typography variant="pi" textColor="neutral500">No recent notifications</Typography>
                    ) : (
                        notifications.map((notif) => (
                            <Box
                                key={notif.id}
                                paddingTop={3}
                                paddingBottom={3}
                                style={{ borderBottom: '1px solid #f6f6f9' }}
                            >
                                <Flex direction="column" alignItems="start" gap={1}>
                                    <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <Badge variant={notif.severity === 'warning' ? 'danger' : 'success'}>
                                            {notif.action}
                                        </Badge>
                                        <Typography variant="pi" textColor="neutral400" style={{ fontSize: '10px' }}>
                                            {new Date(notif.createdAt).toLocaleTimeString()}
                                        </Typography>
                                    </Box>
                                    <Typography variant="omega" style={{ fontSize: '12px', fontWeight: 500 }}>
                                        {notif.description}
                                    </Typography>
                                </Flex>
                            </Box>
                        ))
                    )}

                    <Box paddingTop={3} style={{ textAlign: 'center' }}>
                        <Button
                            variant="ghost"
                            size="S"
                            fullWidth
                            onClick={() => window.location.href = '/admin/content-manager/collection-types/api::activity-log.activity-log?sort=createdAt:DESC'}
                        >
                            View All Logs
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
