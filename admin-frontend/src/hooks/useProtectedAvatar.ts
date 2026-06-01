"use client";

import { useEffect, useState } from "react";

const getAvatarCacheBuster = (avatarUrl?: string | null): string | undefined => {
    if (!avatarUrl) return undefined;
    const filename = avatarUrl.split("/").pop()?.trim();
    return filename || undefined;
};

const getApiBase = (): string => {
    return (
        process.env.NEXT_PUBLIC_API_ENDPOINT ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000/api"
    );
};

export function useProtectedAvatar(
    hasAvatar: boolean,
    refreshKey?: string | number | null
): string | null {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        let revoked: string | null = null;

        const load = async () => {
            if (!hasAvatar) {
                setObjectUrl(null);
                return;
            }

            const token =
                typeof window !== "undefined"
                    ? sessionStorage.getItem("admin-token")
                    : null;
            if (!token) {
                setObjectUrl(null);
                return;
            }

            try {
                const cacheBuster =
                    typeof refreshKey === "string"
                        ? getAvatarCacheBuster(refreshKey)
                        : undefined;
                const query = cacheBuster
                    ? `?v=${encodeURIComponent(cacheBuster)}`
                    : "";
                const response = await fetch(
                    `${getApiBase()}/auth/avatar/image${query}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    setObjectUrl(null);
                    return;
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                revoked = url;
                setObjectUrl(url);
            } catch {
                setObjectUrl(null);
            }
        };

        load();

        return () => {
            if (revoked) {
                URL.revokeObjectURL(revoked);
            }
        };
    }, [hasAvatar, refreshKey]);

    return objectUrl;
}
