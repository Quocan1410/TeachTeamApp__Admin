"use client";

import { useState, useEffect } from "react";
import {
    useQuery,
    useMutation,
    useLazyQuery,
    useSubscription,
} from "@apollo/client";
import Toast from "@/shared/components/common/Toast/Toast";
import { useToast } from "@/shared/hooks/useToast";
import { formatLecturerDisplayName } from "@/shared/utils/personDisplayName";
import {
    GET_COURSES,
    GET_UNASSIGNED_LECTURERS,
    CREATE_COURSE,
    UPDATE_COURSE,
    DELETE_COURSE,
    ASSIGN_LECTURER_TO_COURSE,
    REMOVE_LECTURER_FROM_COURSE,
    COURSE_UPDATES_SUBSCRIPTION,
} from "@/lib/graphql/queries";
import {
    AcademicCapIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    UserPlusIcon,
    UserMinusIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    BeakerIcon,
    ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import AdminPageSkeleton from "@/shared/components/common/AdminPageSkeleton/AdminPageSkeleton";
import styles from "./courses-management.module.css";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";
import UserAvatar from "@/shared/components/common/UserAvatar/UserAvatar";

const PAGE_SIZE = 6;

interface Course {
    id: number;
    courseCode: string;
    courseName: string;
    semester: string;
    description?: string;
    maxTutors: number;
    maxLabAssistants: number;
    applicationDeadline?: string | null;
    selectedTutors?: number;
    selectedLabAssistants?: number;
    availableTutors?: number;
    availableLabAssistants?: number;
    createdAt: string;
    courseAssignments: Array<{
        id: number;
        lecturer: {
            id: number;
            firstName: string;
            lastName: string;
            email: string;
        } | null;
    }>;
    applications?: Array<{
        id: number;
        status: string;
    }>;
    applicationCount?: number;
}

interface Lecturer {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
}

interface CourseFormData {
    courseCode: string;
    courseName: string;
    semester: string;
    description: string;
    maxTutors: number;
    maxLabAssistants: number;
    applicationDeadline: string;
}

const toDeadlineInputValue = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const buildCourseInput = (form: CourseFormData) => ({
    courseCode: form.courseCode,
    courseName: form.courseName,
    semester: form.semester,
    description: form.description,
    maxTutors: Number(form.maxTutors),
    maxLabAssistants: Number(form.maxLabAssistants),
    applicationDeadline: form.applicationDeadline
        ? new Date(form.applicationDeadline).toISOString()
        : null,
});

export default function CoursesManagement() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 320);
    const [formData, setFormData] = useState<CourseFormData>({
        courseCode: "",
        courseName: "",
        semester: "",
        description: "",
        maxTutors: 0,
        maxLabAssistants: 0,
        applicationDeadline: "",
    });

    // Toast hook
    const { toast, showError, showSuccess, hideToast } = useToast();

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, sortBy, sortDir]);

    const {
        data: coursesData,
        loading: coursesLoading,
        error: coursesError,
        refetch: refetchCourses,
    } = useQuery(GET_COURSES, {
        variables: {
            input: {
                page,
                pageSize: PAGE_SIZE,
                search: debouncedSearchTerm || null,
                sortBy,
                sortDir,
            },
        },
        fetchPolicy: "cache-and-network",
    });

    // Real-time course updates subscription
    const { data: courseUpdateData } = useSubscription(
        COURSE_UPDATES_SUBSCRIPTION,
        {
            onSubscriptionData: ({ subscriptionData }) => {
                if (subscriptionData.data?.courseUpdates) {
                    const { action, message } =
                        subscriptionData.data.courseUpdates;

                    // Refresh course data to get latest state
                    refetchCourses();

                    // Show appropriate toast notification based on action type
                    switch (action) {
                        case "created":
                            showSuccess(
                                message || "New course created successfully"
                            );
                            break;
                        case "updated":
                            showSuccess(
                                message || "Course updated successfully"
                            );
                            break;
                        case "deleted":
                            showSuccess(
                                message || "Course deleted successfully"
                            );
                            break;
                        default:
                            showSuccess(message || "Course updated");
                    }
                }
            },
            onError: (error) => {
                // Don't show error toast for subscription failures to avoid spam
            },
        }
    );
    const [
        getLecturers,
        {
            data: lecturersData,
            error: lecturersError,
            loading: lecturersLoading,
        },
    ] = useLazyQuery(GET_UNASSIGNED_LECTURERS);

    const [createCourse] = useMutation(CREATE_COURSE, {
        onCompleted: (data) => {
            if (data.createCourse.success) {
                refetchCourses();
                setShowCreateModal(false);
                resetForm();
                showSuccess(
                    data.createCourse.message || "Course created successfully"
                );
            } else {
                showError(
                    data.createCourse.message || "Failed to create course"
                );
            }
        },
        onError: (error) => {
            showError(error.message || "Failed to create course");
        },
    });

    const [updateCourse] = useMutation(UPDATE_COURSE, {
        onCompleted: (data) => {
            if (data.updateCourse.success) {
                refetchCourses();
                setShowEditModal(false);
                resetForm();
                showSuccess(
                    data.updateCourse.message || "Course updated successfully"
                );
            } else {
                showError(
                    data.updateCourse.message || "Failed to update course"
                );
            }
        },
        onError: (error) => {
            showError(error.message || "Failed to update course");
        },
    });

    const [deleteCourse] = useMutation(DELETE_COURSE, {
        onCompleted: (data) => {
            if (data.deleteCourse.success) {
                refetchCourses();
                setShowDeleteModal(false);
                setSelectedCourse(null);
                showSuccess(
                    data.deleteCourse.message || "Course deleted successfully"
                );
            } else {
                showError(
                    data.deleteCourse.message || "Failed to delete course"
                );
            }
        },
        onError: (error) => {
            showError(error.message || "Failed to delete course");
        },
    });

    const [assignLecturer] = useMutation(ASSIGN_LECTURER_TO_COURSE, {
        onCompleted: (data) => {
            if (data.assignLecturerToCourse.success) {
                refetchCourses();
                setShowAssignModal(false);
                setSelectedCourse(null);
                showSuccess(
                    data.assignLecturerToCourse.message ||
                        "Lecturer assigned successfully"
                );
            } else {
                showError(
                    data.assignLecturerToCourse.message ||
                        "Failed to assign lecturer"
                );
            }
        },
        onError: (error) => {
            showError(error.message || "Failed to assign lecturer");
        },
    });

    const [removeLecturer] = useMutation(REMOVE_LECTURER_FROM_COURSE, {
        onCompleted: (data) => {
            if (data.removeLecturerFromCourse.success) {
                refetchCourses();
                showSuccess(
                    data.removeLecturerFromCourse.message ||
                        "Lecturer removed successfully"
                );
            } else {
                showError(
                    data.removeLecturerFromCourse.message ||
                        "Failed to remove lecturer"
                );
            }
        },
        onError: (error) => {
            showError(error.message || "Failed to remove lecturer");
        },
    });

    const coursePage = coursesData?.getCourses;
    const courses = coursePage?.items || [];
    const filteredCourses = courses;
    const lecturers = lecturersData?.getUnassignedLecturers || [];
    const isInitialLoad = coursesLoading && !coursesData;

    const resetForm = () => {
        setFormData({
            courseCode: "",
            courseName: "",
            semester: "",
            description: "",
            maxTutors: 0,
            maxLabAssistants: 0,
            applicationDeadline: "",
        });
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCourse({
                variables: {
                    input: buildCourseInput(formData),
                },
            });
        } catch (error) {
            // Silent error handling for production
        }
    };

    const handleUpdateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;

        try {
            await updateCourse({
                variables: {
                    id: parseInt(selectedCourse.id.toString()),
                    input: buildCourseInput(formData),
                },
            });
        } catch (error) {
            // Silent error handling for production
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        try {
            await deleteCourse({
                variables: { id: parseInt(selectedCourse.id.toString()) },
            });
        } catch (error) {
            // Silent error handling for production
        }
    };

    const handleAssignLecturer = async (lecturerId: number) => {
        if (!selectedCourse) return;

        try {
            await assignLecturer({
                variables: {
                    lecturerId: parseInt(lecturerId.toString()),
                    courseId: parseInt(selectedCourse.id.toString()),
                },
            });
        } catch (error) {
            // Silent error handling for production
        }
    };

    const handleRemoveLecturer = async (lecturerId: number, course: Course) => {
        try {
            await removeLecturer({
                variables: {
                    lecturerId: parseInt(lecturerId.toString()),
                    courseId: parseInt(course.id.toString()),
                },
            });
        } catch (error) {
            // Silent error handling for production
        }
    };

    const openEditModal = (course: Course) => {
        setSelectedCourse(course);
        setFormData({
            courseCode: course.courseCode,
            courseName: course.courseName,
            semester: course.semester,
            description: course.description || "",
            maxTutors: course.maxTutors,
            maxLabAssistants: course.maxLabAssistants,
            applicationDeadline: toDeadlineInputValue(
                course.applicationDeadline
            ),
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (course: Course) => {
        setSelectedCourse(course);
        setShowDeleteModal(true);
    };

    const openAssignModal = (course: Course) => {
        const assignedCount = course.courseAssignments?.length ?? 0;
        if (assignedCount > 0) {
            showError("This course already has an assigned lecturer");
            return;
        }

        setSelectedCourse(course);
        setShowAssignModal(true);
        getLecturers({
            variables: { courseId: parseInt(course.id.toString()) },
        });
    };

    if (isInitialLoad) {
        return (
            <div className={styles.coursesManagement}>
                <div className={styles.managementContainer}>
                    <AdminPageSkeleton
                        variant="cards"
                        count={6}
                        showHeader
                        showFilters
                        gridClassName={styles.coursesGrid}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.coursesManagement}>
            <div className={styles.managementContainer}>
                {/* Header */}
                <div className={styles.headerSection}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.title}>Course Management</h1>
                        <p className={styles.subtitle}>
                            Manage courses and lecturer assignments
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className={styles.createButton}
                    >
                        <PlusIcon className={styles.createButtonIcon} />
                        <span>Add Course</span>
                    </button>
                </div>

                {/* Search */}
                <div className={styles.searchSection}>
                    <div className={styles.searchHeader}>
                        <div className={styles.searchRow}>
                            <div className={styles.searchContainer}>
                                <MagnifyingGlassIcon className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <div className={styles.sortControl}>
                                <label
                                    htmlFor="course-sort"
                                    className={styles.sortLabel}
                                >
                                    Sort by
                                </label>
                                <select
                                    id="course-sort"
                                    className={styles.sortSelect}
                                    value={`${sortBy}:${sortDir}`}
                                    onChange={(e) => {
                                        const [nextSortBy, nextSortDir] =
                                            e.target.value.split(":");
                                        setSortBy(nextSortBy);
                                        setSortDir(
                                            nextSortDir as "asc" | "desc"
                                        );
                                    }}
                                >
                                    <option value="createdAt:desc">
                                        Newest first
                                    </option>
                                    <option value="createdAt:asc">
                                        Oldest first
                                    </option>
                                    <option value="courseCode:asc">
                                        Code A–Z
                                    </option>
                                    <option value="courseCode:desc">
                                        Code Z–A
                                    </option>
                                    <option value="courseName:asc">
                                        Name A–Z
                                    </option>
                                    <option value="applicationDeadline:asc">
                                        Deadline (soonest)
                                    </option>
                                    <option value="applicationDeadline:desc">
                                        Deadline (latest)
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {coursesError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <strong>Error loading courses:</strong>{" "}
                        {coursesError.message}
                    </div>
                )}

                {/* Courses Grid */}
                <div className={styles.coursesGrid}>
                    {filteredCourses.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-gray-500 text-lg">
                                No courses found
                            </p>
                            <p className="text-gray-400">
                                Try adjusting your search criteria.
                            </p>
                        </div>
                    ) : (
                        filteredCourses.map((course: Course) => {
                            const tutorFilled =
                                (course.maxTutors ?? 0) -
                                (course.availableTutors ??
                                    course.maxTutors ??
                                    0);
                            const labFilled =
                                (course.maxLabAssistants ?? 0) -
                                (course.availableLabAssistants ??
                                    course.maxLabAssistants ??
                                    0);
                            const appCount =
                                course.applicationCount ??
                                course.applications?.length ??
                                0;
                            const assignedLecturers =
                                course.courseAssignments ?? [];
                            const assignedCount = assignedLecturers.length;
                            const hasLecturer = assignedCount > 0;
                            const lecturerSlots = 1;
                            const lecturerOverCapacity =
                                assignedCount > lecturerSlots;

                            return (
                            <div key={course.id} className={styles.courseCard}>
                                <div className={styles.courseCardHeader}>
                                    <span className={styles.courseCodeBadge}>
                                        {course.courseCode}
                                    </span>
                                    <div className={styles.courseActions}>
                                        {!hasLecturer && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openAssignModal(course)
                                                }
                                                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                                                title="Assign Lecturer"
                                            >
                                                <UserPlusIcon
                                                    className={
                                                        styles.actionIcon
                                                    }
                                                />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openEditModal(course)
                                            }
                                            className={styles.actionButton}
                                            title="Edit Course"
                                        >
                                            <PencilIcon
                                                className={styles.actionIcon}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openDeleteModal(course)
                                            }
                                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                            title="Delete Course"
                                        >
                                            <TrashIcon
                                                className={styles.actionIcon}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.courseBody}>
                                    <h3 className={styles.courseName}>
                                        {course.courseName}
                                    </h3>
                                    <p className={styles.courseSemester}>
                                        {course.semester}
                                    </p>
                                    {course.description && (
                                        <p className={styles.courseDescription}>
                                            {course.description}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.courseMetrics}>
                                    <div
                                        className={`${styles.metricItem} ${styles.metricPurple}`}
                                    >
                                        <div className={styles.metricIconWrap}>
                                            <UserGroupIcon
                                                className={styles.metricIcon}
                                            />
                                        </div>
                                        <div className={styles.metricInfo}>
                                            <span className={styles.metricValue}>
                                                {tutorFilled}/{course.maxTutors}
                                            </span>
                                            <span className={styles.metricLabel}>
                                                Tutors
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className={`${styles.metricItem} ${styles.metricBlue}`}
                                    >
                                        <div className={styles.metricIconWrap}>
                                            <BeakerIcon
                                                className={styles.metricIcon}
                                            />
                                        </div>
                                        <div className={styles.metricInfo}>
                                            <span className={styles.metricValue}>
                                                {labFilled}/
                                                {course.maxLabAssistants}
                                            </span>
                                            <span className={styles.metricLabel}>
                                                Lab
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className={`${styles.metricItem} ${styles.metricGreen}`}
                                    >
                                        <div className={styles.metricIconWrap}>
                                            <ClipboardDocumentListIcon
                                                className={styles.metricIcon}
                                            />
                                        </div>
                                        <div className={styles.metricInfo}>
                                            <span className={styles.metricValue}>
                                                {appCount}
                                            </span>
                                            <span
                                                className={styles.metricLabel}
                                                title="Applications"
                                            >
                                                Apps
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.lecturerSection}>
                                    <div className={styles.lecturerSectionHeader}>
                                        <span className={styles.lecturerSectionTitle}>
                                            Assigned Lecturer
                                        </span>
                                        {hasLecturer ? (
                                            <span
                                                className={`${
                                                    styles.lecturerStatusBadge
                                                } ${
                                                    lecturerOverCapacity
                                                        ? styles.lecturerStatusOver
                                                        : ""
                                                }`}
                                            >
                                                {assignedCount}/{lecturerSlots}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openAssignModal(course)
                                                }
                                                className={styles.assignButton}
                                            >
                                                Assign
                                            </button>
                                        )}
                                    </div>
                                    {hasLecturer ? (
                                        <div className={styles.assignmentsList}>
                                            {assignedLecturers.map(
                                                (assignment) => (
                                                    <div
                                                        key={assignment.id}
                                                        className={
                                                            styles.assignmentItem
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.lecturerName
                                                            }
                                                        >
                                                            {assignment.lecturer ? (
                                                                formatLecturerDisplayName(
                                                                    {
                                                                        ...assignment.lecturer,
                                                                        userType: "lecturer",
                                                                    }
                                                                )
                                                            ) : (
                                                                <span
                                                                    className={
                                                                        styles.lecturerMissing
                                                                    }
                                                                >
                                                                    Lecturer not
                                                                    found
                                                                </span>
                                                            )}
                                                        </span>
                                                        {assignment.lecturer && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemoveLecturer(
                                                                        assignment
                                                                            .lecturer!
                                                                            .id,
                                                                        course
                                                                    )
                                                                }
                                                                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                                                title="Remove lecturer"
                                                            >
                                                                <UserMinusIcon
                                                                    className={
                                                                        styles.actionIcon
                                                                    }
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <p className={styles.emptyAssignments}>
                                            No lecturer assigned
                                        </p>
                                    )}
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>

                {coursePage && coursePage.totalCount > 0 && (
                    <div className={styles.coursesPagination}>
                        <PaginationBar
                            page={coursePage.page}
                            pageSize={coursePage.pageSize}
                            totalCount={coursePage.totalCount}
                            totalPages={coursePage.totalPages}
                            loading={isInitialLoad}
                            onPageChange={setPage}
                        />
                    </div>
                )}

                {filteredCourses.length === 0 && (
                    <div className={styles.emptyState}>
                        <AcademicCapIcon className={styles.emptyStateIcon} />
                        <h3 className={styles.emptyStateText}>
                            No courses found
                        </h3>
                        <p className={styles.emptyStateText}>
                            {searchTerm
                                ? "Try adjusting your search criteria."
                                : "Get started by creating a new course."}
                        </p>
                    </div>
                )}

                {/* Create Course Modal */}
                {showCreateModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>
                                    Create New Course
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className={styles.closeButton}
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <form
                                onSubmit={handleCreateCourse}
                                className={styles.modalForm}
                            >
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Course Code
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.courseCode}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                courseCode: e.target.value,
                                            })
                                        }
                                        className={styles.formInput}
                                        placeholder="e.g., COSC2758"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Course Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.courseName}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                courseName: e.target.value,
                                            })
                                        }
                                        className={styles.formInput}
                                        placeholder="e.g., Introduction to Computer Science"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Semester
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.semester}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                semester: e.target.value,
                                            })
                                        }
                                        className={styles.formInput}
                                        placeholder="e.g., Semester 2 2025"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                description: e.target.value,
                                            })
                                        }
                                        className={styles.formTextarea}
                                        rows={3}
                                        placeholder="Course description..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Application deadline
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.applicationDeadline}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                applicationDeadline:
                                                    e.target.value,
                                            })
                                        }
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            Max Tutors
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={formData.maxTutors}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    maxTutors: Number(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            className={styles.formInput}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            Max Lab Assistants
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={formData.maxLabAssistants}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    maxLabAssistants: Number(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            className={styles.formInput}
                                        />
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCreateModal(false)
                                        }
                                        className={styles.modalButtonSecondary}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.modalButtonPrimary}
                                    >
                                        Create Course
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Course Modal */}
                {showEditModal && selectedCourse && (
                    <div className={styles.modalOverlay}>
                        <div
                            className={`${styles.modal} ${styles.modalWide}`}
                        >
                            <div className={styles.modalHeader}>
                                <div className={styles.modalHeaderText}>
                                    <span className={styles.modalCourseBadge}>
                                        {selectedCourse.courseCode}
                                    </span>
                                    <h3 className={styles.modalTitle}>
                                        Edit Course
                                    </h3>
                                    <p className={styles.modalSubtitle}>
                                        {selectedCourse.courseName}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className={styles.closeButton}
                                    aria-label="Close edit course"
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateCourse}>
                                <div className={styles.modalForm}>
                                    <div className={styles.formSection}>
                                        <h4
                                            className={styles.formSectionTitle}
                                        >
                                            Basic information
                                        </h4>
                                        <div className={styles.formRow3}>
                                            <div className={styles.formGroup}>
                                                <label
                                                    className={styles.formLabel}
                                                >
                                                    Course Code
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.courseCode}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            courseCode:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className={styles.formInput}
                                                    placeholder="COSC2758"
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label
                                                    className={styles.formLabel}
                                                >
                                                    Course Name
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.courseName}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            courseName:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className={styles.formInput}
                                                    placeholder="Course name"
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label
                                                    className={styles.formLabel}
                                                >
                                                    Semester
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.semester}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            semester:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className={styles.formInput}
                                                    placeholder="Sem 2 2026"
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>
                                                Description
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                                className={styles.formTextarea}
                                                rows={3}
                                                placeholder="Brief course summary..."
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.formSection}>
                                        <h4
                                            className={styles.formSectionTitle}
                                        >
                                            Capacity & deadline
                                        </h4>
                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label
                                                    className={styles.formLabel}
                                                >
                                                    Max Tutors
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    required
                                                    value={formData.maxTutors}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            maxTutors: Number(
                                                                e.target.value
                                                            ),
                                                        })
                                                    }
                                                    className={styles.formInput}
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label
                                                    className={styles.formLabel}
                                                >
                                                    Max Lab Assistants
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    required
                                                    value={
                                                        formData.maxLabAssistants
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            maxLabAssistants:
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                ),
                                                        })
                                                    }
                                                    className={styles.formInput}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>
                                                Application deadline
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={
                                                    formData.applicationDeadline
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        applicationDeadline:
                                                            e.target.value,
                                                    })
                                                }
                                                className={styles.formInput}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowEditModal(false)
                                        }
                                        className={styles.modalButtonSecondary}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.modalButtonPrimary}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && selectedCourse && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <ExclamationTriangleIcon
                                    className={styles.modalDangerIcon}
                                />
                                <div className={styles.modalHeaderText}>
                                    <h3 className={styles.modalTitle}>
                                        Delete Course
                                    </h3>
                                    <p className={styles.modalSubtitle}>
                                        {selectedCourse.courseCode}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className={styles.closeButton}
                                    aria-label="Close delete course"
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <div className={styles.deleteModalBody}>
                                <p className={styles.deleteModalText}>
                                    Are you sure you want to delete{" "}
                                    <strong>
                                        {selectedCourse.courseCode} —{" "}
                                        {selectedCourse.courseName}
                                    </strong>
                                    ? This action cannot be undone.
                                </p>
                                <div className={styles.deleteNote}>
                                    <p className={styles.deleteNoteText}>
                                        <strong>Note:</strong> Courses with
                                        active applications (pending or
                                        selected) cannot be deleted. Handle all
                                        active applications first, then try
                                        again.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className={styles.modalButtonSecondary}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteCourse}
                                    className={styles.modalButtonDanger}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assign Lecturer Modal */}
                {showAssignModal && selectedCourse && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>
                                    Assign Lecturer to{" "}
                                    {selectedCourse.courseCode}
                                </h3>
                                <button
                                    onClick={() => setShowAssignModal(false)}
                                    className={styles.closeButton}
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <div className={styles.modalForm}>
                                {lecturersLoading ? (
                                    <div className={styles.emptyLecturers}>
                                        <p>Loading lecturers...</p>
                                    </div>
                                ) : lecturers.length > 0 ? (
                                    <div className={styles.lecturersList}>
                                        {lecturers.map((lecturer: Lecturer) => (
                                            <div
                                                key={lecturer.id}
                                                className={styles.lecturerItem}
                                            >
                                                <div
                                                    className={
                                                        styles.lecturerItemMain
                                                    }
                                                >
                                                    <UserAvatar
                                                        firstName={
                                                            lecturer.firstName
                                                        }
                                                        lastName={
                                                            lecturer.lastName
                                                        }
                                                        email={lecturer.email}
                                                        avatarUrl={
                                                            lecturer.avatarUrl
                                                        }
                                                        size="md"
                                                    />
                                                    <div
                                                        className={
                                                            styles.lecturerInfo
                                                        }
                                                    >
                                                        <p
                                                            className={
                                                                styles.lecturerName
                                                            }
                                                        >
                                                            {formatLecturerDisplayName(
                                                                {
                                                                    ...lecturer,
                                                                    userType:
                                                                        "lecturer",
                                                                }
                                                            )}
                                                        </p>
                                                        <p
                                                            className={
                                                                styles.lecturerEmail
                                                            }
                                                        >
                                                            {lecturer.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAssignLecturer(
                                                            lecturer.id
                                                        )
                                                    }
                                                    className={
                                                        styles.assignLecturerButton
                                                    }
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyLecturers}>
                                        <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                            No lecturers available
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            There are no active lecturers to
                                            assign, or this course already has
                                            a lecturer.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                visible={toast.visible}
                type={toast.type}
                onClose={hideToast}
                position="bottom-left"
            />
        </div>
    );
}
