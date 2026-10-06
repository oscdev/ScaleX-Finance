/**
 * Advisor CM: inject ScaleX eye when Custom Actions showHidePassword is allowed.
 * Settings → Users: use Strapi's native eye — never inject a second one.
 *   - Allowed: leave type alone so native Show/Hide works.
 *   - Denied: force mask + hide native eye buttons.
 */

const WRAP_ATTR = 'data-scalex-pw-wrap';
const BTN_ATTR = 'data-scalex-pw-toggle';
const NATIVE_HIDDEN_ATTR = 'data-scalex-native-pw-hidden';

const EYE_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

const EYE_OFF_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

const isShowHideAllowed = (): boolean => (window as any)._showHidePasswordAllowed === true;

const isAdvisorCmEditPath = (): boolean =>
    /\/admin\/content-manager\/collection-types\/api::advisor\.advisor(\/|$)/.test(
        window.location.pathname
    );

const isUsersEditPath = (): boolean =>
    /\/admin\/settings\/users\/\d+/.test(window.location.pathname);

/** Label text owned by this input only (never scan sibling fields in the form). */
const getOwnFieldLabelText = (input: HTMLInputElement): string => {
    if (input.id) {
        const labelFor = document.querySelector<HTMLLabelElement>(
            `label[for="${CSS.escape(input.id)}"]`
        );
        if (labelFor) return (labelFor.textContent || '').trim().toLowerCase();
    }
    const wrapped = input.closest('label');
    if (wrapped) return (wrapped.textContent || '').trim().toLowerCase();
    // Immediate field wrapper only (one level of siblings) — not form-wide querySelector
    const wrap = input.parentElement;
    if (wrap) {
        for (const child of Array.from(wrap.children)) {
            if (child.tagName === 'LABEL') {
                return (child.textContent || '').trim().toLowerCase();
            }
        }
        const prev = wrap.previousElementSibling;
        if (prev?.tagName === 'LABEL') {
            return (prev.textContent || '').trim().toLowerCase();
        }
    }
    return '';
};

const isPasswordLabel = (labelText: string): boolean => {
    const t = labelText.replace(/\*/g, '').trim();
    return t === 'password' || t === 'confirm password' || t.startsWith('password ');
};

/** Settings → Users: password-type inputs or name/id/own-label containing password. */
const looksLikePasswordInput = (input: HTMLInputElement): boolean => {
    if (input.type === 'password') return true;
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    if (name.includes('password') || id.includes('password')) return true;
    return isPasswordLabel(getOwnFieldLabelText(input));
};

/** Advisor CM: only the password attribute — never State / other string fields. */
const isAdvisorPasswordField = (input: HTMLInputElement): boolean => {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    // Strapi CM often uses name="password" or id containing the attribute key
    if (name === 'password' || name.endsWith('.password') || name.endsWith('[password]')) {
        return true;
    }
    if (id === 'password' || /(^|[-_])password($|[-_])/.test(id)) {
        return true;
    }
    return isPasswordLabel(getOwnFieldLabelText(input));
};

const findPasswordInputs = (): HTMLInputElement[] => {
    const main = document.querySelector<HTMLElement>('main') ?? document.body;
    return Array.from(main.querySelectorAll<HTMLInputElement>('input')).filter((input) => {
        if (input.type === 'hidden' || input.disabled) return false;
        if (input.closest('[id*="login"], form[name="login"]')) return false;
        return looksLikePasswordInput(input);
    });
};

const setToggleVisual = (btn: HTMLButtonElement, visible: boolean) => {
    btn.innerHTML = visible ? EYE_OFF_SVG : EYE_SVG;
    btn.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    btn.title = visible ? 'Hide password' : 'Show password';
};

const ensureMasked = (input: HTMLInputElement) => {
    if (input.type !== 'password') {
        input.type = 'password';
    }
};

const removeToggle = (input: HTMLInputElement) => {
    const wrap = input.closest(`[${WRAP_ATTR}]`) as HTMLElement | null;
    const btn = wrap?.querySelector<HTMLButtonElement>(`button[${BTN_ATTR}]`);
    btn?.remove();
    if (wrap && wrap.getAttribute(WRAP_ATTR) === '1') {
        const parent = wrap.parentElement;
        if (parent) {
            parent.insertBefore(input, wrap);
            wrap.remove();
        }
        input.removeAttribute('data-scalex-pw-enhanced');
    }
};

const isNativePasswordToggleBtn = (btn: HTMLButtonElement): boolean => {
    if (btn.hasAttribute(BTN_ATTR)) return false;
    const label = `${btn.getAttribute('aria-label') || ''} ${btn.title || ''}`.toLowerCase();
    return (
        label.includes('show password') ||
        label.includes('hide password') ||
        label.includes('show the password') ||
        label.includes('hide the password') ||
        label.includes('toggle password')
    );
};

/** Find Strapi native eye buttons near a password input. */
const findNativeToggleButtons = (input: HTMLInputElement): HTMLButtonElement[] => {
    const candidates: HTMLButtonElement[] = [];
    let el: HTMLElement | null = input.parentElement;
    for (let i = 0; i < 8 && el; i++) {
        el.querySelectorAll<HTMLButtonElement>('button').forEach((btn) => {
            if (isNativePasswordToggleBtn(btn) && !candidates.includes(btn)) {
                candidates.push(btn);
            }
        });
        el = el.parentElement;
    }
    return candidates;
};

