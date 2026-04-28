// This file has NO exports and NO functions — every line runs at module evaluation
// time, which happens before Strapi's React app renders its first frame.

const style = document.createElement('style');
style.id = 'scalex-early-css';
style.textContent = `
    /* Strip numbered list markers from sidebar before React renders */
    nav li, nav ol, nav ul,
    aside li, aside ol, aside ul {
        list-style: none !important;
        list-style-type: none !important;
        counter-reset: none !important;
        counter-increment: none !important;
    }
    nav li::marker, aside li::marker,
    nav li::before, aside li::before {
        content: none !important;
        display: none !important;
    }
    nav ol, nav ul, aside ol, aside ul {
        padding-left: 0 !important;
    }

    /* Hide loan-application link in sidebar immediately */
    a[href*="loan-application"] {
        display: none !important;
    }

    /* Active nav link colours */
    nav a.active, nav a[aria-current="page"] {
        background-color: #1d4ed8 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border-radius: 4px;
    }

    /* Remove row-click navigation cursor on list tables */
    tbody tr { cursor: default !important; }
`;

if (!document.getElementById('scalex-early-css')) {
    document.head.appendChild(style);
}
