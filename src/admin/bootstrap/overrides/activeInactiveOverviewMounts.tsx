import { LendersOverviewDashboard } from '../../LendersOverview';
import { ProductOverviewDashboard } from '../../ProductOverview';
import { UsersOverviewDashboard } from '../../UsersOverview';
import { applyListOverviewMount, isCmCollectionListPath } from './listOverviewMount';

const LENDERS_UID = 'api::lender-master.lenders-catalog';
const PRODUCTS_UID = 'api::product.product';

export const applyLendersOverviewMount = () => {
    applyListOverviewMount({
        rootId: 'lenders-overview-root',
        matchPath: () => isCmCollectionListPath(LENDERS_UID),
        Dashboard: LendersOverviewDashboard,
    });
};

export const applyProductOverviewMount = () => {
    applyListOverviewMount({
        rootId: 'product-overview-root',
        matchPath: () => isCmCollectionListPath(PRODUCTS_UID),
        Dashboard: ProductOverviewDashboard,
    });
};

export const applyUsersOverviewMount = () => {
    applyListOverviewMount({
        rootId: 'users-overview-root',
        matchPath: () => window.location.pathname.replace(/\/+$/, '') === '/admin/settings/users',
        Dashboard: UsersOverviewDashboard,
    });
};
