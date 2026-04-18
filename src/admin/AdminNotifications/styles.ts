import { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
    container: {
        position: 'relative',
    },
    bellButton: {
        padding: '8px',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: '-2px',
        right: '-2px',
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '2px 5px',
        fontSize: '10px',
        minWidth: '18px',
        borderRadius: '10px',
    },
    dropdown: {
        position: 'absolute',
        top: '50px',
        right: '0',
        width: '320px',
        zIndex: 9999,
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #dcdce4',
    },
    dropdownTitle: {
        marginBottom: '12px',
        display: 'block',
    },
    notifRow: {
        borderBottom: '1px solid #f6f6f9',
    },
    notifHeader: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    timeText: {
        fontSize: '10px',
    },
    descText: {
        fontSize: '12px',
        fontWeight: 500,
    },
    viewAllBox: {
        textAlign: 'center',
    },
};
