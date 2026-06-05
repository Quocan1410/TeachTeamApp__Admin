"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
    GET_USERS,
    GET_USER_STATS,
    BLOCK_USER,
    UNBLOCK_USER,
    DELETE_USER,
} from "@/lib/graphql/queries";
import {
    UsersIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import styles from "./users-management.module.css";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { getUserDisplayName } from "@/shared/utils/personDisplayName";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";

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
    const [selectedFilter, setSelectedFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 320);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
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
    }, [selectedFilter, debouncedSearchTerm]);

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
            },
        },
        fetchPolicy: "cache-and-network",
    });
    const { data: statsData, refetch: refetchStats } = useQuery(GET_USER_STATS);

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

    const userPage = usersData?.getUsers;
    const filteredUsers = userPage?.items || [];
    const stats = statsData?.getUserStats;

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
                if (!result.data?.unblockUser.success) {
                    // Silent error handling for production
                }
            } else {
                const result = await blockUser({
                    variables: { id: parseInt(user.id.toString()) },
                });
                if (!result.data?.blockUser.success) {
                    // Silent error handling for production
                }
            }
        } catch (error) {
            // Silent error handling for production
        }
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
            await deleteUser({
                variables: { id: parseInt(userToDelete.id.toString()) },
            });
        } catch (error) {
            // Silent error handling for production
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

    return (
        <div className={styles.usersManagement}>
            <div className={styles.managementContainer}>
                {/* Header */}
                <div className={styles.headerSection}>
                    <h1 className={styles.title}>User Management</h1>
                    <p className={styles.subtitle}>
                        Manage all users in the system
                    </p>
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
                        <table className={styles.table}>
                            <thead className={styles.tableHeaderRow}>
                                <tr>
                                    <th className={styles.tableHeaderCell}>
                                        User
                                    </th>
                                    <th className={styles.tableHeaderCell}>
                                        Type
                                    </th>
                                    <th className={styles.tableHeaderCell}>
                                        Status
                                    </th>
                                    <th className={styles.tableHeaderCell}>
                                        Created
                                    </th>
                                    <th className={styles.tableHeaderCell}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersLoading
                                    ? [...Array(5)].map((_, i) => (
                                          <tr
                                              key={i}
                                              className={styles.tableRow}
                                          >
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.loadingContainer
                                                      }
                                                  >
                                                      <div
                                                          className={
                                                              styles.loadingSkeleton
                                                          }
                                                      ></div>
                                                  </div>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.loadingSkeleton
                                                      }
                                                  ></div>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.loadingSkeleton
                                                      }
                                                  ></div>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.loadingSkeleton
                                                      }
                                                  ></div>
                                              </td>
                                              <td className={styles.tableCell}>
                                                  <div
                                                      className={
                                                          styles.loadingSkeleton
                                                      }
                                                  ></div>
                                              </td>
                                          </tr>
                                      ))
                                    : filteredUsers.map((user: User) => (
                                          <tr
                                              key={user.id}
                                              className={styles.tableRow}
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
                                                      {/* Block/Unblock Button — not for admin accounts */}
                                                      {!isAdminAccount(
                                                          user.userType
                                                      ) && (
                                                      <button
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
                                                                  : styles.actionButtonDanger
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
                                      ))}
                            </tbody>
                        </table>
                        {userPage && (
                            <PaginationBar
                                page={userPage.page}
                                pageSize={userPage.pageSize}
                                totalCount={userPage.totalCount}
                                totalPages={userPage.totalPages}
                                loading={usersLoading}
                                onPageChange={setPage}
                            />
                        )}
                    </div>

                    {filteredUsers.length === 0 && !usersLoading && (
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
                                    onClick={() => setShowDeleteModal(false)}
                                    className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                >
                                    Cancel
                                </button>
                                <button
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
        </div>
    );
}
