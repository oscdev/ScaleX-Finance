import React from 'react';
import { ActiveInactiveOverviewDashboard } from '../shared/ActiveInactiveOverviewDashboard';
import { useActiveInactiveCounts } from '../shared/useActiveInactiveCounts';

const LENDERS_UID = 'api::lender-master.lenders-catalog';

export const LendersOverviewDashboard = () => {
    const { stats, loading } = useActiveInactiveCounts({
        kind: 'cm',
        uid: LENDERS_UID,
        activeFilterQs: 'filters[isActive][$eq]=true',
    });

    return (
        <ActiveInactiveOverviewDashboard
            title="LENDERS OVERVIEW"
            subtitle="Real-time lenders catalog metrics"
            totalLabel="Total Lenders"
            activeLabel="Active Lenders"
            inactiveLabel="Inactive Lenders"
            stats={stats}
            loading={loading}
        />
    );
};
