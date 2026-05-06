import React, { useEffect } from 'react';
import { Box, Typography, Button, Flex, Badge, Textarea } from '@strapi/design-system';
import {
    LEAD_STATUS_OPTIONS,
    PRODUCT_CONFIG,
    getAppSteps,
    useLeadViewDashboard,
    buildDocuments,
    handleDocView,
} from './useLeadViewDashboard';
import { styles, fileFormatBox, fileFormatText, bubbleStyle, logTextStyle } from './styles';

export const LeadDetailDashboard = ({ leadId }: { leadId: string }) => {
    const {
        lead,
        loanApp,
        advisor,
        isLoading,
        status,
        setStatus,
        newRemark,
        setNewRemark,
        isUpdating,
        currentUser,
        errorLogs,
        handleUpdateStatus,
    } = useLeadViewDashboard(leadId);

    useEffect(() => {
        const root = document.getElementById('custom-dashboard-root');
        if (root) root.scrollTop = 0;
    }, [leadId]);

    if (isLoading) {
        return <Box padding={8} background="neutral100">Loading Lead Detail Dashboard...</Box>;
    }

    if (!lead) {
        return (
            <Box padding={8} background="danger100">
                <Typography variant="beta">Lead not found (ID: {leadId})</Typography>
                <Box marginTop={4} padding={4} background="neutral0" hasRadius shadow="filterShadow">
                    <Typography variant="delta">Debug Trace:</Typography>
                    {errorLogs.map((log, i) => (
                        <Typography
                            key={i}
                            variant="pi"
                            textColor="danger700"
                            display="block"
                            style={logTextStyle}
                        >
                            • {log}
                        </Typography>
                    ))}
                </Box>
            </Box>
        );
    }

    const productType = lead.selectedProduct || loanApp?.loanType || 'Personal Loan';
    const config = PRODUCT_CONFIG[productType] || PRODUCT_CONFIG['Personal Loan'];
    const appSteps = getAppSteps(productType, lead.employmentType || '');

    const currentStatusColor =
        LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'neutral';
    const currentStatusLabel =
        LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

    const docs = buildDocuments(loanApp);

    return (
        <Box padding={6} background="neutral100" style={styles.rootBox}>
            {/* Header / Breadcrumbs */}
            <Flex gap={2} marginBottom={4} alignItems="center">
                <Button 
                    variant="ghost" 
                    size="S" 
                    onClick={() => window.open('/admin/content-manager/collection-types/api::lead.lead', '_self')}
                    style={{ padding: '0 4px' }}
                >
                    <Typography variant="pi" textColor="primary600" fontWeight="bold">← BACK TO LEADS</Typography>
                </Button>
                <span>/</span>
                <Typography variant="pi" textColor="neutral600">{productType}</Typography>
                <span>/</span>
                <Typography variant="pi" fontWeight="bold">Lead View</Typography>
            </Flex>

            {/* Top Identity Card */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px" marginBottom={4}>
                <Flex gap={4}>
                    <Box padding={2} background="success100" borderRadius="50%" style={styles.identityIcon}>
                        👤
                    </Box>
                    <Box>
                        <Typography variant="beta" fontWeight="bold">{lead.fullName || 'N/A'}</Typography>
                        <Typography variant="pi" textColor="neutral600" marginLeft={2}>- #{leadId}</Typography>
                    </Box>
                </Flex>
            </Box>

            {/* Metric Grid */}
            <div style={styles.metricGrid}>
                {[
                    { label: 'Product', val: productType, icon: '📄', bg: 'neutral200' },
                    {
                        label: 'Required Amount',
                        val: lead.requiredAmount ? `₹ ${lead.requiredAmount.toLocaleString()}` : '₹ 0.00',
                        icon: '₹',
                        bg: 'success100',
                        color: 'success700',
                    },
                    {
                        label: 'Advisor',
                        val: advisor ? advisor.fullName : 'N/A',
                        sub: `Referral ID: ${lead.advisorReferralId || 'N/A'}`,
                        icon: '👤',
                        bg: 'primary100',
                    },
                    { label: 'Lead Status', val: currentStatusLabel, icon: '⚙️', bg: 'neutral200', isBadge: true },
                ].map((m, i) => (
                    <Box key={i} background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                        <Flex gap={3}>
                            <Box padding={3} background={m.bg as any} borderRadius="8px">{m.icon}</Box>
                            <Box>
                                <Typography variant="pi" textColor="neutral600" display="block">{m.label}</Typography>
                                {m.isBadge ? (
                                    <Badge variant={currentStatusColor as any}>{m.val}</Badge>
                                ) : (
                                    <>
                                        <Typography
                                            variant="delta"
                                            fontWeight="bold"
                                            textColor={((m as any).color || 'neutral800') as any}
                                        >
                                            {m.val}
                                        </Typography>
                                        {(m as any).sub && (
                                            <Typography variant="pi" display="block" textColor="neutral600">
                                                {(m as any).sub}
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Flex>
                    </Box>
                ))}
            </div>

            {/* Lead Details */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">
                    Lead Details :
                </Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={styles.fourColGrid}>
                        {config.leadFields.map((f, i) => {
                            let val = lead[f.key] || 'N/A';
                            if (f.type === 'currency' && val !== 'N/A') {
                                val = `₹ ${val.toLocaleString()}`;
                            }
                            return (
                                <Box key={i} marginBottom={2}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">
                                        {f.label}
                                    </Typography>
                                    <Typography variant="pi" textColor="neutral800">{val}</Typography>
                                </Box>
                            );
                        })}
                        <Box marginBottom={2}>
                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">
                                Get Email Notifications?
                            </Typography>
                            <Typography variant="pi" textColor="neutral800">
                                {String(lead.getEmailNotification) === 'true' ? 'Yes' : 'No'}
                            </Typography>
                        </Box>
                    </div>
                </Box>
            </Box>

            {/* Management & History */}
            <div style={styles.twoColGrid}>
                {/* Status Update Form */}
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">
                        Lead Management
                    </Typography>

                    <Box padding={3} background="neutral150" borderRadius="4px" marginBottom={4}>
                        <Typography variant="pi">Current Status: </Typography>
                        <Badge variant={currentStatusColor as any} marginLeft={2}>{currentStatusLabel}</Badge>
                    </Box>

                    <Box marginBottom={4}>
                        <Typography
                            variant="pi"
                            fontWeight="bold"
                            textColor="primary600"
                            display="block"
                            marginBottom={1}
                        >
                            UPDATE LEAD STATUS *
                        </Typography>
                        <Flex gap={2}>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={styles.statusSelect}
                            >
                                {LEAD_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Flex>
                    </Box>

                    <Box marginBottom={4}>
                        <Typography
                            variant="pi"
                            fontWeight="bold"
                            textColor="primary600"
                            display="block"
                            marginBottom={1}
                        >
                            Lead Remark *
                        </Typography>
                        <Textarea
                            placeholder="Enter remarks here..."
                            value={newRemark}
                            onChange={(e: any) => setNewRemark(e.target.value)}
                        />
                    </Box>

                    <Button onClick={handleUpdateStatus} loading={isUpdating} variant="default" size="L">
                        Update Status
                    </Button>
                </Box>

                {/* Conversation History */}
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" style={styles.conversationBox}>
                    <Box padding={3} background="neutral700" style={styles.historyHeaderBox}>
                        <Typography variant="pi" fontWeight="bold" textColor="neutral0">
                            Conversation History
                        </Typography>
                    </Box>
                    <Box padding={4} style={styles.historyScroll}>
                        {(() => {
                            if (!Array.isArray(lead.remarks)) {
                                return (
                                    <Box padding={8} textAlign="center">
                                        <Typography variant="pi" textColor="neutral500">
                                            No conversation history available.
                                        </Typography>
                                    </Box>
                                );
                            }

                            const validRemarks = lead.remarks.filter((entry: any) => {
                                if (!entry.text || entry.text.trim() === '') return false;
                                if (entry.text === `Status changed to ${entry.status}`) return false;
                                return true;
                            });

                            if (validRemarks.length === 0) {
                                return (
                                    <Box padding={8} textAlign="center">
                                        <Typography variant="pi" textColor="neutral500">
                                            No conversation history available.
                                        </Typography>
                                    </Box>
                                );
                            }

                            return (
                                <Flex direction="column" alignItems="stretch" gap={4}>
                                    {validRemarks.map((entry: any, index: number) => {
                                        const isMine =
                                            currentUser &&
                                            entry.author &&
                                            entry.author.includes(currentUser.firstname) &&
                                            entry.author.includes(currentUser.lastname || '');

                                        return (
                                            <Box
                                                key={index}
                                                maxWidth="70%"
                                                style={{
                                                    ...styles.remarkContainer,
                                                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                                                }}
                                            >
                                                <Flex
                                                    justifyContent={isMine ? 'flex-end' : 'flex-start'}
                                                    marginBottom={1}
                                                    gap={2}
                                                >
                                                    {!isMine && (
                                                        <Box
                                                            background="neutral200"
                                                            color="neutral800"
                                                            padding={1}
                                                            borderRadius="4px"
                                                            style={styles.authorBadge}
                                                        >
                                                            {entry.author?.[0] || 'U'}
                                                        </Box>
                                                    )}
                                                    <Typography
                                                        variant="pi"
                                                        textColor="neutral600"
                                                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                    >
                                                        {entry.author}
                                                    </Typography>
                                                    {isMine && (
                                                        <Box
                                                            background="primary600"
                                                            color="white"
                                                            padding={1}
                                                            borderRadius="4px"
                                                            style={styles.authorBadge}
                                                        >
                                                            You
                                                        </Box>
                                                    )}
                                                </Flex>

                                                <Box
                                                    background={isMine ? 'primary600' : 'neutral0'}
                                                    color={isMine ? 'white' : 'neutral800'}
                                                    padding={3}
                                                    borderRadius="12px"
                                                    shadow="filterShadow"
                                                    style={bubbleStyle(isMine)}
                                                >
                                                    <Typography
                                                        variant="pi"
                                                        textColor={isMine ? 'neutral0' : 'neutral800'}
                                                        style={styles.messageText}
                                                    >
                                                        {entry.text}
                                                    </Typography>

                                                    <Flex justifyContent="flex-end" marginTop={2} gap={4}>
                                                        <Typography
                                                            variant="pi"
                                                            textColor={isMine ? 'neutral200' : 'neutral500'}
                                                            style={styles.messageTimestamp}
                                                        >
                                                            {new Date(entry.timestamp).toLocaleString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                            })}
                                                        </Typography>
                                                    </Flex>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Flex>
                            );
                        })()}
                    </Box>
                </Box>
            </div>

            {/* Step-wise Application Details */}
            {loanApp ? (
                <>
                    {appSteps.includes('Business') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Business Details
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={styles.fourColGridTight}>
                                    {[
                                        { label: 'Business Name', val: loanApp.form_data?.businessDetails?.name || 'N/A' },
                                        { label: 'Business Premises', val: loanApp.form_data?.businessDetails?.premises || 'N/A' },
                                        { label: 'Business Type', val: loanApp.form_data?.businessDetails?.type || 'N/A' },
                                        { label: 'Annual Turnover', val: loanApp.form_data?.businessDetails?.turnover || 'N/A' },
                                        { label: 'Business Age', val: loanApp.form_data?.businessDetails?.age || 'N/A' },
                                        { label: 'Business Registration Proof', val: loanApp.form_data?.businessDetails?.regProof || 'N/A' },
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                                display="block"
                                                fontWeight="bold"
                                            >
                                                {d.label}
                                            </Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                                <Box marginTop={2}>
                                    <Typography
                                        variant="pi"
                                        textColor="neutral600"
                                        display="block"
                                        fontWeight="bold"
                                    >
                                        Business Address
                                    </Typography>
                                    <Typography variant="pi" textColor="neutral800">
                                        {loanApp.form_data?.businessDetails?.address || 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {appSteps.includes('Personal') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Personal Details
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={styles.fourColGridTight}>
                                    {[
                                        { label: 'Date of Birth', val: loanApp.form_data?.personalDetails?.dob || 'N/A' },
                                        { label: 'Marital Status', val: loanApp.form_data?.personalDetails?.maritalStatus || 'N/A' },
                                        { label: 'Spouse Name', val: loanApp.form_data?.personalDetails?.spouseName || 'N/A' },
                                        { label: 'Mother Name', val: loanApp.form_data?.personalDetails?.motherName || 'N/A' },
                                        { label: 'Alternate Number', val: loanApp.form_data?.personalDetails?.alternateNumber || 'N/A' },
                                        ...(productType !== 'Business Loan'
                                            ? [{ label: 'Dependent', val: loanApp.form_data?.personalDetails?.dependents || 'N/A' }]
                                            : []),
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                                display="block"
                                                fontWeight="bold"
                                            >
                                                {d.label}
                                            </Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {appSteps.includes('Residence') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Residence Details
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={styles.fourColGridTight}>
                                    {[
                                        { label: 'Address Line 1', val: loanApp.form_data?.addressDetails?.line1 || 'N/A' },
                                        { label: 'Address Line 2', val: loanApp.form_data?.addressDetails?.line2 || 'N/A' },
                                        { label: 'Landmark', val: loanApp.form_data?.addressDetails?.landmark || 'N/A' },
                                        { label: 'State', val: loanApp.form_data?.addressDetails?.state || 'N/A' },
                                        { label: 'District', val: loanApp.form_data?.addressDetails?.district || 'N/A' },
                                        { label: 'City', val: loanApp.form_data?.addressDetails?.city || 'N/A' },
                                        { label: 'Residence Type', val: loanApp.form_data?.addressDetails?.residenceType || 'N/A' },
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                                display="block"
                                                fontWeight="bold"
                                            >
                                                {d.label}
                                            </Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {appSteps.includes('Property') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Property Details
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={styles.fourColGridTight}>
                                    {[
                                        { label: 'Property Type', val: loanApp.form_data?.propertyDetails?.type || 'N/A' },
                                        { label: 'Property Current Status', val: loanApp.form_data?.propertyDetails?.status || 'N/A' },
                                        { label: 'Property Value', val: loanApp.form_data?.propertyDetails?.value || 'N/A' },
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                                display="block"
                                                fontWeight="bold"
                                            >
                                                {d.label}
                                            </Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                                <Box marginTop={2}>
                                    <Typography
                                        variant="pi"
                                        textColor="neutral600"
                                        display="block"
                                        fontWeight="bold"
                                    >
                                        Property Address With Pincode
                                    </Typography>
                                    <Typography variant="pi" textColor="neutral800">
                                        {loanApp.form_data?.addressDetails?.propertyAddressPincode || 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {appSteps.includes('Income') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Income Details
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={styles.fourColGridTight}>
                                    {[
                                        { label: 'Company Name', val: loanApp.form_data?.incomeDetails?.companyName || 'N/A' },
                                        { label: 'Designation', val: loanApp.form_data?.incomeDetails?.designation || 'N/A' },
                                        { label: 'Company Address', val: loanApp.form_data?.incomeDetails?.companyAddress || 'N/A' },
                                        {
                                            label: 'Net Salary (Per Month)',
                                            val: loanApp.form_data?.incomeDetails?.netSalary
                                                ? `₹ ${parseInt(loanApp.form_data.incomeDetails.netSalary).toLocaleString()}`
                                                : 'N/A',
                                        },
                                        { label: 'Salary Mode', val: loanApp.form_data?.incomeDetails?.salaryMode || 'N/A' },
                                        { label: 'Current Job Stability', val: loanApp.form_data?.incomeDetails?.jobStability || 'N/A' },
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography
                                                variant="pi"
                                                textColor="neutral600"
                                                display="block"
                                                fontWeight="bold"
                                            >
                                                {d.label}
                                            </Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {appSteps.includes('Other') && (
                        <Box marginBottom={4}>
                            <Typography
                                variant="delta"
                                fontWeight="bold"
                                textColor="primary600"
                                marginBottom={2}
                                display="block"
                            >
                                Running Loan (If Any)
                            </Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                {loanApp.form_data?.otherDetails?.runningLoans?.length > 0 ? (
                                    <table style={styles.loansTable}>
                                        <thead>
                                            <tr style={styles.loansHeadRow}>
                                                <th style={styles.loansCell}>Loan Type</th>
                                                <th style={styles.loansCell}>Bank Name</th>
                                                <th style={styles.loansCell}>Loan Amount</th>
                                                <th style={styles.loansCell}>EMI amount</th>
                                                <th style={styles.loansCell}>No of Paid EMI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loanApp.form_data.otherDetails.runningLoans.map((l: any, i: number) => (
                                                <tr key={i} style={styles.loansRow}>
                                                    <td style={styles.loansCell}>{l.type}</td>
                                                    <td style={styles.loansCell}>{l.bank}</td>
                                                    <td style={styles.loansCell}>{l.amount}</td>
                                                    <td style={styles.loansCell}>{l.emi}</td>
                                                    <td style={styles.loansCell}>{l.paidEmi}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <Typography variant="pi" textColor="neutral600">
                                        No running loans reported.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </>
            ) : (
                <Box
                    padding={8}
                    background="neutral0"
                    shadow="filterShadow"
                    borderRadius="8px"
                    marginBottom={6}
                    textAlign="center"
                >
                    <Typography variant="pi" textColor="neutral600">
                        Application not fully submitted yet. Only Lead details available.
                    </Typography>
                </Box>
            )}

            {/* Document Details Table */}
            <Box marginBottom={6}>
                <Typography
                    variant="delta"
                    fontWeight="bold"
                    textColor="primary600"
                    marginBottom={2}
                    display="block"
                >
                    Document Details
                </Typography>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" overflow="hidden">
                    <table style={styles.docTable}>
                        <thead>
                            <tr style={styles.docHeadRow}>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Document ID</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">File Format</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Document Type</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Password</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Date</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">status</Typography></th>
                                <th style={styles.docCellCenter}><Typography variant="pi" fontWeight="bold">view</Typography></th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>
                                        <Typography variant="pi">No documents uploaded.</Typography>
                                    </td>
                                </tr>
                            ) : (
                                docs.map((doc, idx) => (
                                    <tr key={idx} style={styles.docRow}>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" textColor="neutral600">{doc.id}</Typography>
                                        </td>
                                        <td style={styles.docCell}>
                                            <div style={fileFormatBox(doc.ext)}>
                                                <Typography
                                                    variant="pi"
                                                    fontWeight="bold"
                                                    style={fileFormatText(doc.ext)}
                                                >
                                                    {doc.ext}
                                                </Typography>
                                            </div>
                                        </td>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" fontWeight="bold">{doc.type}</Typography>
                                        </td>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" textColor="neutral800">{doc.pw}</Typography>
                                        </td>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" textColor="neutral600" size="S">{doc.date}</Typography>
                                        </td>
                                        <td style={styles.docCell}>
                                            <div style={styles.uploadedBadge}>UPLOADED</div>
                                        </td>
                                        <td style={styles.docCellCenter}>
                                            <div
                                                onClick={(e) => handleDocView(e, doc.url, doc.pw)}
                                                style={styles.viewButton}
                                                title="View Document"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={styles.viewButtonIcon}
                                                >
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                                <span style={{ color: '#ffffff' }}>View</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Box>
            </Box>

            {/* Journey Timeline */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">
                    Process Journey
                </Typography>
                <Box paddingLeft={4} style={styles.timelineBorder}>
                    {/* Initial Entry */}
                    <Box marginBottom={6} position="relative">
                        <Box
                            position="absolute"
                            left="-23px"
                            top="0"
                            width="14px"
                            height="14px"
                            background="primary600"
                            borderRadius="50%"
                            style={styles.timelineDotInitial}
                        />
                        <div style={styles.timelineGrid}>
                            <Typography variant="pi" fontWeight="bold" textColor="primary700">
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                            </Typography>
                            <Box>
                                <Typography variant="pi" fontWeight="bold" display="block">LEAD GENERATED</Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    Initial lead captured via Frontend Form
                                </Typography>
                            </Box>
                        </div>
                    </Box>

                    {/* History Entries (status transitions only) */}
                    {(() => {
                        if (!Array.isArray(lead.remarks)) return null;

                        const validJourney: any[] = [];
                        let previousStatus: string | null = null;

                        lead.remarks.forEach((entry: any) => {
                            if (entry.status && entry.status !== previousStatus) {
                                validJourney.push(entry);
                                previousStatus = entry.status;
                            }
                        });

                        return validJourney.map((entry: any, i: number) => (
                            <Box key={i} marginBottom={6} position="relative">
                                <Box
                                    position="absolute"
                                    left="-23px"
                                    top="0"
                                    width="14px"
                                    height="14px"
                                    background="success600"
                                    borderRadius="50%"
                                    style={styles.timelineDotStatus}
                                />
                                <div style={styles.timelineGrid}>
                                    <Typography variant="pi" fontWeight="bold" textColor="success700">
                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                                    </Typography>
                                    <Box>
                                        <Typography variant="pi" fontWeight="bold" display="block">
                                            STATUS UPDATE: {entry.status}
                                        </Typography>
                                        <Typography
                                            variant="pi"
                                            textColor="neutral500"
                                            marginTop={1}
                                            display="block"
                                        >
                                            Author: {entry.author || 'N/A'}
                                        </Typography>
                                    </Box>
                                </div>
                            </Box>
                        ));
                    })()}
                </Box>
            </Box>
        </Box>
    );
};
