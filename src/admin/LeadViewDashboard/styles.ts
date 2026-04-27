import { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
    rootBox: {
        minHeight: '100vh',
    },
    identityIcon: {
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
    },
    fourColGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
    },
    fourColGridTight: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
    },
    twoColGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px',
    },
    historyHeaderBox: {
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
    },
    historyScroll: {
        flex: 1,
        background: '#f6f7f9',
        maxHeight: '400px',
        overflowY: 'auto',
    },
    conversationBox: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    remarkContainer: {
        display: 'flex',
        flexDirection: 'column',
        width: 'fit-content',
    },
    authorBadge: {
        fontSize: '10px',
        fontWeight: 'bold',
    },
    messageTimestamp: {
        fontSize: '9px',
    },
    messageText: {
        wordBreak: 'break-word',
    },
    statusSelect: {
        flex: 1,
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #dcdce4',
    },
    docTable: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    docHeadRow: {
        background: '#f6f6f9',
        textAlign: 'left',
        borderBottom: '1px solid #dcdce4',
    },
    docRow: {
        borderBottom: '1px solid #f6f6f9',
    },
    docCell: {
        padding: '12px',
    },
    docCellCenter: {
        padding: '12px',
        textAlign: 'center',
    },
    fileFormatBoxBase: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '34px',
        borderRadius: '3px',
        border: '1px solid',
    },
    uploadedBadge: {
        background: '#22c55e',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '12px',
        display: 'inline-block',
        fontSize: '10px',
        fontWeight: 'bold',
    },
    viewButton: {
        background: '#1e293b',
        color: '#ffffff',
        borderRadius: '4px',
        padding: '6px 12px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 600,
        border: 'none',
        minWidth: '70px',
        transition: 'opacity 0.2s',
    },
    viewButtonIcon: {
        flexShrink: 0,
    },
    loansTable: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    loansHeadRow: {
        background: '#f6f6f9',
        textAlign: 'left',
    },
    loansRow: {
        borderBottom: '1px solid #f1f1f1',
    },
    loansCell: {
        padding: '8px',
    },
    timelineBorder: {
        borderLeft: '2px solid #1d4ed8',
    },
    timelineDotInitial: {
        border: '3px solid white',
    },
    timelineDotStatus: {
        border: '3px solid white',
    },
    timelineGrid: {
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
    },
    debugLog: {
        marginTop: '4px',
    },
};

export const logTextStyle: CSSProperties = { marginTop: '4px' };

export const fileFormatBox = (ext: string): CSSProperties => ({
    ...styles.fileFormatBoxBase,
    background: ext === 'PDF' ? '#fee2e2' : '#f1f5f9',
    borderColor: ext === 'PDF' ? '#fca5a5' : '#cbd5e1',
});

export const fileFormatText = (ext: string): CSSProperties => ({
    fontSize: '9px',
    color: ext === 'PDF' ? '#dc2626' : '#475569',
});

export const bubbleStyle = (isMine: boolean): CSSProperties => ({
    borderBottomRightRadius: isMine ? '0px' : '12px',
    borderBottomLeftRadius: isMine ? '12px' : '0px',
    border: isMine ? 'none' : '1px solid #eaeaef',
});
