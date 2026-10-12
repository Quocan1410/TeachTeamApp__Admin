export type AdminNotificationNavTarget = {
    href: string;
    actionLabel: string;
    hint: string;
};

/**
 * Admin can only open in-app dashboard destinations.
 * External-role links (/lecturer, /tutor, /signin) are not actionable here.
 */
export function resolveAdminNotificationNav(input: {
    type: string;
    link?: string | null;
}): AdminNotificationNavTarget | null {
    const link = input.link?.trim() || "";
    if (!link.startsWith("/dashboard")) {
        return null;
    }

    let actionLabel = "Open page";
    let hint = "Opens the related admin page.";

    if (link.startsWith("/dashboard/users")) {
        actionLabel = "Open users";
        hint = "Opens user management for this update.";
    } else if (link.startsWith("/dashboard/courses")) {
        actionLabel = "Open courses";
        hint = "Opens course management for this update.";
    } else if (link.startsWith("/dashboard/reports")) {
        actionLabel = "Open selections";
        hint = "Opens selection reports for this update.";
    } else if (link === "/dashboard" || link.startsWith("/dashboard?")) {
        actionLabel = "Open dashboard";
        hint = "Opens the admin overview.";
    }

    if (input.type === "user_registered") {
        actionLabel = "Open users";
        hint = "Opens user management to review the new signup.";
    }

    return { href: link, actionLabel, hint };
}
