"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
    GET_ALL_ANNOUNCEMENTS,
    CREATE_ANNOUNCEMENT,
    UPDATE_ANNOUNCEMENT,
    DELETE_ANNOUNCEMENT,
} from "@/lib/graphql/queries";
import { useToast } from "@/shared/hooks/useToast";
import {
    MegaphoneIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
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

/** GraphQL enum names (ALL) vs DB values (all) */
const normalizeAudience = (value: string) => value.toLowerCase();

const audienceLabel = (value: string) => {
    switch (normalizeAudience(value)) {
        case "candidate":
            return "Tutors / candidates";
        case "lecturer":
            return "Lecturers";
        default:
            return "All users";
    }
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
    audience: normalizeAudience(form.audience),
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

    const { data, loading, error, refetch } = useQuery(GET_ALL_ANNOUNCEMENTS, {
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

    const rows: AnnouncementRow[] = data?.getAllAnnouncements ?? [];

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

    const renderFormFields = () => (
        <>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title</label>
                <input
                    className={styles.formInput}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Body</label>
                <textarea
                    className={styles.formTextarea}
                    rows={4}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    required
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Audience</label>
                <select
                    className={styles.formInput}
                    value={form.audience}
                    onChange={(e) =>
                        setForm({ ...form, audience: e.target.value })
                    }
                >
                    <option value="all">All users</option>
                    <option value="candidate">Tutors / candidates</option>
                    <option value="lecturer">Lecturers</option>
                </select>
            </div>
            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Starts at</label>
                    <input
                        type="datetime-local"
                        className={styles.formInput}
                        value={form.startsAt}
                        onChange={(e) =>
                            setForm({ ...form, startsAt: e.target.value })
                        }
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ends at</label>
                    <input
                        type="datetime-local"
                        className={styles.formInput}
                        value={form.endsAt}
                        onChange={(e) =>
                            setForm({ ...form, endsAt: e.target.value })
                        }
                    />
                </div>
            </div>
            <label className={styles.formLabel}>
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                    }
                />{" "}
                Active
            </label>
        </>
    );

    return (
        <div className={styles.announcementsPage}>
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onClose={hideToast}
            />
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <MegaphoneIcon className={styles.pageTitleIcon} />
                        Announcements
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Banners shown on the main app (tutor / lecturer)
                    </p>
                </div>
                <button
                    type="button"
                    className={styles.createButton}
                    onClick={() => {
                        setForm(emptyForm());
                        setShowCreate(true);
                    }}
                >
                    <PlusIcon className={styles.buttonIcon} />
                    New announcement
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading && rows.length === 0 ? (
                    <p className={styles.loadingState}>Loading announcements…</p>
                ) : error ? (
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
                        <p>No announcements yet</p>
                        <p>Create one to show a banner on the main app.</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Audience</th>
                                <th>Active</th>
                                <th>Window</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.title}</td>
                                    <td>{audienceLabel(row.audience)}</td>
                                    <td>{row.isActive ? "Yes" : "No"}</td>
                                    <td>
                                        {row.startsAt
                                            ? new Date(
                                                  row.startsAt
                                              ).toLocaleString()
                                            : "—"}{" "}
                                        →{" "}
                                        {row.endsAt
                                            ? new Date(
                                                  row.endsAt
                                              ).toLocaleString()
                                            : "—"}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.actionButton}
                                            onClick={() => openEdit(row)}
                                            aria-label={`Edit ${row.title}`}
                                        >
                                            <PencilIcon width={18} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        "Delete this announcement?"
                                                    )
                                                ) {
                                                    deleteAnnouncement({
                                                        variables: {
                                                            id: Number(row.id),
                                                        },
                                                    });
                                                }
                                            }}
                                            aria-label={`Delete ${row.title}`}
                                        >
                                            <TrashIcon width={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showCreate && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Create announcement</h2>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createAnnouncement({
                                    variables: { input: buildInput(form) },
                                });
                            }}
                        >
                            {renderFormFields()}
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.modalButtonSecondary}
                                    onClick={() => setShowCreate(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalButtonPrimary}
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEdit && selected && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Edit announcement</h2>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                updateAnnouncement({
                                    variables: {
                                        id: Number(selected.id),
                                        input: buildInput(form),
                                    },
                                });
                            }}
                        >
                            {renderFormFields()}
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.modalButtonSecondary}
                                    onClick={() => setShowEdit(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.modalButtonPrimary}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
