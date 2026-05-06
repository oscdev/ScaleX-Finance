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

export const syncAdvisorSession = async (isRetry = false): Promise<void> => {
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
                setTimeout(() => syncAdvisorSession(true), 2000);
            }
            return;
        }

        const userData = await userRes.json();
        const adminUser = userData.data;

        if (!adminUser) return;

        const isAdvisor = adminUser.roles.some(
            (role: any) =>
                ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.code) ||
                ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.name)
        );

        if (!isAdvisor) return;

        const advisorRes = await fetch(`/api/advisors?filters[email][$eq]=${adminUser.email}`);

        if (advisorRes.ok) {
            const advisorData = await advisorRes.json();
            const advisor = advisorData.data?.[0];
            if (advisor) {
                sessionStorage.setItem('strapiAdvisorId', advisor.id.toString());
                sessionStorage.setItem('strapiAdvisorEmail', advisor.email);
            }
        }
    } catch (err) {}
};
