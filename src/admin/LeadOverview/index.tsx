import React from 'react';
import { Box, Typography, Flex, Button, Loader } from '@strapi/design-system';
import { useLeadOverview } from './useLeadOverview';
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

export const LeadOverviewDashboard = () => {
    const { stats, loading } = useLeadOverview();

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
                        LEADS OVERVIEW
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" display="block">
                        Real-time performance metrics
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
                <StatCard label="Total Leads" value={stats.total} color="#2563eb" icon="📊" />
                <StatCard label="New" value={stats.new} color="#0ea5e9" icon="🆕" />
                <StatCard label="Processing" value={stats.underProcess} color="#f59e0b" icon="⏳" />
                <StatCard label="Approved" value={stats.approved} color="#10b981" icon="✅" />
                <StatCard label="Rejected" value={stats.rejected} color="#ef4444" icon="❌" />
                <StatCard label="Disbursed" value={stats.disbursed} color="#8b5cf6" icon="💰" />
            </div>
        </Box>
    );
};
