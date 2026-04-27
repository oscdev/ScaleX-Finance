import React from 'react';
import { Box, Typography, Flex, Button, Loader } from '@strapi/design-system';
import { useAdvisorOverview } from './useAdvisorOverview';
import { styles, cardBorderStyle } from './styles';

const StatCard = ({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: number;
    color: string;
    icon: string;
}) => (
    <Box
        padding={4}
        background="neutral0"
        shadow="filterShadow"
        borderRadius="8px"
        style={cardBorderStyle(color)}
    >
        <Flex gap={3}>
            <Box
                padding={2}
                background={`${color}100` as any}
                borderRadius="4px"
                style={styles.cardIconBox}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="pi" textColor="neutral600" display="block">
                    {label}
                </Typography>
                <Typography variant="alpha" fontWeight="bold" textColor="neutral800">
                    {value}
                </Typography>
            </Box>
        </Flex>
    </Box>
);

export const AdvisorOverviewDashboard = () => {
    const { stats, loading } = useAdvisorOverview();

    if (loading) {
        return (
            <Box padding={4} background="neutral100" borderRadius="8px" marginBottom={6}>
                <Flex justifyContent="center">
                    <Loader>Loading Dashboard...</Loader>
                </Flex>
            </Box>
        );
    }

    return (
        <Box
            padding={6}
            background="neutral100"
            borderRadius="12px"
            marginBottom={6}
            shadow="tableShadow"
        >
            <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
                <Box>
                    <Typography variant="beta" fontWeight="bold" textColor="primary600">
                        ADVISORS OVERVIEW
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" display="block">
                        Real-time advisor metrics
                    </Typography>
                </Box>
                <Button
                    variant="default"
                    onClick={() => window.location.reload()}
                    style={styles.refreshButton}
                >
                    Refresh Stats
                </Button>
            </Flex>

            <div style={styles.metricsGrid}>
                <StatCard label="Total Advisors" value={stats.total} color="#1d4ed8" icon="👥" />
                <StatCard label="Active Advisors" value={stats.active} color="#10b981" icon="✅" />
                <StatCard label="Inactive Advisors" value={stats.inactive} color="#ef4444" icon="🚫" />
            </div>
        </Box>
    );
};
