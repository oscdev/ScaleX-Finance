import { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
    refreshButton: {
        color: '#ffffff',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
    },
    cardIconBox: {
        fontSize: '20px',
    },
};

export const cardBorderStyle = (color: string): CSSProperties => ({
    borderLeft: `4px solid ${color}`,
});
