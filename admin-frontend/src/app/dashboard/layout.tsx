"use client";

import { useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client";
import AdminHeader from "../../shared/components/common/Header/AdminHeader";
import { ADMIN_LOGOUT } from "@/lib/graphql/queries";
import { clearAdminSession, type StoredAdminUser } from "@/lib/adminSession";
import { readAdminSessionUser } from "@/lib/readAdminSessionUser";
import layoutStyles from "./dashboard-layout.module.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<StoredAdminUser | null>(null);
    const [ready, setReady] = useState(false);
    const router = useRouter();
    const [adminLogout] = useMutation(ADMIN_LOGOUT);

    useLayoutEffect(() => {
        const stored = readAdminSessionUser();
        if (!stored) {
            clearAdminSession();
            router.replace("/");
        } else {
            setUser(stored);
        }
        setReady(true);
    }, [router]);

    const handleLogout = async () => {
        try {
            await adminLogout();
        } catch {
            /* session may already be invalid */
        }
        clearAdminSession();
        router.replace("/");
    };

    if (!ready) {
        return (
            <div className={layoutStyles.shell} aria-busy="true">
                <main className={layoutStyles.bootstrapMain} />
            </div>
        );
    }

    if (!user) {
        return <div className={layoutStyles.shell} aria-busy="true" />;
    }

    return (
        <div className={layoutStyles.shell}>
            <AdminHeader user={user} onLogout={handleLogout} />
            <main className={layoutStyles.main}>{children}</main>
        </div>
    );
}
