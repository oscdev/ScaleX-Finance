'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavItem {
    label: string;
    href: string;
    isButton?: boolean;
    buttonStyle?: 'primary' | 'secondary';
}

interface MobileNavProps {
    items: NavItem[];
}

export default function MobileNav({ items }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            <button
                className="mobile-menu-btn"
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
            >
                <span className={`hamburger-line ${open ? 'open' : ''}`} />
                <span className={`hamburger-line ${open ? 'open' : ''}`} />
                <span className={`hamburger-line ${open ? 'open' : ''}`} />
            </button>

            {open && (
                <div className="mobile-nav-overlay" onClick={() => setOpen(false)}>
                    <nav className="mobile-nav-panel" onClick={e => e.stopPropagation()}>
                        {items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={
                                    item.isButton
                                        ? `btn btn-${item.buttonStyle} mobile-nav-btn`
                                        : 'mobile-nav-link'
                                }
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
