"use client";

import {
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import styles from "./SortableTableHeader.module.css";

export type SortDirection = "asc" | "desc";

interface SortableTableHeaderProps {
    label: string;
    sortKey: string;
    activeSortBy: string;
    activeSortDir: SortDirection;
    onSort: (sortKey: string) => void;
    className?: string;
    center?: boolean;
}

export function toggleSort(
    sortKey: string,
    activeSortBy: string,
    activeSortDir: SortDirection
): { sortBy: string; sortDir: SortDirection } {
    if (activeSortBy !== sortKey) {
        return { sortBy: sortKey, sortDir: "desc" };
    }
    return {
        sortBy: sortKey,
        sortDir: activeSortDir === "desc" ? "asc" : "desc",
    };
}

const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
    label,
    sortKey,
    activeSortBy,
    activeSortDir,
    onSort,
    className = "",
    center = false,
}) => {
    const isActive = activeSortBy === sortKey;

    return (
        <th
            className={`${styles.sortableHeader} ${center ? styles.center : ""} ${className}`}
        >
            <button
                type="button"
                className={`${styles.sortButton} ${isActive ? styles.active : ""}`}
                onClick={() => onSort(sortKey)}
                aria-sort={
                    isActive
                        ? activeSortDir === "asc"
                            ? "ascending"
                            : "descending"
                        : "none"
                }
            >
                <span>{label}</span>
                {isActive ? (
                    activeSortDir === "asc" ? (
                        <ChevronUpIcon className={styles.sortIcon} />
                    ) : (
                        <ChevronDownIcon className={styles.sortIcon} />
                    )
                ) : (
                    <ChevronUpDownIcon className={styles.sortIconMuted} />
                )}
            </button>
        </th>
    );
};

export default SortableTableHeader;
