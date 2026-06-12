"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import {
    GET_MY_NOTIFICATIONS,
    MARK_NOTIFICATION_AS_READ,
    MARK_ALL_NOTIFICATIONS_AS_READ,
    DELETE_NOTIFICATION,
    ADMIN_NOTIFICATION_UPDATES_SUBSCRIPTION,
} from "@/lib/graphql/queries";
import CloseIcon from "@/shared/components/common/icons/CloseIcon";
import { parseApiDateTime } from "@/shared/utils/parseApiDateTime";
import styles from "./AdminNotificationBell.module.css";

type AdminNotification = {
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string | null;
};

const getNotificationActor = (type: string) => {
    switch (type) {
        case "user_registered":
        case "application_submitted":
        case "application_comment":
        case "application_response":
        case "application_withdrawn":
            return "Candidate";
        case "candidate_blocked":
        case "candidate_unblocked":
        case "course_assigned":
            return "Lecturer";
        case "application_selected":
        case "application_rejected":
        case "account_blocked":
        case "account_unblocked":
            return "Admin";
        default:
            return null;
    }
};

const getNotificationIcon = (type: string) => {
    const toneClass = (() => {
        switch (type) {
            case "candidate_blocked":
            case "account_blocked":
            case "application_rejected":
                return styles.iconToneDanger;
            case "candidate_unblocked":
            case "account_unblocked":
            case "application_selected":
                return styles.iconToneSuccess;
            case "user_registered":
                return styles.iconToneWarning;
            default:
                return styles.iconToneInfo;
        }
    })();

    const iconSvg = (() => {
        switch (type) {
            case "candidate_blocked":
            case "account_blocked":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case "candidate_unblocked":
            case "account_unblocked":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case "application_selected":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                );
            case "application_rejected":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                );
            case "user_registered":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                    </svg>
                );
            case "application_comment":
            case "application_submitted":
            case "application_response":
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                    </svg>
                );
            default:
                return (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                    </svg>
                );
        }
    })();

    return (
        <div className={`${styles.notificationIcon} ${toneClass}`}>{iconSvg}</div>
    );
};

const AdminNotificationBell: React.FC = () => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data, loading, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
        variables: { limit: 50 },
        pollInterval: 15000,
        fetchPolicy: "network-only",
    });

    useSubscription(ADMIN_NOTIFICATION_UPDATES_SUBSCRIPTION, {
        onSubscriptionData: () => {
            void refetch();
        },
    });

    const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
    const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
    const [deleteNotification] = useMutation(DELETE_NOTIFICATION);

    const notifications: AdminNotification[] =
        data?.getMyNotifications?.notifications ?? [];
    const unreadCount = data?.getMyNotifications?.unreadCount ?? 0;
    const visible = notifications.slice(0, 10);

    useEffect(() => {
        if (isOpen) {
            void refetch();
        }
    }, [isOpen, refetch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatTimeAgo = (dateString: string) => {
        const date = parseApiDateTime(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor(
            (now.getTime() - date.getTime()) / 1000
        );

        if (diffInSeconds < 60) return "now";
        if (diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)}m`;
        }
        if (diffInSeconds < 86400) {
            return `${Math.floor(diffInSeconds / 3600)}h`;
        }
        return `${Math.floor(diffInSeconds / 86400)}d`;
    };

    const handleNotificationClick = async (
        id: number,
        link?: string | null
    ) => {
        await markAsRead({ variables: { id } });
        await refetch();
        if (link) {
            router.push(link);
            setIsOpen(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        await refetch();
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteNotification({ variables: { id } });
        await refetch();
    };

    return (
        <div className={styles.notificationContainer} ref={dropdownRef}>
            <button
                type="button"
                className={`${styles.bellButton} ${isOpen ? styles.bellButtonActive : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications (${unreadCount} unread)`}
                aria-expanded={isOpen}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.bellIcon}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span
                        className={`${styles.badge} ${
                            unreadCount > 99
                                ? styles.badgeCompact
                                : unreadCount > 9
                                  ? styles.badgeWide
                                  : ""
                        }`}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className={styles.notificationDropdown}
                    role="dialog"
                    aria-label="Notifications"
                >
                    <div className={styles.dropdownHeader}>
                        <div className={styles.dropdownTitleRow}>
                            <h3 className={styles.dropdownTitle}>Activity</h3>
                            {unreadCount > 0 && (
                                <span className={styles.unreadPill}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className={styles.markAllButton}
                                onClick={handleMarkAllAsRead}
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationList}>
                        {loading && notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>Loading…</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIconWrap}>
                                    <svg
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={1.75}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                        />
                                    </svg>
                                </div>
                                <p className={styles.emptyTitle}>All caught up</p>
                                <p className={styles.emptyText}>
                                    Signups, applications, and system alerts will
                                    show up here.
                                </p>
                            </div>
                        ) : (
                            <div className={styles.notificationListInner}>
                                {visible.map((notification) => {
                                    const actor = getNotificationActor(
                                        notification.type
                                    );
                                    return (
                                        <div
                                            key={notification.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`${styles.notificationItem} ${
                                                !notification.read
                                                    ? styles.unread
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                handleNotificationClick(
                                                    notification.id,
                                                    notification.link
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    handleNotificationClick(
                                                        notification.id,
                                                        notification.link
                                                    );
                                                }
                                            }}
                                        >
                                            <div
                                                className={
                                                    styles.notificationIconWrap
                                                }
                                            >
                                                {getNotificationIcon(
                                                    notification.type
                                                )}
                                                {!notification.read && (
                                                    <span
                                                        className={
                                                            styles.unreadDot
                                                        }
                                                        aria-hidden
                                                    />
                                                )}
                                            </div>
                                            <div
                                                className={
                                                    styles.notificationContent
                                                }
                                            >
                                                {actor && (
                                                    <span
                                                        className={
                                                            styles.actorBadge
                                                        }
                                                    >
                                                        {actor}
                                                    </span>
                                                )}
                                                <span
                                                    className={
                                                        styles.notificationTitle
                                                    }
                                                >
                                                    {notification.title}
                                                </span>
                                                <p
                                                    className={
                                                        styles.notificationMessage
                                                    }
                                                >
                                                    {notification.message}
                                                </p>
                                            </div>
                                            <div className={styles.itemAside}>
                                                <button
                                                    type="button"
                                                    className={`${styles.removeButton} iconCloseHit iconCloseCircle`}
                                                    onClick={(e) =>
                                                        handleDelete(
                                                            notification.id,
                                                            e
                                                        )
                                                    }
                                                    aria-label="Remove notification"
                                                >
                                                    <CloseIcon size={7} />
                                                </button>
                                                <span
                                                    className={
                                                        styles.notificationTime
                                                    }
                                                >
                                                    {formatTimeAgo(
                                                        notification.createdAt
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {notifications.length > 10 && (
                        <div className={styles.dropdownFooter}>
                            <span className={styles.moreText}>
                                +{notifications.length - 10} more in your inbox
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminNotificationBell;
