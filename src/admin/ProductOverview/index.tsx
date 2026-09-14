import React from 'react';
import { ActiveInactiveOverviewDashboard } from '../shared/ActiveInactiveOverviewDashboard';
import { useActiveInactiveCounts } from '../shared/useActiveInactiveCounts';

const PRODUCTS_UID = 'api::product.product';

export const ProductOverviewDashboard = () => {
    const { stats, loading } = useActiveInactiveCounts({
        kind: 'cm',
        uid: PRODUCTS_UID,
        activeFilterQs: 'filters[isActive][$eq]=true',
    });

    return (
        <ActiveInactiveOverviewDashboard
            title="PRODUCTS OVERVIEW"
            subtitle="Real-time product metrics"
            totalLabel="Total Products"
            activeLabel="Active Products"
            inactiveLabel="Inactive Products"
            stats={stats}
            loading={loading}
        />
    );
};
