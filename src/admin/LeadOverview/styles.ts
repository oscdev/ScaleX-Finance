import { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
    loadingBox: {
        display: 'flex',
        justifyContent: 'center',
    },
    headerFlex: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    refreshButton: {
        color: '#ffffff',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '16px',
    },
    cardIconBox: {
        fontSize: '20px',
    },
};

export const cardBorderStyle = (color: string): CSSProperties => ({
    borderLeft: `4px solid ${color}`,
});
