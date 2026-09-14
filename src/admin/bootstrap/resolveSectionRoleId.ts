/**
 * Pick the admin role id used for loan-app-section-permission lookups.
 * Prefers Advisor / Staff / Banker by code/name (same lists as syncSessionRole).
 * Falls back to roles[0] so single-role users keep prior behaviour.
 */
export const resolveSectionRoleId = (
    roles: Array<{ id?: number; code?: string; name?: string }> | undefined | null
): number | null => {
    if (!roles?.length) return null;

    const match = (
        codes: string[],
        names: string[]
    ): number | null => {
        const hit = roles.find(
            (r) =>
                (r.code != null && codes.includes(r.code)) ||
                (r.name != null && names.includes(r.name))
        );
        return hit?.id != null ? Number(hit.id) : null;
    };

    const advisorId = match(
        ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'],
        ['strapi-advisor', 'Advisor', 'advisor', 'Advisior']
    );
    if (advisorId != null) return advisorId;

    const staffId = match(
        ['strapi-editor', 'staff', 'Staff', 'strapi-staff'],
        ['staff', 'Staff']
    );
    if (staffId != null) return staffId;

    const bankerId = match(
        ['bankers-mosko0d4', 'banker', 'Banker', 'bankers', 'Bankers', 'strapi-banker'],
        ['banker', 'Banker', 'bankers', 'Bankers']
    );
    if (bankerId != null) return bankerId;

    const first = roles[0]?.id;
    return first != null ? Number(first) : null;
};
