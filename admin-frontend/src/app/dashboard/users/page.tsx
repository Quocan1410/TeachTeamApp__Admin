"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
    GET_USERS,
    GET_USER_STATS,
    BLOCK_USER,
    UNBLOCK_USER,
    DELETE_USER,
    UPDATE_USER,
    CREATE_USER,
} from "@/lib/graphql/queries";
import {
    UsersIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    TrashIcon,
    PencilIcon,
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import AdminPageSkeleton from "@/shared/components/common/AdminPageSkeleton/AdminPageSkeleton";
import styles from "./users-management.module.css";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { getUserDisplayName } from "@/shared/utils/personDisplayName";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";
import Toast from "@/shared/components/common/Toast/Toast";
import { useToast } from "@/shared/hooks/useToast";
import SortableTableHeader, {
    toggleSort,
    type SortDirection,
} from "@/shared/components/common/SortableTableHeader/SortableTableHeader";

const PAGE_SIZE = 20;

interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    isBlocked: boolean;
    createdAt: string;
    fullName: string;
}

export default function UsersManagement() {
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [selectedFilter, setSelectedFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortDir, setSortDir] = useState<SortDirection>("desc");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 320);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        userType: "candidate",
    });
    const [createForm, setCreateForm] = useState({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        userType: "candidate",
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Get current user from localStorage
    useEffect(() => {
        const userData = sessionStorage.getItem("admin-user");
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);

    useEffect(() => {
        setPage(1);
    }, [selectedFilter, debouncedSearchTerm, sortBy, sortDir]);

    const handleSort = (key: string) => {
        const next = toggleSort(key, sortBy, sortDir);
        setSortBy(next.sortBy);
        setSortDir(next.sortDir);
    };

    const {
        data: usersData,
        loading: usersLoading,
        refetch: refetchUsers,
    } = useQuery(GET_USERS, {
        variables: {
            input: {
                page,
                pageSize: PAGE_SIZE,
                search: debouncedSearchTerm || null,
                filter: selectedFilter,
                sortBy,
                sortDir,
            },
        },
        fetchPolicy: "cache-and-network",
    });
    const { data: statsData, loading: statsLoading, refetch: refetchStats } =
        useQuery(GET_USER_STATS);

    const [blockUser] = useMutation(BLOCK_USER, {
        onCompleted: () => {
            refetchUsers();
            refetchStats();
        },
    });

    const [unblockUser] = useMutation(UNBLOCK_USER, {
        onCompleted: () => {
            refetchUsers();
            refetchStats();
        },
    });

    const [deleteUser] = useMutation(DELETE_USER, {
        onCompleted: () => {
            refetchUsers();
            refetchStats();
            setShowDeleteModal(false);
            setUserToDelete(null);
        },
    });

    const [updateUser] = useMutation(UPDATE_USER, {
        onCompleted: (data) => {
            if (data.updateUser.success) {
                showSuccess(data.updateUser.message || "User updated");
                refetchUsers();
                refetchStats();
                setShowEditModal(false);
                setUserToEdit(null);
            } else {
                showError(data.updateUser.message || "Update failed");
            }
        },
        onError: () => showError("Update failed"),
    });

    const [createUser] = useMutation(CREATE_USER, {
        onCompleted: (data) => {
            if (data.createUser.success) {
                showSuccess(data.createUser.message || "User created");
                refetchUsers();
                refetchStats();
                setShowCreateModal(false);
                setCreateForm({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    userType: "candidate",
                });
                setCreateErrors({});
            } else {
                showError(data.createUser.message || "Create failed");
            }
        },
        onError: () => showError("Create failed"),
    });

    const userPage = usersData?.getUsers;
    const filteredUsers = userPage?.items || [];
    const stats = statsData?.getUserStats;
    const isInitialLoad =
        (usersLoading && !usersData) || (statsLoading && !statsData);

    const isAdminAccount = (userType: string) =>
        userType?.toLowerCase() === "admin";

    const handleBlockToggle = async (user: User) => {
        if (isAdminAccount(user.userType)) {
            return;
        }
        // Prevent admin from blocking themselves
        if (currentUser && user.id === currentUser.id) {
            return;
        }

        try {
            if (user.isBlocked) {
                const result = await unblockUser({
                    variables: { id: parseInt(user.id.toString()) },
                });
                if (result.data?.unblockUser.success) {
                    showSuccess(
                        result.data.unblockUser.message ||
                            "User unblocked successfully"
                    );
                } else {
                    showError(
                        result.data?.unblockUser.message ||
                            "Failed to unblock user"
                    );
                }
            } else {
                const result = await blockUser({
                    variables: { id: parseInt(user.id.toString()) },
                });
                if (result.data?.blockUser.success) {
                    showSuccess(
                        result.data.blockUser.message ||
                            "User blocked successfully"
                    );
                } else {
                    showError(
                        result.data?.blockUser.message || "Failed to block user"
                    );
                }
            }
        } catch {
            showError("Failed to update user status");
        }
    };

    const handleEditClick = (user: User) => {
        if (isAdminAccount(user.userType)) return;
        if (currentUser && user.id === currentUser.id) return;
        setUserToEdit(user);
        setEditForm({
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType.toLowerCase(),
        });
        setShowEditModal(true);
    };

    const handleConfirmEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;
        if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
            showError("First and last name are required");
            return;
        }
        await updateUser({
            variables: {
                id: parseInt(userToEdit.id.toString(), 10),
                input: {
                    firstName: editForm.firstName.trim(),
                    lastName: editForm.lastName.trim(),
                    userType: editForm.userType,
                },
            },
        });
    };

    const validateCreateForm = () => {
        const errors: Record<string, string> = {};
        const email = createForm.email.trim().toLowerCase();
        if (!email) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Enter a valid email address";
        } else if (
            createForm.userType === "candidate" &&
            !email.endsWith("@candidate.edu.au")
        ) {
            errors.email = "Candidate email must end with @candidate.edu.au";
        } else if (
            createForm.userType === "lecturer" &&
            !email.endsWith("@lecturer.edu.au")
        ) {
            errors.email = "Lecturer email must end with @lecturer.edu.au";
        }
        if (!createForm.password || createForm.password.length < 8) {
            errors.password = "Password must be at least 8 characters";
        }
        if (!createForm.firstName.trim()) {
            errors.firstName = "First name is required";
        }
        if (!createForm.lastName.trim()) {
            errors.lastName = "Last name is required";
        }
        setCreateErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleConfirmCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateCreateForm()) {
            showError("Please fix the form errors");
            return;
        }
        await createUser({
            variables: {
                input: {
                    email: createForm.email.trim().toLowerCase(),
                    password: createForm.password,
                    firstName: createForm.firstName.trim(),
                    lastName: createForm.lastName.trim(),
                    userType: createForm.userType.toUpperCase(),
                },
            },
        });
    };

    const handleDeleteClick = (user: User) => {
        if (isAdminAccount(user.userType)) {
            return;
        }
        // Prevent admin from deleting themselves
        if (currentUser && user.id === currentUser.id) {
            return;
        }

        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const result = await deleteUser({
                variables: { id: parseInt(userToDelete.id.toString()) },
            });
            if (result.data?.deleteUser.success) {
                showSuccess(
                    result.data.deleteUser.message ||
                        "User deleted successfully"
                );
            } else {
                showError(
                    result.data?.deleteUser.message || "Failed to delete user"
                );
            }
        } catch {
            showError("Failed to delete user");
        }
    };

    const getUserTypeColor = (userType: string) => {
        switch (userType.toLowerCase()) {
            case "candidate":
                return styles.userTypeCandidate;
            case "lecturer":
                return styles.userTypeLecturer;
            case "admin":
                return styles.userTypeAdmin;
            default:
                return styles.userTypeCandidate;
        }
    };

    if (isInitialLoad) {
        return (
            <div className={styles.usersManagement}>
                <div className={styles.managementContainer}>
                    <AdminPageSkeleton
                        variant="management"
                        count={5}
                        showHeader
                        showFilters
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.usersManagement}>
            <div className={styles.managementContainer}>
                {/* Header */}
                <div className={styles.headerSection}>
                    <div>
                        <h1 className={styles.title}>User Management</h1>
                        <p className={styles.subtitle}>
                            Manage all users in the system
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.createUserButton}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <PlusIcon className={styles.actionIcon} />
                        Create user
                    </button>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.blue}`}>
                        <div className={styles.statContent}>
                            <div className={styles.statIconWrapper}>
                                <UsersIcon className={styles.statIcon} />
                            </div>
                            <div className={styles.statInfo}>
                                <h3 className={styles.statValue}>
                                    {stats?.totalUsers || 0}
                                </h3>
                                <p className={styles.statLabel}>Total Users</p>
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.green}`}>
                        <div className={styles.statContent}>
                            <div className={styles.statIconWrapper}>
                                <CheckCircleIcon className={styles.statIcon} />
                            </div>
                            <div className={styles.statInfo}>
                                <h3 className={styles.statValue}>
                                    {stats?.totalCandidates || 0}
                                </h3>
                                <p className={styles.statLabel}>Candidates</p>
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.purple}`}>
                        <div className={styles.statContent}>
                            <div className={styles.statIconWrapper}>
                                <ShieldCheckIcon className={styles.statIcon} />
                            </div>
                            <div className={styles.statInfo}>
                                <h3 className={styles.statValue}>
                                    {stats?.totalLecturers || 0}
                                </h3>
                                <p className={styles.statLabel}>Lecturers</p>
                            </div>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.red}`}>
                        <div className={styles.statContent}>
                            <div className={styles.statIconWrapper}>
                                <ExclamationTriangleIcon
                                    className={styles.statIcon}
                                />
                            </div>
                            <div className={styles.statInfo}>
                                <h3 className={styles.statValue}>
                                    {stats?.blockedUsers || 0}
                                </h3>
                                <p className={styles.statLabel}>Blocked</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className={styles.filtersSection}>
                    <div className={styles.filtersHeader}>
                        <div className={styles.filtersContainer}>
                            <div className={styles.filterTabs}>
                                {[
                                    "all",
                                    "active",
                                    "blocked",
                                    "candidate",
                                    "lecturer",
                                    "admin",
                                ].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() =>
                                            setSelectedFilter(filter)
                                        }
                                        className={`${styles.filterTab} ${
                                            selectedFilter === filter
                                                ? styles.active
                                                : ""
                                        }`}
                                    >
                                        {filter.charAt(0).toUpperCase() +
                                            filter.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.searchContainer}>
                                <MagnifyingGlassIcon
                                    className={styles.searchIcon}
                                />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className={styles.usersTable}>
                        <div className={styles.tableHeader}>
                            <h3 className={styles.tableTitle}>Users</h3>
                        </div>
                        <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.tableHeaderRow}>
                                <tr>
                                    <SortableTableHeader
                                        label="User"
                                        sortKey="email"
                                        activeSortBy={sortBy}
                                        activeSortDir={sortDir}
                                        onSort={handleSort}
                                        className={styles.tableHeaderCell}
                                    />
                                    <SortableTableHeader
                                        label="Type"
                                        sortKey="userType"
                                        activeSortBy={sortBy}
                                        activeSortDir={sortDir}
                                        onSort={handleSort}
                                        className={styles.tableHeaderCell}
                                    />
                                    <SortableTableHeader
                                        label="Status"
                                        sortKey="isBlocked"
                                        activeSortBy={sortBy}
                                        activeSortDir={sortDir}
                                        onSort={handleSort}
                                        className={styles.tableHeaderCell}
                                    />
                                    <SortableTableHeader
                                        label="Created"
                                        sortKey="createdAt"
                                        activeSortBy={sortBy}
                                        activeSortDir={sortDir}
                                        onSort={handleSort}
                                        className={styles.tableHeaderCell}
                                    />
                                    <th className={styles.tableHeaderCell}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user: User, index: number) => {
                                          const rowStripe =
                                              ((page - 1) * PAGE_SIZE + index) %
                                                  2 ===
                                              0
                                                  ? styles.rowEven
                                                  : styles.rowOdd;
                                          return (
                                          <tr
                                              key={user.id}
                                              className={`${styles.tableRow} ${rowStripe}`}
                                          >
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.userInfo
                                                      }
                                                  >
                                                      <div
                                                          className={
                                                              styles.userName
                                                          }
                                                      >
                                                          {getUserDisplayName(user)}
                                                      </div>
                                                      <div
                                                          className={
                                                              styles.userEmail
                                                          }
                                                      >
                                                          {user.email}
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <span
                                                      className={`${
                                                          styles.userTypeBadge
                                                      } ${getUserTypeColor(
                                                          user.userType
                                                      )}`}
                                                  >
                                                      {user.userType}
                                                  </span>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <span
                                                      className={`${
                                                          styles.statusBadge
                                                      } ${
                                                          user.isBlocked
                                                              ? styles.statusBlocked
                                                              : styles.statusActive
                                                      }`}
                                                  >
                                                      {user.isBlocked ? (
                                                          <>
                                                              <XCircleIcon
                                                                  className={
                                                                      styles.statusIcon
                                                                  }
                                                              />
                                                              Blocked
                                                          </>
                                                      ) : (
                                                          <>
                                                              <CheckCircleIcon
                                                                  className={
                                                                      styles.statusIcon
                                                                  }
                                                              />
                                                              Active
                                                          </>
                                                      )}
                                                  </span>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  {new Date(
                                                      user.createdAt
                                                  ).toLocaleDateString()}
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.actionsContainer
                                                      }
                                                  >
                                                      {!isAdminAccount(
                                                          user.userType
                                                      ) &&
                                                          !(
                                                              currentUser &&
                                                              user.id ===
                                                                  currentUser.id
                                                          ) && (
                                                              <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                      handleEditClick(
                                                                          user
                                                                      )
                                                                  }
                                                                  className={
                                                                      styles.actionButton
                                                                  }
                                                                  title="Edit user"
                                                              >
                                                                  <PencilIcon
                                                                      className={
                                                                          styles.actionIcon
                                                                      }
                                                                  />
                                                              </button>
                                                          )}

                                                      {/* Block/Unblock Button — not for admin accounts */}
                                                      {!isAdminAccount(
                                                          user.userType
                                                      ) && (
                                                      <button
                                                          type="button"
                                                          onClick={() =>
                                                              handleBlockToggle(
                                                                  user
                                                              )
                                                          }
                                                          disabled={
                                                              !!(
                                                                  currentUser &&
                                                                  user.id ===
                                                                      currentUser.id
                                                              )
                                                          }
                                                          className={`${
                                                              styles.actionButton
                                                          } ${
                                                              user.isBlocked
                                                                  ? styles.actionButtonSuccess
                                                                  : styles.actionButtonWarning
                                                          } ${
                                                              currentUser &&
                                                              user.id ===
                                                                  currentUser.id
                                                                  ? styles.actionButtonDisabled
                                                                  : ""
                                                          }`}
                                                          title={
                                                              currentUser &&
                                                              user.id ===
                                                                  currentUser.id
                                                                  ? "You cannot block yourself"
                                                                  : user.isBlocked
                                                                  ? "Unblock user"
                                                                  : "Block user"
                                                          }
                                                      >
                                                          {user.isBlocked ? (
                                                              <ShieldCheckIcon
                                                                  className={
                                                                      styles.actionIcon
                                                                  }
                                                              />
                                                          ) : (
                                                              <ShieldExclamationIcon
                                                                  className={
                                                                      styles.actionIcon
                                                                  }
                                                              />
                                                          )}
                                                      </button>
                                                      )}

                                                      {/* Delete Button - Hide for current user and other admins */}
                                                      {!isAdminAccount(
                                                          user.userType
                                                      ) &&
                                                          !(
                                                              currentUser &&
                                                              user.id ===
                                                                  currentUser.id
                                                          ) && (
                                                              <button
                                                                  type="button"
                                                                  onClick={() =>
                                                                      handleDeleteClick(
                                                                          user
                                                                      )
                                                                  }
                                                                  className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                                                  title="Delete user"
                                                              >
                                                                  <TrashIcon
                                                                      className={
                                                                          styles.actionIcon
                                                                      }
                                                                  />
                                                              </button>
                                                          )}
                                                  </div>
                                              </td>
                                          </tr>
                                      );
                                      })}
                            </tbody>
                        </table>
                        </div>
                        {userPage && (
                            <div className={styles.usersPagination}>
                                <PaginationBar
                                    page={userPage.page}
                                    pageSize={userPage.pageSize}
                                    totalCount={userPage.totalCount}
                                    totalPages={userPage.totalPages}
                                    loading={isInitialLoad}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </div>

                    {filteredUsers.length === 0 && !isInitialLoad && (
                        <div className={styles.emptyState}>
                            <UsersIcon className={styles.emptyStateIcon} />
                            <h3 className={styles.emptyStateText}>
                                No users found
                            </h3>
                            <p className={styles.emptyStateText}>
                                Try adjusting your search or filter criteria.
                            </p>
                        </div>
                    )}
                </div>

                {/* Edit User Modal */}
                {showEditModal && userToEdit && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <PencilIcon className={styles.modalIcon} />
                                <h3 className={styles.modalTitle}>Edit User</h3>
                            </div>
                            <form onSubmit={handleConfirmEdit}>
                                <div className={styles.modalContent}>
                                    <p className={styles.modalText}>
                                        Update profile for{" "}
                                        <strong>
                                            {getUserDisplayName(userToEdit)}
                                        </strong>
                                        .
                                    </p>
                                    <div className={styles.editFormGrid}>
                                        <label className={styles.editLabel}>
                                            First name
                                            <input
                                                className={styles.editInput}
                                                value={editForm.firstName}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        firstName:
                                                            e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </label>
                                        <label className={styles.editLabel}>
                                            Last name
                                            <input
                                                className={styles.editInput}
                                                value={editForm.lastName}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        lastName:
                                                            e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </label>
                                        <label className={styles.editLabel}>
                                            User type
                                            <select
                                                className={styles.editInput}
                                                value={editForm.userType}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        userType:
                                                            e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="candidate">
                                                    Candidate
                                                </option>
                                                <option value="lecturer">
                                                    Lecturer
                                                </option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setUserToEdit(null);
                                        }}
                                        className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                    >
                                        Save changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showCreateModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <PlusIcon className={styles.modalIcon} />
                                <h3 className={styles.modalTitle}>Create User</h3>
                            </div>
                            <form onSubmit={handleConfirmCreate}>
                                <div className={styles.modalContent}>
                                    <div className={styles.editFormGrid}>
                                        <label className={styles.editLabel}>
                                            Email
                                            <input
                                                className={styles.editInput}
                                                type="email"
                                                value={createForm.email}
                                                onChange={(e) =>
                                                    setCreateForm({
                                                        ...createForm,
                                                        email: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            {createErrors.email && (
                                                <span className={styles.fieldError}>
                                                    {createErrors.email}
                                                </span>
                                            )}
                                        </label>
                                        <label className={styles.editLabel}>
                                            Password
                                            <input
                                                className={styles.editInput}
                                                type="password"
                                                value={createForm.password}
                                                onChange={(e) =>
                                                    setCreateForm({
                                                        ...createForm,
                                                        password: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            {createErrors.password && (
                                                <span className={styles.fieldError}>
                                                    {createErrors.password}
                                                </span>
                                            )}
                                        </label>
                                        <label className={styles.editLabel}>
                                            First name
                                            <input
                                                className={styles.editInput}
                                                value={createForm.firstName}
                                                onChange={(e) =>
                                                    setCreateForm({
                                                        ...createForm,
                                                        firstName: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            {createErrors.firstName && (
                                                <span className={styles.fieldError}>
                                                    {createErrors.firstName}
                                                </span>
                                            )}
                                        </label>
                                        <label className={styles.editLabel}>
                                            Last name
                                            <input
                                                className={styles.editInput}
                                                value={createForm.lastName}
                                                onChange={(e) =>
                                                    setCreateForm({
                                                        ...createForm,
                                                        lastName: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                            {createErrors.lastName && (
                                                <span className={styles.fieldError}>
                                                    {createErrors.lastName}
                                                </span>
                                            )}
                                        </label>
                                        <label className={styles.editLabel}>
                                            User type
                                            <select
                                                className={styles.editInput}
                                                value={createForm.userType}
                                                onChange={(e) =>
                                                    setCreateForm({
                                                        ...createForm,
                                                        userType: e.target.value,
                                                    })
                                                }
                                            >
                                                <option value="candidate">
                                                    Candidate
                                                </option>
                                                <option value="lecturer">
                                                    Lecturer
                                                </option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateErrors({});
                                        }}
                                        className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                    >
                                        Create user
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && userToDelete && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <ExclamationTriangleIcon
                                    className={styles.modalIcon}
                                />
                                <h3 className={styles.modalTitle}>
                                    Delete User
                                </h3>
                            </div>
                            <div className={styles.modalContent}>
                                <p className={styles.modalText}>
                                    Are you sure you want to delete{" "}
                                    <strong>{getUserDisplayName(userToDelete)}</strong>?
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onClose={hideToast}
            />
        </div>
    );
}
