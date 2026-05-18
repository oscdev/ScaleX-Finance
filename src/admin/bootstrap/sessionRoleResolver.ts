const findJwtInStorage = () => {
    const storages = [localStorage, sessionStorage];
    const jwtPattern = /^"?eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+"?$/;

    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [, value] = cookie.split('=');
        if (value && jwtPattern.test(value)) {
            return value;
        }
    }

    for (const storage of storages) {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            const value = storage.getItem(key);
            if (value && jwtPattern.test(value)) {
                return value.startsWith('"') ? JSON.parse(value) : value;
            }
            try {
                const parsed = JSON.parse(value || '');
                if (parsed?.token && jwtPattern.test(parsed.token)) return parsed.token;
                if (parsed?.jwt && jwtPattern.test(parsed.jwt)) return parsed.jwt;
            } catch (e) {}
        }
    }
    return null;
};

// ── Session role resolution promise ───────────────────────────────────────────
// The fetch interceptor awaits this before deciding whether to filter the leads
// list. It is reset to "pending" at the start of each sync and resolved once the
// current user's role is definitively known (advisor, staff, banker, or admin).

let _resolveRole: (() => void) | null = null;

const resetRolePromise = () => {
    (window as any)._sessionRoleReady = new Promise<void>(resolve => {
        _resolveRole = resolve;
    });
};

const resolveRolePromise = () => {
    _resolveRole?.();
    _resolveRole = null;
};

// Initialise as already-resolved so any fetch before bootstrap is harmless.
(window as any)._sessionRoleReady = Promise.resolve();

// ─────────────────────────────────────────────────────────────────────────────

export const syncSessionRole = async (isRetry = false): Promise<void> => {
    if (!isRetry) {
        // Synchronously clear stale role/session keys and mark role as "pending".
        // This must happen before any async work so the interceptor blocks the
        // next leads fetch until we know who is logged in.
        sessionStorage.removeItem('strapiAdvisorId');
        sessionStorage.removeItem('strapiAdvisorEmail');
        sessionStorage.removeItem('strapiAdvisorCode');
        sessionStorage.removeItem('strapiUserRole');
        sessionStorage.removeItem('strapiAdminUserId');
        resetRolePromise();
    }

    try {
        const token = findJwtInStorage();
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const userRes = await fetch('/admin/users/me', {
            headers,
            credentials: 'include',
        });

        if (!userRes.ok) {
            if (!isRetry) {
                // Schedule retry; promise stays pending until retry resolves it.
                setTimeout(() => syncSessionRole(true), 2000);
            } else {
                // Retry also failed — resolve so the interceptor doesn't hang.
                resolveRolePromise();
            }
            return;
        }

        const userData = await userRes.json();
        const adminUser = userData.data;

        if (!adminUser) {
            resolveRolePromise();
            return;
        }

        // Always store the admin user's numeric ID — needed by the fetch interceptor
        // to filter loan-application list rows for staff and banker roles.
        sessionStorage.setItem('strapiAdminUserId', String(adminUser.id));

        const isAdvisor = adminUser.roles.some(
            (role: any) =>
                ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.code) ||
                ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.name)
        );
        // 'strapi-editor' is the actual code used for the Staff role in this project.
        const isStaff = !isAdvisor && adminUser.roles.some(
            (role: any) =>
                ['strapi-editor', 'staff', 'Staff', 'strapi-staff'].includes(role.code) ||
                ['staff', 'Staff'].includes(role.name)
        );
        // 'bankers-mosko0d4' is the actual code for the Banker role in this project.
        const isBanker = !isAdvisor && !isStaff && adminUser.roles.some(
            (role: any) =>
                ['bankers-mosko0d4', 'banker', 'Banker', 'bankers', 'Bankers', 'strapi-banker'].includes(role.code) ||
                ['banker', 'Banker', 'bankers', 'Bankers'].includes(role.name)
        );

        // Store resolved role so DOM overrides can read it synchronously.
        const strapiRole = isAdvisor ? 'advisor' : isStaff ? 'staff' : isBanker ? 'banker' : 'admin';
        sessionStorage.setItem('strapiUserRole', strapiRole);

        if (!isAdvisor) {
            // Not an advisor — sessionStorage already cleared above; unblock the interceptor.
            resolveRolePromise();
            return;
        }

        // Advisor: fetch their record to get numeric ID, ADV code, and contact details.
        const advisorRes = await fetch(`/api/advisors?filters[email][$eq]=${adminUser.email}`);
        if (advisorRes.ok) {
            const advisorData = await advisorRes.json();
            const advisor = advisorData.data?.[0];
            if (advisor) {
                const attrs = advisor.attributes || advisor;
                sessionStorage.setItem('strapiAdvisorId', advisor.id.toString());
                sessionStorage.setItem('strapiAdvisorEmail', attrs.email || adminUser.email);
                if (attrs.advisorId) sessionStorage.setItem('strapiAdvisorCode', attrs.advisorId);

                // Populate advisorMap immediately so the leads table can render
                // name + contact icons without waiting for a separate prefetch.
                if (!(window as any).advisorMap) (window as any).advisorMap = {};
                (window as any).advisorMap[advisor.id] = {
                    name: attrs.fullName || adminUser.firstname + ' ' + adminUser.lastname,
                    id: advisor.id,
                    email: attrs.email || adminUser.email,
                    phone: attrs.phoneNumber || attrs.mobileNumber || '',
                };
            }
        }

        resolveRolePromise();
    } catch {
        // On any error, resolve so the interceptor doesn't hang forever.
        resolveRolePromise();
    }
};
