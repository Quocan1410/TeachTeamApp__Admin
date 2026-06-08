"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
    GET_ANNOUNCEMENTS,
    CREATE_ANNOUNCEMENT,
    UPDATE_ANNOUNCEMENT,
    DELETE_ANNOUNCEMENT,
} from "@/lib/graphql/queries";
import { useToast } from "@/shared/hooks/useToast";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";
import SortableTableHeader, {
    toggleSort,
    type SortDirection,
} from "@/shared/components/common/SortableTableHeader/SortableTableHeader";
import {
    MegaphoneIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    UsersIcon,
    UserGroupIcon,
    AcademicCapIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import AdminPageSkeleton from "@/shared/components/common/AdminPageSkeleton/AdminPageSkeleton";
import styles from "./announcements-management.module.css";

const Toast = dynamic(
    () => import("@/shared/components/common/Toast/Toast"),
    { ssr: false }
);

type AnnouncementRow = {
    id: number;
    title: string;
    body: string;
    audience: string;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive: boolean;
};

type FormState = {
    title: string;
    body: string;
    audience: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
};

const emptyForm = (): FormState => ({
    title: "",
    body: "",
    audience: "all",
    startsAt: "",
    endsAt: "",
    isActive: true,
});

const PAGE_SIZE = 5;

const AUDIENCE_FILTERS = [
    { id: "all", label: "All audiences" },
    { id: "candidate", label: "Tutors / candidates" },
    { id: "lecturer", label: "Lecturers" },
] as const;

const STATUS_FILTERS = [
    { id: "all", label: "All status" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
] as const;

const toGraphqlIsActiveFilter = (
    value: string
): boolean | undefined => {
    switch (value) {
        case "active":
            return true;
        case "inactive":
            return false;
        default:
            return undefined;
    }
};

const normalizeAudience = (value: string) => value.toLowerCase();

/** GraphQL enum names (CANDIDATE) vs DB values (candidate) */
const toGraphqlAudience = (
    value: string
): "ALL" | "CANDIDATE" | "LECTURER" => {
    switch (normalizeAudience(value)) {
        case "candidate":
            return "CANDIDATE";
        case "lecturer":
            return "LECTURER";
        default:
            return "ALL";
    }
};

const toGraphqlAudienceFilter = (value: string): "CANDIDATE" | "LECTURER" | null => {
    switch (normalizeAudience(value)) {
        case "candidate":
            return "CANDIDATE";
        case "lecturer":
            return "LECTURER";
        default:
            return null;
    }
};

type AudienceDisplay = {
    label: string;
    chipClass: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const getAudienceDisplay = (value: string): AudienceDisplay => {
    switch (normalizeAudience(value)) {
        case "candidate":
            return {
                label: "Candidates",
                chipClass: styles.audienceChipCandidate,
                Icon: UserGroupIcon,
            };
        case "lecturer":
            return {
                label: "Lecturers",
                chipClass: styles.audienceChipLecturer,
                Icon: AcademicCapIcon,
            };
        default:
            return {
                label: "Everyone",
                chipClass: styles.audienceChipAll,
                Icon: UsersIcon,
            };
    }
};

function AudienceCell({ audience }: { audience: string }) {
    const { label, chipClass, Icon } = getAudienceDisplay(audience);

    return (
        <span className={`${styles.tablePill} ${chipClass}`}>
            <Icon className={styles.tablePillIcon} aria-hidden />
            {label}
        </span>
    );
}

const formatWindow = (startsAt?: string | null, endsAt?: string | null) => {
    const fmt = (iso?: string | null) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    return `${fmt(startsAt)} → ${fmt(endsAt)}`;
};

const toLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const buildInput = (form: FormState) => ({
    title: form.title.trim(),
    body: form.body.trim(),
    audience: toGraphqlAudience(form.audience),
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
});

export default function AnnouncementsManagement() {
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [form, setForm] = useState<FormState>(emptyForm());
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selected, setSelected] = useState<AnnouncementRow | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [audienceFilter, setAudienceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortDir, setSortDir] = useState<SortDirection>("desc");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 320);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, audienceFilter, statusFilter, sortBy, sortDir]);

    const handleSort = (key: string) => {
        const next = toggleSort(key, sortBy, sortDir);
        setSortBy(next.sortBy);
        setSortDir(next.sortDir);
    };

    const { data, loading, error, refetch } = useQuery(GET_ANNOUNCEMENTS, {
        variables: {
            input: {
                page,
                pageSize: PAGE_SIZE,
                search: debouncedSearchTerm || null,
                audience: toGraphqlAudienceFilter(audienceFilter),
                isActive: toGraphqlIsActiveFilter(statusFilter),
                sortBy,
                sortDir,
            },
        },
        fetchPolicy: "cache-and-network",
    });

    const [createAnnouncement] = useMutation(CREATE_ANNOUNCEMENT, {
        onCompleted: (res) => {
            if (res.createAnnouncement.success) {
                showSuccess("Announcement created");
                setShowCreate(false);
                setForm(emptyForm());
                refetch();
            } else {
                showError(res.createAnnouncement.message || "Create failed");
            }
        },
        onError: () => showError("Create failed"),
    });
    const [updateAnnouncement] = useMutation(UPDATE_ANNOUNCEMENT, {
        onCompleted: (res) => {
            if (res.updateAnnouncement.success) {
                showSuccess("Announcement updated");
                setShowEdit(false);
                refetch();
            } else {
                showError(res.updateAnnouncement.message || "Update failed");
            }
        },
        onError: () => showError("Update failed"),
    });
    const [deleteAnnouncement] = useMutation(DELETE_ANNOUNCEMENT, {
        onCompleted: (res) => {
            if (res.deleteAnnouncement.success) {
                showSuccess("Announcement deleted");
                refetch();
            } else {
                showError(res.deleteAnnouncement.message || "Delete failed");
            }
        },
        onError: () => showError("Delete failed"),
    });

    const announcementPage = data?.getAnnouncements;
    const rows: AnnouncementRow[] = announcementPage?.items ?? [];
    const isInitialLoad = loading && !data;

    const openCreate = () => {
        setForm(emptyForm());
        setShowCreate(true);
    };

    const openEdit = (row: AnnouncementRow) => {
        setSelected(row);
        setForm({
            title: row.title,
            body: row.body,
            audience: normalizeAudience(row.audience),
            startsAt: toLocalInput(row.startsAt),
            endsAt: toLocalInput(row.endsAt),
            isActive: row.isActive,
        });
        setShowEdit(true);
    };

    const handleDelete = (row: AnnouncementRow) => {
        if (window.confirm(`Delete "${row.title}"?`)) {
            deleteAnnouncement({ variables: { id: Number(row.id) } });
        }
    };

    const closeModal = () => {
        setShowCreate(false);
        setShowEdit(false);
    };

    const renderFormFields = () => (
        <>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Content</h3>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="ann-title">
                        Title
                    </label>
                    <input
                        id="ann-title"
                        className={styles.formInput}
                        value={form.title}
                        onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                        }
                        placeholder="e.g. Application deadline reminder"
                        required
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="ann-body">
                        Message
                    </label>
                    <textarea
                        id="ann-body"
                        className={styles.formTextarea}
                        rows={4}
                        value={form.body}
                        onChange={(e) =>
                            setForm({ ...form, body: e.target.value })
                        }
                        placeholder="Short banner text shown below the title on the main app"
                        required
                    />
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>
                    Audience &amp; schedule
                </h3>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="ann-audience">
                        Audience
                    </label>
                    <select
                        id="ann-audience"
                        className={styles.formSelect}
                        value={form.audience}
                        onChange={(e) =>
                            setForm({ ...form, audience: e.target.value })
                        }
                    >
                        <option value="all">All users</option>
                        <option value="candidate">Tutors / candidates</option>
                        <option value="lecturer">Lecturers</option>
                    </select>
                    <p className={styles.formHint}>
                        Only the selected user type will see this banner.
                    </p>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="ann-starts">
                            Starts at
                        </label>
                        <input
                            id="ann-starts"
                            type="datetime-local"
                            className={styles.formInput}
                            value={form.startsAt}
                            onChange={(e) =>
                                setForm({ ...form, startsAt: e.target.value })
                            }
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="ann-ends">
                            Ends at
                        </label>
                        <input
                            id="ann-ends"
                            type="datetime-local"
                            className={styles.formInput}
                            value={form.endsAt}
                            onChange={(e) =>
                                setForm({ ...form, endsAt: e.target.value })
                            }
                        />
                    </div>
                </div>
                <p className={styles.formHint}>
                    Leave blank to show immediately with no end date.
                </p>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>Visibility</h3>
                <div className={styles.activeToggleRow}>
                    <div className={styles.activeToggleCopy}>
                        <span className={styles.activeToggleLabel}>
                            Active
                        </span>
                        <span className={styles.activeToggleHint}>
                            Inactive announcements are hidden from the main app.
                        </span>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={form.isActive}
                        className={`${styles.toggleSwitch} ${
                            form.isActive ? styles.toggleSwitchOn : ""
                        }`}
                        onClick={() =>
                            setForm({ ...form, isActive: !form.isActive })
                        }
                    >
                        <span className={styles.toggleKnob} />
                    </button>
                </div>
            </div>
        </>
    );

    const renderAnnouncementModal = (
        mode: "create" | "edit",
        onSubmit: (e: React.FormEvent) => void
    ) => (
        <div
            className={styles.modalOverlay}
            onClick={closeModal}
            role="presentation"
        >
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="announcement-modal-title"
            >
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderText}>
                        <span className={styles.modalBadge}>Banner</span>
                        <h2
                            id="announcement-modal-title"
                            className={styles.modalTitle}
                        >
                            {mode === "create"
                                ? "Create announcement"
                                : "Edit announcement"}
                        </h2>
                        <p className={styles.modalSubtitle}>
                            Shown as a banner on the main app for the selected
                            audience.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={closeModal}
                        aria-label="Close"
                    >
                        <XMarkIcon className={styles.closeIcon} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className={styles.modalForm}>
                    {renderFormFields()}
                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.modalButtonSecondary}
                            onClick={closeModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.modalButtonPrimary}
                        >
                            {mode === "create" ? "Create" : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    if (isInitialLoad) {
        return (
            <div className={styles.announcementsPage}>
                <div className={styles.managementContainer}>
                    <AdminPageSkeleton
                        variant="management"
                        count={6}
                        showHeader
                        showFilters
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.announcementsPage}>
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onClose={hideToast}
            />

            <div className={styles.managementContainer}>
                <div className={styles.headerSection}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.title}>
                            <MegaphoneIcon className={styles.titleIcon} />
                            Announcements
                        </h1>
                        <p className={styles.subtitle}>
                            Banners shown on the main app (tutor / lecturer)
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.createButton}
                        onClick={openCreate}
                    >
                        <PlusIcon className={styles.buttonIcon} />
                        New announcement
                    </button>
                </div>

                <div className={styles.filtersSection}>
                    <div className={styles.filtersHeader}>
                        <div className={styles.filtersContainer}>
                            <div className={styles.filterTabs}>
                                {AUDIENCE_FILTERS.map((filter) => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        className={`${styles.filterTab} ${
                                            audienceFilter === filter.id
                                                ? styles.active
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setAudienceFilter(filter.id)
                                        }
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.filterTabs}>
                                {STATUS_FILTERS.map((filter) => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        className={`${styles.filterTab} ${
                                            statusFilter === filter.id
                                                ? styles.active
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setStatusFilter(filter.id)
                                        }
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.searchContainer}>
                                <MagnifyingGlassIcon
                                    className={styles.searchIcon}
                                />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search title or body..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.listPanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>All announcements</h2>
                        <span className={styles.panelBadge}>
                            {announcementPage?.totalCount ?? 0} total
                        </span>
                    </div>

                    {error ? (
                        <div className={styles.errorState}>
                            <p>Could not load announcements.</p>
                            <p>{error.message}</p>
                            <button
                                type="button"
                                className={styles.createButton}
                                style={{ marginTop: "1rem" }}
                                onClick={() => refetch()}
                            >
                                Retry
                            </button>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MegaphoneIcon className={styles.emptyStateIcon} />
                            <p className={styles.emptyStateTitle}>
                                No announcements yet
                            </p>
                            <p className={styles.emptyStateText}>
                                Create one to show a banner on the main app.
                            </p>
                            <button
                                type="button"
                                className={styles.createButton}
                                onClick={openCreate}
                            >
                                <PlusIcon className={styles.buttonIcon} />
                                Create announcement
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead className={styles.tableHeaderRow}>
                                        <tr>
                                            <SortableTableHeader
                                                label="Announcement"
                                                sortKey="title"
                                                activeSortBy={sortBy}
                                                activeSortDir={sortDir}
                                                onSort={handleSort}
                                                className={styles.tableHeaderCell}
                                            />
                                            <SortableTableHeader
                                                label="Audience"
                                                sortKey="audience"
                                                activeSortBy={sortBy}
                                                activeSortDir={sortDir}
                                                onSort={handleSort}
                                                className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}
                                                center
                                            />
                                            <SortableTableHeader
                                                label="Status"
                                                sortKey="isActive"
                                                activeSortBy={sortBy}
                                                activeSortDir={sortDir}
                                                onSort={handleSort}
                                                className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}
                                                center
                                            />
                                            <SortableTableHeader
                                                label="Schedule"
                                                sortKey="startsAt"
                                                activeSortBy={sortBy}
                                                activeSortDir={sortDir}
                                                onSort={handleSort}
                                                className={styles.tableHeaderCell}
                                            />
                                            <th
                                                className={
                                                    styles.tableHeaderCell
                                                }
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className={styles.tableRow}
                                            >
                                                <td
                                                    className={`${styles.tableCell} ${styles.titleCell}`}
                                                >
                                                    <p
                                                        className={
                                                            styles.announcementTitle
                                                        }
                                                    >
                                                        {row.title}
                                                    </p>
                                                    <p
                                                        className={
                                                            styles.announcementPreview
                                                        }
                                                    >
                                                        {row.body}
                                                    </p>
                                                </td>
                                                <td
                                                    className={`${styles.tableCell} ${styles.tableCellCenter} ${styles.badgeCell}`}
                                                >
                                                    <AudienceCell
                                                        audience={row.audience}
                                                    />
                                                </td>
                                                <td
                                                    className={`${styles.tableCell} ${styles.tableCellCenter} ${styles.badgeCell}`}
                                                >
                                                    <span
                                                        className={`${styles.tablePill} ${
                                                            row.isActive
                                                                ? styles.statusActive
                                                                : styles.statusInactive
                                                        }`}
                                                    >
                                                        {row.isActive ? (
                                                            <CheckCircleIcon
                                                                className={
                                                                    styles.tablePillIcon
                                                                }
                                                            />
                                                        ) : (
                                                            <XCircleIcon
                                                                className={
                                                                    styles.tablePillIcon
                                                                }
                                                            />
                                                        )}
                                                        {row.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`${styles.tableCell} ${styles.windowCell}`}
                                                >
                                                    {formatWindow(
                                                        row.startsAt,
                                                        row.endsAt
                                                    )}
                                                </td>
                                                <td
                                                    className={`${styles.tableCell} ${styles.actionsCell}`}
                                                >
                                                    <div
                                                        className={
                                                            styles.actionsContainer
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.actionButton
                                                            }
                                                            onClick={() =>
                                                                openEdit(row)
                                                            }
                                                            aria-label={`Edit ${row.title}`}
                                                        >
                                                            <PencilIcon
                                                                className={
                                                                    styles.actionIcon
                                                                }
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                                            onClick={() =>
                                                                handleDelete(
                                                                    row
                                                                )
                                                            }
                                                            aria-label={`Delete ${row.title}`}
                                                        >
                                                            <TrashIcon
                                                                className={
                                                                    styles.actionIcon
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {announcementPage &&
                                announcementPage.totalCount > 0 && (
                                    <div className={styles.paginationWrap}>
                                        <PaginationBar
                                            page={announcementPage.page}
                                            pageSize={
                                                announcementPage.pageSize
                                            }
                                            totalCount={
                                                announcementPage.totalCount
                                            }
                                            totalPages={
                                                announcementPage.totalPages
                                            }
                                            loading={loading && !!data}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </div>

            {showCreate &&
                renderAnnouncementModal("create", (e) => {
                    e.preventDefault();
                    createAnnouncement({
                        variables: { input: buildInput(form) },
                    });
                })}

            {showEdit &&
                selected &&
                renderAnnouncementModal("edit", (e) => {
                    e.preventDefault();
                    updateAnnouncement({
                        variables: {
                            id: Number(selected.id),
                            input: buildInput(form),
                        },
                    });
                })}
        </div>
    );
}
