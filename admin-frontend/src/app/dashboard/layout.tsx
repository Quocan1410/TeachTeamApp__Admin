"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client";
import AdminHeader from "../../shared/components/common/Header/AdminHeader";
import { ADMIN_LOGOUT } from "@/lib/graphql/queries";
import {
    ADMIN_TOKEN_KEY,
    clearAdminSession,
    getStoredAdminUser,
    isAdminUser,
    type StoredAdminUser,
} from "@/lib/adminSession";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<StoredAdminUser | null>(null);
    const router = useRouter();
    const [adminLogout] = useMutation(ADMIN_LOGOUT);

    useEffect(() => {
        const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
        const stored = getStoredAdminUser();

        if (!token || !stored || !isAdminUser(stored)) {
            clearAdminSession();
            router.replace("/");
            return;
        }

        setUser(stored);
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

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent"></div>
                    <p className="text-gray-600 font-medium">
                        Loading admin panel...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader user={user} onLogout={handleLogout} />
            <main className="pt-20">{children}</main>
        </div>
    );
}
