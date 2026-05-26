(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/strapi.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getStrapiInternalUrl",
    ()=>getStrapiInternalUrl,
    "getStrapiPublicUrl",
    ()=>getStrapiPublicUrl,
    "strapiInternalApi",
    ()=>strapiInternalApi,
    "strapiPublicApi",
    ()=>strapiPublicApi,
    "withStrapiPublicUrl",
    ()=>withStrapiPublicUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
function getStrapiInternalUrl() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.STRAPI_INTERNAL_URL || 'http://127.0.0.1:1337';
}
function getStrapiPublicUrl() {
    // Browser-safe base URL. If empty, callers should use relative URLs (same-origin).
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_STRAPI_PUBLIC_URL || '';
}
function strapiPublicApi(pathnameAndQuery) {
    const p = pathnameAndQuery.startsWith('/') ? pathnameAndQuery : `/${pathnameAndQuery}`;
    const base = getStrapiPublicUrl();
    return base ? `${base}${p}` : p;
}
function strapiInternalApi(pathnameAndQuery) {
    const p = pathnameAndQuery.startsWith('/') ? pathnameAndQuery : `/${pathnameAndQuery}`;
    return `${getStrapiInternalUrl()}${p}`;
}
function withStrapiPublicUrl(pathOrUrl) {
    if (!pathOrUrl) return pathOrUrl;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = getStrapiPublicUrl();
    if (!base) return pathOrUrl;
    return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/logger.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logEvent",
    ()=>logEvent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$strapi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/strapi.ts [app-client] (ecmascript)");
;
const logEvent = async (params)=>{
    try {
        // Skip logs in production if they are just info (optional)
        // if (process.env.NODE_ENV === 'production' && params.severity === 'info') return;
        await fetch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$strapi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["strapiPublicApi"])('/api/activity-logs/log'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...params,
                severity: params.severity || 'info',
                model: params.model || 'frontend'
            })
        });
    } catch (err) {
    // We don't want to crash the UI if logging fails
    // console.error('[Frontend Logger Failure]', err);
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AadharCardField",
    ()=>AadharCardField,
    "AdvisorReferralField",
    ()=>AdvisorReferralField,
    "EmailField",
    ()=>EmailField,
    "EmploymentTypeField",
    ()=>EmploymentTypeField,
    "FullNameField",
    ()=>FullNameField,
    "LeadTypeField",
    ()=>LeadTypeField,
    "LoanRequirementField",
    ()=>LoanRequirementField,
    "MobileNumberField",
    ()=>MobileNumberField,
    "NotificationField",
    ()=>NotificationField,
    "PanCardField",
    ()=>PanCardField,
    "PinCodeField",
    ()=>PinCodeField,
    "PropertyStatusField",
    ()=>PropertyStatusField,
    "PropertyTypeField",
    ()=>PropertyTypeField,
    "PropertyValueField",
    ()=>PropertyValueField
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const Label = ({ text })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: "lead-form-label",
        children: [
            text.replace('*', ''),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "required-star",
                children: "*"
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 12,
                columnNumber: 63
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
_c = Label;
const FullNameField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.fullNameLabel || "Customer Name*";
    const placeholder = pageInfo.fullNamePlaceholder || "Enter Customer Name";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.fullName ? 'is-error' : ''}`,
                type: "text",
                name: "fullName",
                placeholder: placeholder,
                value: formData.fullName,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.fullName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.fullName
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 29,
                columnNumber: 33
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c1 = FullNameField;
const EmailField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.emailLabel || "Customer Email*";
    const placeholder = pageInfo.emailPlaceholder || "customer@example.com";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 39,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.email ? 'is-error' : ''}`,
                type: "email",
                name: "email",
                placeholder: placeholder,
                value: formData.email,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 40,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.email && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.email
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 48,
                columnNumber: 30
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 38,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c2 = EmailField;
const LoanRequirementField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.loanRequirementLabel || "Loan Requirement*";
    const placeholder = pageInfo.loanRequirementPlaceholder || "500000";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 58,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.requiredAmount ? 'is-error' : ''}`,
                type: "number",
                name: "requiredAmount",
                placeholder: placeholder,
                value: formData.requiredAmount,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 59,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.requiredAmount && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.requiredAmount
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 67,
                columnNumber: 39
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 57,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c3 = LoanRequirementField;
const MobileNumberField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.mobileNumberLabel || "Customer Mobile*";
    const placeholder = pageInfo.mobileNumberPlaceholder || "9876543210";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 77,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.mobileNumber ? 'is-error' : ''}`,
                type: "tel",
                name: "mobileNumber",
                placeholder: placeholder,
                value: formData.mobileNumber,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 78,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.mobileNumber && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.mobileNumber
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 86,
                columnNumber: 37
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 76,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c4 = MobileNumberField;
const PinCodeField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.pinCodeLabel || "Pincode*";
    const placeholder = pageInfo.pinCodePlaceholder || "400001";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 96,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.pinCode ? 'is-error' : ''}`,
                type: "text",
                name: "pinCode",
                placeholder: placeholder,
                value: formData.pinCode,
                onChange: handleChange,
                maxLength: 6
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 97,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.pinCode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.pinCode
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 106,
                columnNumber: 32
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 95,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c5 = PinCodeField;
const AadharCardField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.aadharCardLabel || "Aadhar Card*";
    const placeholder = pageInfo.aadharCardPlaceholder || "1234 5678 9012";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 116,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.aadharCard ? 'is-error' : ''}`,
                type: "text",
                name: "aadharCard",
                placeholder: placeholder,
                value: formData.aadharCard,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 117,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.aadharCard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.aadharCard
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 125,
                columnNumber: 35
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 115,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c6 = AadharCardField;
const PanCardField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.panCardLabel || "Pan Card*";
    const placeholder = pageInfo.panCardPlaceholder || "ABCDE1234F";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 135,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.panCard ? 'is-error' : ''}`,
                type: "text",
                name: "panCard",
                placeholder: placeholder,
                value: formData.panCard,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 136,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.panCard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.panCard
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 144,
                columnNumber: 32
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 134,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c7 = PanCardField;
const PropertyTypeField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.propertyTypeLabel || "Property Type*";
    const placeholder = pageInfo.propertyTypePlaceholder || "Select Property Type";
    const optionsArr = (pageInfo.propertyTypeOptions ?? "Residential, Commercial, Industrial").split(',').map((o)=>o.trim()).filter(Boolean);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 155,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                className: `lead-form-input ${errors.propertyType ? 'is-error' : ''}`,
                name: "propertyType",
                value: formData.propertyType,
                onChange: handleChange,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: placeholder
                    }, void 0, false, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 162,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    optionsArr.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: opt,
                            children: opt
                        }, opt, false, {
                            fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                            lineNumber: 164,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 156,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.propertyType && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.propertyType
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 167,
                columnNumber: 37
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 154,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c8 = PropertyTypeField;
const PropertyStatusField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.propertyStatusLabel || "Property Current Status*";
    const placeholder = pageInfo.propertyStatusPlaceholder || "Select Status";
    const optionsArr = (pageInfo.propertyStatusOptions ?? "Constructed, Plot, Boundaries").split(',').map((o)=>o.trim()).filter(Boolean);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 178,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                className: `lead-form-input ${errors.propertyStatus ? 'is-error' : ''}`,
                name: "propertyStatus",
                value: formData.propertyStatus,
                onChange: handleChange,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: placeholder
                    }, void 0, false, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 185,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    optionsArr.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: opt,
                            children: opt
                        }, opt, false, {
                            fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                            lineNumber: 187,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 179,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.propertyStatus && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.propertyStatus
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 190,
                columnNumber: 39
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 177,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c9 = PropertyStatusField;
const PropertyValueField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.propertyValueLabel || "Property Value*";
    const placeholder = pageInfo.propertyValuePlaceholder || "50,00,000";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 200,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${errors.propertyValue ? 'is-error' : ''}`,
                type: "number",
                name: "propertyValue",
                placeholder: placeholder,
                value: formData.propertyValue,
                onChange: handleChange
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 201,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.propertyValue && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.propertyValue
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 209,
                columnNumber: 38
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 199,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c10 = PropertyValueField;
const EmploymentTypeField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.employmentTypeLabel || "Occupation*";
    const placeholder = pageInfo.employmentTypePlaceholder || "Select Occupation";
    const optionsArr = (pageInfo.employmentTypeOptions ?? "Salaried, Self Employed").split(',').map((o)=>o.trim()).filter(Boolean);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 220,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                className: `lead-form-input ${errors.employmentType ? 'is-error' : ''}`,
                name: "employmentType",
                value: formData.employmentType,
                onChange: handleChange,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: placeholder
                    }, void 0, false, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 227,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    optionsArr.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: opt,
                            children: opt
                        }, opt, false, {
                            fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                            lineNumber: 229,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 221,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.employmentType && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.employmentType
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 232,
                columnNumber: 39
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 219,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c11 = EmploymentTypeField;
const LeadTypeField = ({ formData, errors, handleChange, pageInfo })=>{
    const label = pageInfo.leadTypeLabel || "Lead Type*";
    const placeholder = pageInfo.leadTypePlaceholder || "Select Lead Type";
    const optionsArr = (pageInfo.leadTypeOptions ?? "Fresh (New Lead), BT (Balance Transfer)").split(',').map((o)=>o.trim()).filter(Boolean);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Label, {
                text: label
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 243,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                className: `lead-form-input ${errors.leadType ? 'is-error' : ''}`,
                name: "leadType",
                value: formData.leadType,
                onChange: handleChange,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        children: placeholder
                    }, void 0, false, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 250,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    optionsArr.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: opt,
                            children: opt
                        }, opt, false, {
                            fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                            lineNumber: 252,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 244,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errors.leadType && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-error",
                children: errors.leadType
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 255,
                columnNumber: 33
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 242,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c12 = LeadTypeField;
const NotificationField = ({ formData, handleChange, pageInfo })=>{
    const label = pageInfo.getEmailNotificationLabel || "Get Email Notification for Lead Updated?*";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "lead-form-label",
                children: [
                    label.replace('*', ''),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "required-star",
                        children: "*"
                    }, void 0, false, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 264,
                        columnNumber: 72
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 264,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-radio-group",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "lead-form-radio-label",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "radio",
                                name: "getEmailNotification",
                                value: "Yes",
                                checked: formData.getEmailNotification === 'Yes',
                                onChange: handleChange
                            }, void 0, false, {
                                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                                lineNumber: 267,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            " Yes"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 266,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "lead-form-radio-label",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "radio",
                                name: "getEmailNotification",
                                value: "No",
                                checked: formData.getEmailNotification === 'No',
                                onChange: handleChange
                            }, void 0, false, {
                                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                                lineNumber: 270,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            " No"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                        lineNumber: 269,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 265,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 263,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c13 = NotificationField;
const AdvisorReferralField = ({ formData, handleChange, isAutoPopulated })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "lead-form-advisor-field",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "lead-form-label",
                children: "Advisor Referral ID (Optional)"
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 280,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                className: `lead-form-input ${isAutoPopulated ? 'is-disabled' : ''}`,
                type: "text",
                name: "advisorReferralId",
                placeholder: "ADV123456",
                value: formData.advisorReferralId,
                onChange: handleChange,
                readOnly: isAutoPopulated,
                disabled: isAutoPopulated
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadFields.tsx",
                lineNumber: 281,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/LeadFields.tsx",
        lineNumber: 279,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c14 = AdvisorReferralField;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14;
__turbopack_context__.k.register(_c, "Label");
__turbopack_context__.k.register(_c1, "FullNameField");
__turbopack_context__.k.register(_c2, "EmailField");
__turbopack_context__.k.register(_c3, "LoanRequirementField");
__turbopack_context__.k.register(_c4, "MobileNumberField");
__turbopack_context__.k.register(_c5, "PinCodeField");
__turbopack_context__.k.register(_c6, "AadharCardField");
__turbopack_context__.k.register(_c7, "PanCardField");
__turbopack_context__.k.register(_c8, "PropertyTypeField");
__turbopack_context__.k.register(_c9, "PropertyStatusField");
__turbopack_context__.k.register(_c10, "PropertyValueField");
__turbopack_context__.k.register(_c11, "EmploymentTypeField");
__turbopack_context__.k.register(_c12, "LeadTypeField");
__turbopack_context__.k.register(_c13, "NotificationField");
__turbopack_context__.k.register(_c14, "AdvisorReferralField");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BusinessLoanFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)");
;
;
function BusinessLoanFunnel({ formData, errors, handleChange, pageInfo }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "lead-form-grid",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoanRequirementField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 17,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FullNameField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 18,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNumberField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 19,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AadharCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PanCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PinCodeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmailField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationField"], {
                formData: formData,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx",
        lineNumber: 16,
        columnNumber: 9
    }, this);
}
_c = BusinessLoanFunnel;
var _c;
__turbopack_context__.k.register(_c, "BusinessLoanFunnel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PersonalLoanFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)");
;
;
function PersonalLoanFunnel({ formData, errors, handleChange, pageInfo }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "lead-form-grid",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoanRequirementField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 17,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FullNameField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 18,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNumberField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 19,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AadharCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PanCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PinCodeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmailField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationField"], {
                formData: formData,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx",
        lineNumber: 16,
        columnNumber: 9
    }, this);
}
_c = PersonalLoanFunnel;
var _c;
__turbopack_context__.k.register(_c, "PersonalLoanFunnel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HomeLoanFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)");
;
;
function HomeLoanFunnel({ formData, errors, handleChange, pageInfo }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "lead-form-grid",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LeadTypeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 19,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoanRequirementField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FullNameField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNumberField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AadharCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PanCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PinCodeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 25,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmailField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 26,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmploymentTypeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 27,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationField"], {
                formData: formData,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
                lineNumber: 28,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx",
        lineNumber: 18,
        columnNumber: 9
    }, this);
}
_c = HomeLoanFunnel;
var _c;
__turbopack_context__.k.register(_c, "HomeLoanFunnel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/funnels/LAPFunnel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LAPFunnel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)");
;
;
function LAPFunnel({ formData, errors, handleChange, pageInfo }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "lead-form-grid",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoanRequirementField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FullNameField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MobileNumberField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertyTypeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 24,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertyStatusField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 25,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertyValueField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 26,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AadharCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 27,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PanCardField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 28,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PinCodeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 29,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmailField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmploymentTypeField"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 31,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationField"], {
                formData: formData,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
                lineNumber: 32,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/lead-form/funnels/LAPFunnel.tsx",
        lineNumber: 20,
        columnNumber: 9
    }, this);
}
_c = LAPFunnel;
var _c;
__turbopack_context__.k.register(_c, "LAPFunnel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/lead-form/LeadForm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LeadForm,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$strapi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/strapi.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/logger.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$BusinessLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/funnels/BusinessLoanFunnel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$PersonalLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/funnels/PersonalLoanFunnel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$HomeLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/funnels/HomeLoanFunnel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$LAPFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/funnels/LAPFunnel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/lead-form/LeadFields.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
const dynamic = 'force-dynamic';
function LeadForm({ pageInfo }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [isAdvisorAutoPopulated, setIsAdvisorAutoPopulated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        fullName: '',
        email: '',
        requiredAmount: '',
        mobileNumber: '',
        advisorReferralId: '',
        selectedProduct: '',
        pinCode: '',
        aadharCard: '',
        panCard: '',
        propertyType: '',
        propertyStatus: '',
        propertyValue: '',
        employmentType: '',
        leadType: '',
        getEmailNotification: 'No'
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LeadForm.useEffect": ()=>{
            const savedProduct = sessionStorage.getItem('selectedProduct');
            if (savedProduct) {
                setFormData({
                    "LeadForm.useEffect": (prev)=>({
                            ...prev,
                            selectedProduct: savedProduct
                        })
                }["LeadForm.useEffect"]);
            }
            // Auto-populate Advisor ID if logged into Strapi
            const strapiAdvisorId = sessionStorage.getItem('strapiAdvisorId');
            if (strapiAdvisorId) {
                setFormData({
                    "LeadForm.useEffect": (prev)=>({
                            ...prev,
                            advisorReferralId: strapiAdvisorId
                        })
                }["LeadForm.useEffect"]);
                setIsAdvisorAutoPopulated(true);
            }
        }
    }["LeadForm.useEffect"], []);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSuccess, setIsSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [submitError, setSubmitError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleChange = (e)=>{
        const { name, value } = e.target;
        setFormData((prev)=>({
                ...prev,
                [name]: value
            }));
        // Form field level validations -> clear errors
        if (errors[name]) {
            setErrors((prev)=>({
                    ...prev,
                    [name]: undefined
                }));
        }
    };
    const validate = ()=>{
        const newErrors = {};
        const product = formData.selectedProduct;
        // Universal fields
        if (!formData.requiredAmount) newErrors.requiredAmount = 'Loan Requirement is required';
        if (!formData.fullName.trim()) newErrors.fullName = 'Customer Name is required';
        if (!formData.mobileNumber) {
            newErrors.mobileNumber = 'Mobile Number is required';
        } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
            newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
        }
        if (!formData.pinCode) {
            newErrors.pinCode = 'Pin Code is required';
        } else if (!/^\d{6}$/.test(formData.pinCode.replace(/\D/g, ''))) {
            newErrors.pinCode = 'Please enter a valid 6-digit pin code';
        }
        if (!formData.email) {
            newErrors.email = 'Email Address is required';
        } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }
        // Aadhar and Pan for all
        if (!formData.aadharCard) newErrors.aadharCard = 'Aadhar Card is required';
        else if (!/^\d{12}$/.test(formData.aadharCard.replace(/\s/g, ''))) newErrors.aadharCard = 'Invalid Aadhar Card';
        if (!formData.panCard) newErrors.panCard = 'Pan Card is required';
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panCard.toUpperCase())) newErrors.panCard = 'Invalid Pan Card';
        // Conditional fields
        if (product?.includes('LAP')) {
            if (!formData.propertyType) newErrors.propertyType = 'Property Type is required';
            if (!formData.propertyStatus) newErrors.propertyStatus = 'Property Status is required';
            if (!formData.propertyValue) newErrors.propertyValue = 'Property Value is required';
            if (!formData.employmentType) newErrors.employmentType = 'Occupation is required';
        }
        if (product === 'Home Loan') {
            if (!formData.leadType) newErrors.leadType = 'Lead Type is required';
            if (!formData.employmentType) newErrors.employmentType = 'Occupation is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setSubmitError(null);
        if (validate()) {
            setIsSubmitting(true);
            try {
                const payload = {
                    data: {
                        fullName: formData.fullName,
                        email: formData.email,
                        requiredAmount: parseFloat(formData.requiredAmount),
                        mobileNumber: formData.mobileNumber,
                        pinCode: formData.pinCode,
                        advisorReferralId: formData.advisorReferralId || null,
                        selectedProduct: formData.selectedProduct || null,
                        aadharCard: formData.aadharCard,
                        panCard: formData.panCard,
                        propertyType: formData.propertyType || null,
                        propertyStatus: formData.propertyStatus || null,
                        propertyValue: formData.propertyValue ? parseFloat(formData.propertyValue) : null,
                        employmentType: formData.employmentType || null,
                        leadType: formData.leadType || null,
                        getEmailNotification: formData.getEmailNotification === 'Yes'
                    }
                };
                const res = await fetch((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$strapi$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["strapiPublicApi"])('/api/leads'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    const failMsg = errorData?.error?.message || 'Failed to submit application';
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logEvent"])({
                        action: 'LEAD_SUBMISSION_FAILURE',
                        description: `Lead form submission failed for ${formData.email}`,
                        severity: 'error',
                        metadata: {
                            email: formData.email,
                            error: failMsg
                        }
                    });
                    throw new Error(failMsg);
                }
                const responseData = await res.json();
                const leadId = responseData?.data?.id;
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logEvent"])({
                    action: 'LEAD_SUBMISSION_SUCCESS',
                    description: `New lead submitted successfully: ${formData.fullName}`,
                    severity: 'info',
                    metadata: {
                        leadId,
                        email: formData.email,
                        product: formData.selectedProduct
                    }
                });
                // Save lead details for loan application pre-population
                sessionStorage.setItem('requiredAmount', formData.requiredAmount);
                sessionStorage.setItem('getEmailNotification', formData.getEmailNotification);
                sessionStorage.setItem('leadName', formData.fullName);
                sessionStorage.setItem('leadEmail', formData.email);
                sessionStorage.setItem('leadPhone', formData.mobileNumber);
                sessionStorage.setItem('leadAadhar', formData.aadharCard);
                sessionStorage.setItem('leadPan', formData.panCard);
                sessionStorage.setItem('leadOccupation', formData.employmentType);
                if (leadId) {
                    sessionStorage.setItem('lastLeadId', leadId.toString());
                }
                setIsSuccess(true);
            } catch (err) {
                setSubmitError(err.message || 'An unexpected error occurred. Please try again later.');
            } finally{
                setIsSubmitting(false);
            }
        }
    };
    if (isSuccess) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            className: "lead-form-section",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lead-form-success-container animate-fade-in delay-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "lead-form-card lead-form-success-card",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "lead-form-success-title",
                            children: [
                                formData.selectedProduct,
                                " Submitted!"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                            lineNumber: 201,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "lead-form-success-text",
                            children: [
                                "Thank you for submitting your lead application for ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: formData.selectedProduct
                                }, void 0, false, {
                                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                                    lineNumber: 202,
                                    columnNumber: 114
                                }, this),
                                ". Please proceed to fill out the detailed loan application form."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                            lineNumber: 202,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "btn btn-primary",
                            onClick: ()=>router.push('/loan-application'),
                            children: "Continue to Loan Application"
                        }, void 0, false, {
                            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                            lineNumber: 203,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                    lineNumber: 200,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                lineNumber: 199,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
            lineNumber: 198,
            columnNumber: 13
        }, this);
    }
    const backButtonLabel = pageInfo.backButtonLabel ?? "Back";
    const backButtonLink = pageInfo.backButtonLink ?? "/products";
    const submitButtonLabel = pageInfo.submitButtonLabel ?? "Loan Application";
    const renderFunnelFields = ()=>{
        const product = formData.selectedProduct;
        if (product?.includes('LAP')) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$LAPFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                lineNumber: 221,
                columnNumber: 20
            }, this);
        }
        if (product === 'Home Loan') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$HomeLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                lineNumber: 224,
                columnNumber: 20
            }, this);
        }
        if (product === 'Personal Loan') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$PersonalLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                formData: formData,
                errors: errors,
                handleChange: handleChange,
                pageInfo: pageInfo
            }, void 0, false, {
                fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                lineNumber: 227,
                columnNumber: 20
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$funnels$2f$BusinessLoanFunnel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            formData: formData,
            errors: errors,
            handleChange: handleChange,
            pageInfo: pageInfo
        }, void 0, false, {
            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
            lineNumber: 229,
            columnNumber: 16
        }, this);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "lead-form-section",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "lead-form-container animate-fade-in delay-200",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "lead-form-title",
                    children: formData.selectedProduct ? `${formData.selectedProduct} Lead Form` : 'Lead Form'
                }, void 0, false, {
                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                    lineNumber: 235,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    className: "lead-form-card",
                    onSubmit: handleSubmit,
                    children: [
                        renderFunnelFields(),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$lead$2d$form$2f$LeadFields$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AdvisorReferralField"], {
                            formData: formData,
                            handleChange: handleChange,
                            isAutoPopulated: isAdvisorAutoPopulated
                        }, void 0, false, {
                            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                            lineNumber: 242,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "lead-form-footer",
                            children: [
                                submitError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "lead-form-submit-error",
                                    children: submitError
                                }, void 0, false, {
                                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                                    lineNumber: 250,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-secondary",
                                    onClick: ()=>router.push(backButtonLink),
                                    children: backButtonLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                                    lineNumber: 254,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: `btn btn-primary ${isSubmitting ? 'btn-disabled' : ''}`,
                                    disabled: isSubmitting,
                                    children: isSubmitting ? 'Submitting...' : submitButtonLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                                    lineNumber: 262,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                            lineNumber: 248,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/lead-form/LeadForm.tsx",
                    lineNumber: 238,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/lead-form/LeadForm.tsx",
            lineNumber: 234,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/lead-form/LeadForm.tsx",
        lineNumber: 233,
        columnNumber: 9
    }, this);
}
_s(LeadForm, "ehamgL18r1nT3K7zls1n2s/f2qQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = LeadForm;
var _c;
__turbopack_context__.k.register(_c, "LeadForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_267e1b9b._.js.map