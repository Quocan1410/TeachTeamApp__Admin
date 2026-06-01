"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
    HomeIcon,
    UsersIcon,
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
    SunIcon,
    MoonIcon,
    ChevronDownIcon,
    DocumentChartBarIcon,
    MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../../../contexts/ThemeContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import AdminNotificationBell from "../AdminNotificationBell/AdminNotificationBell";
import { getUserInitials, hasCustomAvatar } from "@/lib/avatarUtils";
import { useProtectedAvatar } from "@/hooks/useProtectedAvatar";
import { getUserDisplayName } from "@/shared/utils/personDisplayName";
import styles from "./AdminHeader.module.css";

interface AdminUser {
    firstName?: string;
    lastName?: string;
    email: string;
    userType: string;
    fullName?: string;
    avatarUrl?: string | null;
}

interface AdminHeaderProps {
    user: AdminUser;
    onLogout: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onLogout }) => {
    const pathname = usePathname();
    const { isDarkMode, toggleDarkMode, isHydrated } = useTheme();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
        { name: "Users", href: "/dashboard/users", icon: UsersIcon },
        { name: "Courses", href: "/dashboard/courses", icon: AcademicCapIcon },
        {
            name: "Reports",
            href: "/dashboard/reports",
            icon: DocumentChartBarIcon,
        },
        {
            name: "Announcements",
            href: "/dashboard/announcements",
            icon: MegaphoneIcon,
        },
    ];

    const handleLogout = () => {
        onLogout();
        setIsUserDropdownOpen(false);
    };

    const initials = getUserInitials(
        user.firstName,
        user.lastName,
        user.email
    );
    const protectedAvatarUrl = useProtectedAvatar(
        hasCustomAvatar(user.avatarUrl),
        user.avatarUrl
    );
    const avatarSrc = hasCustomAvatar(user.avatarUrl)
        ? protectedAvatarUrl
        : null;
    const displayName = getUserDisplayName(user);

    return (
        <header
            className={`${styles.adminHeader} ${
                isScrolled ? styles.scrolled : ""
            }`}
        >
            <div className={styles.headerContainer}>
                <div className={styles.headerGrid}>
                    {/* Logo Section */}
                    <div className={styles.logoWrapper}>
                        <Link href="/dashboard" className={styles.logoLink}>
                            <div className={styles.logoContainer}>
                                <div className={styles.logoImageContainer}>
                                    <div className={styles.logoCircle}>
                                        <span className={styles.logoText}>
                                            TT
                                        </span>
                                    </div>
                                </div>
                                <span className={styles.logoTitle}>
                                    <span className={styles.logoPrefix}>
                                        Admin
                                    </span>
                                    <span className={styles.logoSuffix}>
                                        Panel
                                    </span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className={styles.mainNav}>
                        <div className={styles.navLinks}>
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`${styles.navLink} ${
                                            isActive ? styles.active : ""
                                        }`}
                                    >
                                        <item.icon className={styles.navIcon} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Header Actions */}
                    <div className={styles.headerActions}>
                        <AdminNotificationBell />
                        {/* User Dropdown */}
                        <div className={styles.userDropdown} ref={dropdownRef}>
                            <button
                                onClick={() =>
                                    setIsUserDropdownOpen(!isUserDropdownOpen)
                                }
                                className={styles.userButton}
                            >
                                <div className={styles.userAvatar}>
                                    {avatarSrc ? (
                                        <Image
                                            src={avatarSrc}
                                            alt={displayName}
                                            width={40}
                                            height={40}
                                            className={styles.userAvatarImage}
                                            unoptimized
                                        />
                                    ) : (
                                        <span className={styles.userInitials}>
                                            {initials}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>
                                        {displayName}
                                    </span>
                                    <span className={styles.userRole}>
                                        Admin
                                    </span>
                                </div>
                                <ChevronDownIcon
                                    className={`${styles.chevronIcon} ${
                                        isUserDropdownOpen ? styles.rotated : ""
                                    }`}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserDropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    <div className={styles.dropdownHeader}>
                                        <div className={styles.dropdownAvatar}>
                                            {avatarSrc ? (
                                                <Image
                                                    src={avatarSrc}
                                                    alt={displayName}
                                                    width={56}
                                                    height={56}
                                                    className={
                                                        styles.dropdownAvatarImage
                                                    }
                                                    unoptimized
                                                />
                                            ) : (
                                                <span
                                                    className={
                                                        styles.dropdownInitials
                                                    }
                                                >
                                                    {initials}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={styles.dropdownUserInfo}
                                        >
                                            <h3
                                                className={
                                                    styles.dropdownUserName
                                                }
                                            >
                                                {displayName}
                                            </h3>
                                            <p
                                                className={
                                                    styles.dropdownUserEmail
                                                }
                                            >
                                                {user.email}
                                            </p>
                                            <span
                                                className={
                                                    styles.dropdownUserRole
                                                }
                                            >
                                                Administrator
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.dropdownContent}>
                                        {/* Actions Row - Theme Toggle and Sign Out */}
                                        <div className={styles.actionsRow}>
                                            {/* Theme Toggle */}
                                            <div
                                                className={
                                                    styles.themeToggleContainer
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.themeToggleLabel
                                                    }
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`${styles.themeIcon} ${styles.lightIcon}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                                                        />
                                                    </svg>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className={`${styles.themeIcon} ${styles.darkIcon}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                                        />
                                                    </svg>
                                                </div>

                                                <div
                                                    className={`${
                                                        styles.themeToggle
                                                    } ${
                                                        isHydrated && isDarkMode
                                                            ? styles.active
                                                            : ""
                                                    }`}
                                                    onClick={
                                                        isHydrated
                                                            ? toggleDarkMode
                                                            : undefined
                                                    }
                                                    aria-label="Toggle dark mode"
                                                >
                                                    <div
                                                        className={
                                                            styles.toggleHandle
                                                        }
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Sign Out Button */}
                                            <button
                                                onClick={handleLogout}
                                                className={styles.signOutButton}
                                            >
                                                <ArrowRightOnRectangleIcon
                                                    className={
                                                        styles.actionIcon
                                                    }
                                                />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
