export const hasCustomAvatar = (avatarUrl?: string | null): boolean => {
    return !!avatarUrl && avatarUrl.startsWith("/uploads/avatars/");
};

const stripHonorific = (name: string): string =>
    name.trim().replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+/i, "").trim();

export const getUserInitials = (
    firstName?: string,
    lastName?: string,
    email?: string,
    fullName?: string
): string => {
    const first = firstName?.trim() ?? "";
    const last = lastName?.trim() ?? "";

    if (first && last) {
        return `${first[0]}${last[0]}`.toUpperCase();
    }

    if (fullName) {
        const parts = stripHonorific(fullName).split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
    }

    if (email) {
        return email.slice(0, 2).toUpperCase();
    }

    return "?";
};
