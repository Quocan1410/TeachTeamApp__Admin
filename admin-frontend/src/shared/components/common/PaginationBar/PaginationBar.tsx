import styles from "./PaginationBar.module.css";

type PaginationBarProps = {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
};

export default function PaginationBar({
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange,
    loading = false,
}: PaginationBarProps) {
    if (totalCount === 0) {
        return null;
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);

    return (
        <div className={styles.paginationBar}>
            <p className={styles.summary}>
                Showing {start}–{end} of {totalCount}
            </p>
            <div className={styles.controls}>
                <button
                    type="button"
                    className={styles.button}
                    disabled={loading || page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </button>
                <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                </span>
                <button
                    type="button"
                    className={styles.button}
                    disabled={loading || page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
