import React from 'react';
import { Box, Typography, Flex, Badge, Button } from '@strapi/design-system';
import { useAdminNotifications } from './useAdminNotifications';
import { bellActionLabel, formatBellDescription } from './bellLabels';
import { styles } from './styles';

export const AdminNotifications = () => {
    const { notifications, isOpen, unreadCount, isEnabled, dropdownRef, toggleOpen } =
        useAdminNotifications();

    if (!isEnabled) return null;

    return (
        <Box style={styles.container} ref={dropdownRef}>
            <Button variant="tertiary" onClick={toggleOpen} style={styles.bellButton}>
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <Badge style={styles.badge}>{unreadCount}</Badge>}
            </Button>

            {isOpen && (
                <Box
                    padding={3}
                    background="neutral0"
                    shadow="filterShadow"
                    hasRadius
                    style={styles.dropdown}
                >
                    <Typography
                        variant="sigma"
                        textColor="neutral800"
                        style={styles.dropdownTitle}
                    >
                        Recent Activity
                    </Typography>

                    {notifications.length === 0 ? (
                        <Typography variant="pi" textColor="neutral500">
                            No recent notifications
                        </Typography>
                    ) : (
                        notifications.map((notif) => (
                            <Box
                                key={notif.id}
                                paddingTop={3}
                                paddingBottom={3}
                                style={styles.notifRow}
                            >
                                <Flex direction="column" alignItems="start" gap={1}>
                                    <Box style={styles.notifHeader}>
                                        <Badge
                                            variant={
                                                notif.severity === 'warning' ||
                                                notif.action === 'BUREAU_EXTRACT_FAILED'
                                                    ? 'danger'
                                                    : 'success'
                                            }
                                        >
                                            {bellActionLabel(notif.action, notif.metadata)}
                                        </Badge>
                                        <Typography
                                            variant="pi"
                                            textColor="neutral500"
                                            style={styles.timeText}
                                        >
                                            {new Date(notif.createdAt).toLocaleTimeString()}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="omega"
                                        textColor="neutral800"
                                        style={styles.descText}
                                    >
                                        {formatBellDescription(notif)}
                                    </Typography>
                                </Flex>
                            </Box>
                        ))
                    )}
                </Box>
            )}
        </Box>
    );
};
