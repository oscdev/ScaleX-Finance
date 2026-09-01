import { useEffect, useState } from 'react';
import { getToken } from '../LeadViewDashboard/useLeadViewDashboard';

export type SectionPerms = Record<
    string,
    {
        add: boolean;
        view: boolean;
        edit: boolean;
        delete: boolean;
        fields?: Record<string, { view: boolean; edit: boolean }>;
    }
>;

const allSectionsAllowed = (): SectionPerms => {
    const full = { add: true, edit: true, view: true, delete: true };
    return {
        personalInfo: full,
        personalDetails: full,
        addressDetails: full,
        propertyDetails: full,
        incomeDetails: full,
        businessInfo: full,
        runningLoans: full,
        documentDetails: full,
        assignmentStatus: full,
    };
};

export const useSectionPermissions = () => {
    const [sectionPerms, setSectionPerms] = useState<SectionPerms>(allSectionsAllowed());

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const res = await fetch('/admin/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const user = data.data || data;
                const roles: { id?: number; code?: string }[] = user.roles || [];
                if (roles.some((r) => r.code === 'strapi-super-admin')) return;

                const roleId = roles[0]?.id;
                if (!roleId) return;

                const denied: SectionPerms = {} as SectionPerms;
                const denyAll = () => {
                    Object.keys(allSectionsAllowed()).forEach((k) => {
                        denied[k] = { add: false, view: false, edit: false, delete: false };
                    });
                    setSectionPerms(denied);
                };

                const permRes = await fetch('/api/loan-app-section-permissions?pagination[pageSize]=100');
                if (!permRes.ok) {
                    denyAll();
                    return;
                }
                const permData = await permRes.json();
                const allRecords: { roleId?: number; permissions?: SectionPerms }[] = permData.data || [];
                const record = allRecords.find((r) => Number(r.roleId) === roleId);
                if (record?.permissions) {
                    setSectionPerms({ ...allSectionsAllowed(), ...record.permissions });
                } else {
                    denyAll();
                }
            } catch {
                // keep defaults
            }
        };
        fetchMe();
    }, []);

    const canView = (section: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        if (sp.view) return true;
        return Object.values(sp.fields || {}).some((fp) => fp?.view === true);
    };

    const canEditSection = (section: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        if (sp.edit || sp.add) return true;
        return Object.values(sp.fields || {}).some((fp) => fp?.edit === true);
    };

    const canViewField = (section: string, field: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        const fields = sp.fields;
        const anyFieldEnabled = !!fields && Object.values(fields).some((fp) => fp?.view === true);
        if (anyFieldEnabled) return fields?.[field]?.view === true;
        return sp.view === true;
    };

    const canEditField = (section: string, field: string): boolean => {
        if (!canViewField(section, field)) return false;
        const sp = sectionPerms[section];
        if (!sp) return true;
        const fields = sp.fields;
        const anyFieldEditable = !!fields && Object.values(fields).some((fp) => fp?.edit === true);
        if (anyFieldEditable) return fields?.[field]?.edit === true;
        return sp.edit === true || sp.add === true;
    };

    return { sectionPerms, canView, canEditSection, canViewField, canEditField };
};
