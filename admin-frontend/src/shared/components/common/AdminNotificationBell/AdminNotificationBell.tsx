"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { BellIcon } from "@heroicons/react/24/outline";
import {
    GET_MY_NOTIFICATIONS,
    MARK_NOTIFICATION_AS_READ,
    MARK_ALL_NOTIFICATIONS_AS_READ,
    DELETE_NOTIFICATION,
} from "@/lib/graphql/queries";
import styles from "./AdminNotificationBell.module.css";

const AdminNotificationBell: React.FC = () => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data, loading, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
        variables: { limit: 50 },
        pollInterval: 30000,
        fetchPolicy: "network-only",
    });

    const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
    const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
    const [deleteNotification] = useMutation(DELETE_NOTIFICATION);

    const notifications = data?.getMyNotifications?.notifications ?? [];
    const unreadCount = data?.getMyNotifications?.unreadCount ?? 0;

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
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor(
            (now.getTime() - date.getTime()) / 1000
        );

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)}m ago`;
        }
        if (diffInSeconds < 86400) {
            return `${Math.floor(diffInSeconds / 3600)}h ago`;
        }
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const handleMarkAsRead = async (id: number, link?: string | null) => {
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
                className={styles.bellButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications (${unreadCount} unread)`}
                type="button"
            >
                <BellIcon className={styles.bellIcon} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.notificationDropdown}>
                    <div className={styles.dropdownHeader}>
                        <h3 className={styles.dropdownTitle}>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllButton}
                                onClick={handleMarkAllAsRead}
                                type="button"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationList}>
                        {loading && notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>
                                    Loading notifications...
                                </p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>
                                    No notifications yet
                                </p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map(
                                (notification: {
                                    id: number;
                                    title: string;
                                    message: string;
                                    read: boolean;
                                    createdAt: string;
                                    link?: string | null;
                                }) => (
                                    <div
                                        key={notification.id}
                                        className={`${styles.notificationItem} ${
                                            !notification.read
                                                ? styles.unread
                                                : ""
                                        }`}
                                        onClick={() =>
                                            handleMarkAsRead(
                                                notification.id,
                                                notification.link
                                            )
                                        }
                                    >
                                        <div
                                            className={styles.notificationContent}
                                        >
                                            <div
                                                className={
                                                    styles.notificationTitle
                                                }
                                            >
                                                {notification.title}
                                            </div>
                                            <div
                                                className={
                                                    styles.notificationMessage
                                                }
                                            >
                                                {notification.message}
                                            </div>
                                            <div
                                                className={
                                                    styles.notificationTime
                                                }
                                            >
                                                {formatTimeAgo(
                                                    notification.createdAt
                                                )}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div
                                                className={
                                                    styles.unreadIndicator
                                                }
                                            />
                                        )}
                                        <button
                                            className={styles.removeButton}
                                            onClick={(e) =>
                                                handleDelete(
                                                    notification.id,
                                                    e
                                                )
                                            }
                                            aria-label="Remove notification"
                                            type="button"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotificationBell;
