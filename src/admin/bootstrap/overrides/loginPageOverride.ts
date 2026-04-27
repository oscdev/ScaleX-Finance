export const applyLoginPageOverride = () => {
    const isLoginPage = window.location.pathname.includes('/admin/auth/login');

    // "Register as a partner" link beneath the sign-in heading
    // All styling is handled by #custom-partner-link-container and #custom-partner-link in CSS
    const headings = Array.from(document.querySelectorAll('h1, h2')).filter(
        (h) => h.textContent === 'Sign in to your account'
    );
    if (headings.length > 0 && !document.getElementById('custom-partner-link-container')) {
        const titleNode = headings[0];
        const container = document.createElement('div');
        container.id = 'custom-partner-link-container';
        container.innerHTML =
            'Or <span id="custom-partner-link">register as a partner</span>';
        if (titleNode.parentNode) titleNode.parentNode.insertBefore(container, titleNode.nextSibling);
    }

    // Demo credentials hint below the login form
    // Styling handled by #demo-credentials > div in CSS
    if (isLoginPage) {
        const forms = document.querySelectorAll('form');
        if (forms.length > 0 && !document.getElementById('demo-credentials')) {
            const demoDiv = document.createElement('div');
            demoDiv.id = 'demo-credentials';
            demoDiv.innerHTML = `<div>Demo: agent@oscprofessionals.in | password</div>`;
            forms[0].parentElement?.appendChild(demoDiv);
        }
    }
};