const hideNativeToggleButtons = (input: HTMLInputElement) => {
    for (const btn of findNativeToggleButtons(input)) {
        if (!btn.hasAttribute(NATIVE_HIDDEN_ATTR)) {
            btn.setAttribute(NATIVE_HIDDEN_ATTR, btn.style.display || '');
        }
        btn.style.display = 'none';
    }
};

const restoreNativeToggleButtons = (input: HTMLInputElement) => {
    for (const btn of findNativeToggleButtons(input)) {
        if (!btn.hasAttribute(NATIVE_HIDDEN_ATTR)) continue;
        const prev = btn.getAttribute(NATIVE_HIDDEN_ATTR) || '';
        btn.style.display = prev;
        btn.removeAttribute(NATIVE_HIDDEN_ATTR);
    }
};

const injectToggle = (input: HTMLInputElement) => {
    if (input.getAttribute('data-scalex-pw-enhanced') === '1') {
        const existingBtn = input
            .closest(`[${WRAP_ATTR}]`)
            ?.querySelector<HTMLButtonElement>(`button[${BTN_ATTR}]`);
        if (existingBtn) {
            // Do not remask — preserves Show after MutationObserver re-runs
            setToggleVisual(existingBtn, input.type === 'text');
            return;
        }
    }

    let wrap = input.parentElement;
    const alreadyWrapped = wrap?.hasAttribute(WRAP_ATTR);
    if (!alreadyWrapped) {
        wrap = document.createElement('div');
        wrap.setAttribute(WRAP_ATTR, '1');
        Object.assign(wrap.style, {
            position: 'relative',
            display: 'block',
            width: '100%',
        });
        const parent = input.parentElement;
        if (!parent) return;
        parent.insertBefore(wrap, input);
        wrap.appendChild(input);
    } else {
        wrap = wrap!;
        wrap.setAttribute(WRAP_ATTR, '1');
    }

    Object.assign(input.style, {
        paddingRight: '40px',
        width: '100%',
        boxSizing: 'border-box',
    });
    // First enhance only: start masked
    ensureMasked(input);

    if (wrap.querySelector(`button[${BTN_ATTR}]`)) {
        input.setAttribute('data-scalex-pw-enhanced', '1');
        return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(BTN_ATTR, '1');
    Object.assign(btn.style, {
        position: 'absolute',
        right: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666687',
        lineHeight: '0',
        zIndex: '2',
    });
    setToggleVisual(btn, false);

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isShowHideAllowed()) {
            ensureMasked(input);
            return;
        }
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        setToggleVisual(btn, show);
    });

    wrap.appendChild(btn);
    input.setAttribute('data-scalex-pw-enhanced', '1');
};

/** Advisor CM: password string field only. */
const findAdvisorPasswordInputs = (): HTMLInputElement[] => {
    const main = document.querySelector<HTMLElement>('main') ?? document.body;
    const inputs = Array.from(
        main.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="password"], input:not([type])')
    );
    return inputs.filter((input) => {
        if (input.type === 'hidden' || input.disabled) return false;
        return isAdvisorPasswordField(input);
    });
};

/** Undo mistaken eye / type=password on non-password Advisor fields (e.g. State). */
const cleanupNonPasswordAdvisorEnhancements = () => {
    const main = document.querySelector<HTMLElement>('main') ?? document.body;
    const enhanced = Array.from(
        main.querySelectorAll<HTMLInputElement>(`input[data-scalex-pw-enhanced="1"], [${WRAP_ATTR}] input`)
    );
    for (const input of enhanced) {
        if (isAdvisorPasswordField(input)) continue;
        removeToggle(input);
        if (input.type === 'password') {
            input.type = 'text';
        }
        input.style.paddingRight = '';
    }
};

const applyUsersPasswordReveal = (allowed: boolean) => {
    const inputs = findPasswordInputs();
    for (const input of inputs) {
        // Never keep a ScaleX eye on Users — native toggle only
        if (input.getAttribute('data-scalex-pw-enhanced') === '1' || input.closest(`[${WRAP_ATTR}]`)) {
            removeToggle(input);
        }
        if (allowed) {
            restoreNativeToggleButtons(input);
            // Leave input.type alone so Strapi Show/Hide works
        } else {
            ensureMasked(input);
            hideNativeToggleButtons(input);
        }
    }
};

const BCRYPT_RE = /^\$2[aby]?\$\d{2}\$/;

/** Never leave a stored bcrypt hash visible in the Advisor CM field. */
const clearStoredHashFromInput = (input: HTMLInputElement) => {
    if (BCRYPT_RE.test(input.value || '')) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

const applyAdvisorPasswordReveal = (allowed: boolean) => {
    cleanupNonPasswordAdvisorEnhancements();
    const inputs = findAdvisorPasswordInputs();
    for (const input of inputs) {
        clearStoredHashFromInput(input);
        if (allowed) {
            injectToggle(input);
        } else {
            if (input.getAttribute('data-scalex-pw-enhanced') === '1' || input.closest(`[${WRAP_ATTR}]`)) {
                removeToggle(input);
            }
            ensureMasked(input);
        }
    }
};

export const applyPasswordRevealOverride = (): void => {
    const advisorPage = isAdvisorCmEditPath();
    const usersPage = isUsersEditPath();

    if (!advisorPage && !usersPage) {
        return;
    }

    const allowed = isShowHideAllowed();

    if (usersPage) {
        applyUsersPasswordReveal(allowed);
        return;
    }

    if (advisorPage) {
        applyAdvisorPasswordReveal(allowed);
    }
};
