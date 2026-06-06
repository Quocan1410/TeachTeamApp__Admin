import { getUserInitials, hasCustomAvatar } from "@/lib/avatarUtils";
import { resolveUploadUrl } from "@/lib/env";
import styles from "./UserAvatar.module.css";

type UserAvatarProps = {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
    size?: "sm" | "md";
    className?: string;
};

export default function UserAvatar({
    firstName,
    lastName,
    email,
    avatarUrl,
    size = "md",
    className = "",
}: UserAvatarProps) {
    const initials = getUserInitials(firstName, lastName, email);
    const imageSrc = hasCustomAvatar(avatarUrl)
        ? resolveUploadUrl(avatarUrl!)
        : null;

    return (
        <div
            className={`${styles.avatar} ${styles[size]} ${className}`.trim()}
            aria-hidden={!!imageSrc}
        >
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt=""
                    className={styles.avatarImage}
                />
            ) : (
                <span className={styles.avatarInitials}>{initials}</span>
            )}
        </div>
    );
}
