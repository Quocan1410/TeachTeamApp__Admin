import styles from "./AdminPageSkeleton.module.css";

export type AdminSkeletonVariant =
    | "dashboard"
    | "management"
    | "table"
    | "cards"
    | "list-cards";

type AdminPageSkeletonProps = {
    variant?: AdminSkeletonVariant;
    count?: number;
    showHeader?: boolean;
    showFilters?: boolean;
    className?: string;
    gridClassName?: string;
    /** When true, wraps with page background + top offset (route-level loading). */
    fullPage?: boolean;
};

const HeaderBlock = () => (
    <div className={styles.headerBlock}>
        <div className={`${styles.pulse} ${styles.titleLine}`} />
        <div className={`${styles.pulse} ${styles.subtitleLine}`} />
    </div>
);

export function AdminSkeletonShell({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`${styles.pageContainer} ${className ?? ""}`.trim()}>
            {children}
        </div>
    );
}

export default function AdminPageSkeleton({
    variant = "cards",
    count = 3,
    showHeader = true,
    showFilters = true,
    className,
    gridClassName,
    fullPage = false,
}: AdminPageSkeletonProps) {
    const body = (
        <div
            className={[styles.root, className].filter(Boolean).join(" ")}
            aria-busy="true"
            aria-live="polite"
        >
            {showHeader && <HeaderBlock />}
            {showFilters && (
                <div className={`${styles.pulse} ${styles.filterBar}`} />
            )}

            {(variant === "dashboard" || variant === "management") && (
                <div className={styles.statsGrid}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={`stat-${i}`}
                            className={`${styles.pulse} ${styles.statCard}`}
                        />
                    ))}
                </div>
            )}

            {variant === "dashboard" && (
                <div className={styles.contentGrid}>
                    <div
                        className={`${styles.pulse} ${styles.contentPanelWide}`}
                    />
                    <div
                        className={`${styles.pulse} ${styles.contentPanelSide}`}
                    />
                </div>
            )}

            {variant === "management" && (
                <div className={styles.tablePanel}>
                    <div className={`${styles.pulse} ${styles.tableHeader}`} />
                    {Array.from({ length: count }).map((_, i) => (
                        <div
                            key={`mgmt-row-${i}`}
                            className={`${styles.pulse} ${styles.tableRow}`}
                        />
                    ))}
                </div>
            )}

            {variant === "table" && (
                <div className={styles.tablePanel}>
                    <div className={`${styles.pulse} ${styles.tableHeader}`} />
                    {Array.from({ length: count }).map((_, i) => (
                        <div
                            key={`table-row-${i}`}
                            className={`${styles.pulse} ${styles.tableRow}`}
                        />
                    ))}
                </div>
            )}

            {variant === "cards" && (
                <div
                    className={`${styles.cardsGrid} ${gridClassName ?? ""}`.trim()}
                >
                    {Array.from({ length: count }).map((_, i) => (
                        <div
                            key={`card-${i}`}
                            className={`${styles.pulse} ${styles.card}`}
                        />
                    ))}
                </div>
            )}

            {variant === "list-cards" && (
                <div
                    className={`${styles.listCardsColumn} ${gridClassName ?? ""}`.trim()}
                >
                    {Array.from({ length: count }).map((_, i) => (
                        <div
                            key={`list-card-${i}`}
                            className={`${styles.pulse} ${styles.listCard}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    if (!fullPage) {
        return body;
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.pageContainer}>{body}</div>
        </div>
    );
}
