"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/shared/contexts/ThemeContext";
import AdminNotificationBell from "@/shared/components/common/AdminNotificationBell/AdminNotificationBell";
import styles from "./AdminTopBar.module.css";

function sectionLabel(pathname: string): string {
    if (pathname.startsWith("/dashboard/users")) return "Users";
    if (pathname.startsWith("/dashboard/courses")) return "Courses";
    if (pathname.startsWith("/dashboard/reports")) return "Selections";
    return "Dashboard";
}

const AdminTopBar: React.FC = () => {
    const pathname = usePathname();
    const { isDarkMode, toggleDarkMode, isHydrated } = useTheme();

    return (
        <header className={styles.topBar}>
            <p className={styles.section} aria-hidden>
                {sectionLabel(pathname)}
            </p>
            <div className={styles.actions}>
                <AdminNotificationBell />
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
        </header>
    );
};

export default AdminTopBar;
