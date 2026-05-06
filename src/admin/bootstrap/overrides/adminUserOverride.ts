export const applyAdminUserOverride = (commonHeaders: Record<string, string>) => {
    const match = window.location.pathname.match(/\/admin\/settings\/users\/(\d+)/);
    if (!match) {
        (window as any)._admin_user_pass_loaded = false;
        return;
    }

    const adminId = match[1];
    if (
        (window as any)._admin_user_pass_loaded &&
        (window as any)._current_admin_edit_id === adminId
    ) return;

    (window as any)._admin_user_pass_loaded = true;
    (window as any)._current_admin_edit_id = adminId;

    const prefillPassword = async () => {
        try {
            const res = await fetch(
                `/content-manager/collection-types/api::advisor.advisor?filters[id][$eq]=${adminId}`,
                { headers: commonHeaders }
            );
            if (!res.ok) return;
            const data = await res.json();
            const advisorData = (data.results || data.data || [])[0];
            if (!advisorData) return;

            const pass = advisorData.password || advisorData.attributes?.password;
            if (!pass) return;

            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                const passInputs = Array.from(document.querySelectorAll('input')).filter(
                    (i) =>
                        i.type === 'password' ||
                        i.name?.toLowerCase().includes('password') ||
                        i.id?.toLowerCase().includes('password')
                );

                if (passInputs.length >= 2) {
                    passInputs.forEach((input) => {
                        if (input.value !== pass) {
                            input.value = pass;
                            input.type = 'text';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    });
                    if (attempts > 50) clearInterval(interval);
                }
                if (attempts > 150) clearInterval(interval);
            }, 500);
        } catch (e) {
            console.error('[Admin Pass Override]', e);
        }
    };

    prefillPassword();
};
