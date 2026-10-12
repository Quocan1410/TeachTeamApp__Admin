"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    HomeIcon,
    UsersIcon,
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
    SunIcon,
    MoonIcon,
    DocumentChartBarIcon,
    Bars3Icon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/shared/contexts/ThemeContext";
import AdminNotificationBell from "@/shared/components/common/AdminNotificationBell/AdminNotificationBell";
import { getUserInitials, hasCustomAvatar } from "@/lib/avatarUtils";
import { useProtectedAvatar } from "@/hooks/useProtectedAvatar";
import { getUserDisplayName } from "@/shared/utils/personDisplayName";
import styles from "./AdminSidebar.module.css";

interface AdminUser {
    firstName?: string;
    lastName?: string;
    email: string;
    userType: string;
    fullName?: string;
    avatarUrl?: string | null;
}

interface AdminSidebarProps {
    user: AdminUser;
    onLogout: () => void;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Users", href: "/dashboard/users", icon: UsersIcon },
    { name: "Courses", href: "/dashboard/courses", icon: AcademicCapIcon },
    {
        name: "Selections",
        href: "/dashboard/reports",
        icon: DocumentChartBarIcon,
    },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user, onLogout }) => {
    const pathname = usePathname();
    const { isDarkMode, toggleDarkMode, isHydrated } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [mobileOpen]);

    const initials = getUserInitials(user.firstName, user.lastName, user.email);
    const protectedAvatarUrl = useProtectedAvatar(
        hasCustomAvatar(user.avatarUrl),
        user.avatarUrl
    );
    const avatarSrc = hasCustomAvatar(user.avatarUrl)
        ? protectedAvatarUrl
        : null;
    const displayName = getUserDisplayName(user);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const sidebarBody = (
        <>
            <div className={styles.brand}>
                <Link href="/dashboard" className={styles.brandLink}>
                    <span className={styles.brandMark} aria-hidden>
                        TT
                    </span>
                    <span className={styles.brandText}>
                        <span className={styles.brandTitle}>eduTeam</span>
                        <span className={styles.brandSubtitle}>Admin</span>
                    </span>
                </Link>
            </div>

            <nav className={styles.nav} aria-label="Admin navigation">
                {navigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`${styles.navLink} ${
                                active ? styles.navLinkActive : ""
                            }`}
                            aria-current={active ? "page" : undefined}
                        >
                            <item.icon className={styles.navIcon} aria-hidden />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.footerTools}>
                    <AdminNotificationBell menuPlacement="top-start" />
                    <button
                        type="button"
                        className={styles.themeButton}
                        onClick={isHydrated ? toggleDarkMode : undefined}
                        aria-label={
                            isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                        }
                        disabled={!isHydrated}
                    >
                        {isDarkMode ? (
                            <SunIcon className={styles.themeIcon} aria-hidden />
                        ) : (
                            <MoonIcon className={styles.themeIcon} aria-hidden />
                        )}
                    </button>
                </div>

                <div className={styles.userCard}>
                    <div className={styles.userAvatar}>
                        {avatarSrc ? (
                            <Image
                                src={avatarSrc}
                                alt=""
                                width={40}
                                height={40}
                                className={styles.userAvatarImage}
                                unoptimized
                            />
                        ) : (
                            <span className={styles.userInitials}>{initials}</span>
                        )}
                    </div>
                    <div className={styles.userMeta}>
                        <span className={styles.userName}>{displayName}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className={styles.signOut}
                    onClick={onLogout}
                >
                    <ArrowRightOnRectangleIcon
                        className={styles.signOutIcon}
                        aria-hidden
                    />
                    Sign out
                </button>
            </div>
        </>
    );

    return (
        <>
            <aside className={styles.sidebar} aria-label="Admin sidebar">
                {sidebarBody}
            </aside>

            <div className={styles.mobileBar}>
                <button
                    type="button"
                    className={styles.mobileMenuButton}
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                >
                    <Bars3Icon className={styles.mobileMenuIcon} aria-hidden />
                </button>
                <Link href="/dashboard" className={styles.mobileBrand}>
                    <span className={styles.brandMark} aria-hidden>
                        TT
                    </span>
                    <span className={styles.mobileBrandText}>Admin</span>
                </Link>
                <div className={styles.mobileBarActions}>
                    <AdminNotificationBell />
                </div>
            </div>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        className={styles.mobileBackdrop}
                        aria-label="Close menu"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside
                        className={`${styles.sidebar} ${styles.sidebarDrawer}`}
                        aria-label="Admin menu"
                    >
                        <button
                            type="button"
                            className={styles.drawerClose}
                            onClick={() => setMobileOpen(false)}
                            aria-label="Close menu"
                        >
                            <XMarkIcon className={styles.mobileMenuIcon} aria-hidden />
                        </button>
                        {sidebarBody}
                    </aside>
                </>
            )}
        </>
    );
};

export default AdminSidebar;
