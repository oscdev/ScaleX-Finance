import React from 'react';
import { ActiveInactiveOverviewDashboard } from '../shared/ActiveInactiveOverviewDashboard';
import { useActiveInactiveCounts } from '../shared/useActiveInactiveCounts';

export const UsersOverviewDashboard = () => {
    const { stats, loading } = useActiveInactiveCounts({ kind: 'admin-users' });

    return (
        <ActiveInactiveOverviewDashboard
            title="USERS OVERVIEW"
            subtitle="Real-time admin user metrics"
            totalLabel="Total Users"
            activeLabel="Active Users"
            inactiveLabel="Inactive Users"
            stats={stats}
            loading={loading}
        />
    );
};
