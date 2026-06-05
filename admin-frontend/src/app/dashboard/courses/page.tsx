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
} from "@heroicons/react/24/outline";
import styles from "./courses-management.module.css";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";

const PAGE_SIZE = 12;

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
    }, [debouncedSearchTerm]);

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
        onCompleted: () => {
            refetchCourses();
            setShowCreateModal(false);
            resetForm();
        },
    });

    const [updateCourse] = useMutation(UPDATE_COURSE, {
        onCompleted: () => {
            refetchCourses();
            setShowEditModal(false);
            resetForm();
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
        onCompleted: () => {
            refetchCourses();
            // Refresh lecturers for the current course
            if (selectedCourse) {
                getLecturers({
                    variables: {
                        courseId: parseInt(selectedCourse.id.toString()),
                    },
                });
            }
            setShowAssignModal(false);
        },
    });

    const [removeLecturer] = useMutation(REMOVE_LECTURER_FROM_COURSE, {
        onCompleted: (data) => {
            if (data.removeLecturerFromCourse.success) {
                refetchCourses();
                // Refresh lecturers for the current course
                if (selectedCourse) {
                    getLecturers({
                        variables: {
                            courseId: parseInt(selectedCourse.id.toString()),
                        },
                    });
                }
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
        setSelectedCourse(course);
        setShowAssignModal(true);
        // Fetch available lecturers for this specific course
        getLecturers({
            variables: { courseId: parseInt(course.id.toString()) },
        });
    };

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
                    {coursesLoading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className={styles.courseCard}>
                                <div className={styles.loadingContainer}>
                                    <div
                                        className={styles.loadingSkeleton}
                                    ></div>
                                    <div
                                        className={styles.loadingSkeleton}
                                    ></div>
                                    <div
                                        className={styles.loadingSkeleton}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : filteredCourses.length === 0 && !coursesLoading ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-gray-500 text-lg">
                                No courses found
                            </p>
                            <p className="text-gray-400">
                                Try adjusting your search criteria.
                            </p>
                        </div>
                    ) : (
                        filteredCourses.map((course: Course) => (
                            <div key={course.id} className={styles.courseCard}>
                                <div className={styles.courseHeader}>
                                    <div className={styles.courseInfo}>
                                        <h3 className={styles.courseCode}>
                                            {course.courseCode}
                                        </h3>
                                        <p className={styles.courseName}>
                                            {course.courseName}
                                        </p>
                                        <p className={styles.courseSemester}>
                                            {course.semester}
                                        </p>
                                    </div>
                                    <div className={styles.courseActions}>
                                        {(!course.courseAssignments ||
                                            course.courseAssignments.length ===
                                                0) && (
                                            <button
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

                                {course.description && (
                                    <p className={styles.courseDescription}>
                                        {course.description}
                                    </p>
                                )}

                                <div className={styles.courseStats}>
                                    <div className={styles.courseStat}>
                                        <h4 className={styles.courseStatValue}>
                                            {(course.maxTutors ?? 0) -
                                                (course.availableTutors ??
                                                    course.maxTutors ??
                                                    0)}
                                            /{course.maxTutors}
                                        </h4>
                                        <p className={styles.courseStatLabel}>
                                            Current Applicants/Total Tutors
                                        </p>
                                    </div>
                                    <div className={styles.courseStat}>
                                        <h4 className={styles.courseStatValue}>
                                            {(course.maxLabAssistants ?? 0) -
                                                (course.availableLabAssistants ??
                                                    course.maxLabAssistants ??
                                                    0)}
                                            /{course.maxLabAssistants}
                                        </h4>
                                        <p className={styles.courseStatLabel}>
                                            Current Applicants/Total Lab
                                            Assistants
                                        </p>
                                    </div>
                                    <div className={styles.courseStat}>
                                        <h4 className={styles.courseStatValue}>
                                            {course.applicationCount ?? course.applications?.length ?? 0}
                                        </h4>
                                        <p className={styles.courseStatLabel}>
                                            Applications
                                        </p>
                                    </div>
                                </div>

                                {/* Assigned Lecturers */}
                                <div className={styles.courseAssignments}>
                                    <div className={styles.assignmentsHeader}>
                                        <h4 className={styles.assignmentsTitle}>
                                            Assigned Lecturer
                                            {course.courseAssignments?.length >
                                                0 && <span> (1/1)</span>}
                                        </h4>
                                        {(!course.courseAssignments ||
                                            course.courseAssignments.length ===
                                                0) && (
                                            <button
                                                onClick={() =>
                                                    openAssignModal(course)
                                                }
                                                className={styles.assignButton}
                                            >
                                                Assign
                                            </button>
                                        )}
                                    </div>
                                    {course.courseAssignments?.length > 0 ? (
                                        <div className={styles.assignmentsList}>
                                            {course.courseAssignments.map(
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
                                                                <span className="text-red-500 italic">
                                                                    Lecturer not
                                                                    found
                                                                </span>
                                                            )}
                                                        </span>
                                                        {assignment.lecturer && (
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveLecturer(
                                                                        assignment.lecturer!
                                                                            .id,
                                                                        course
                                                                    )
                                                                }
                                                                className={
                                                                    styles.removeButton
                                                                }
                                                                title="Remove lecturer"
                                                            >
                                                                <UserMinusIcon
                                                                    className={
                                                                        styles.removeIcon
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
                        ))
                    )}
                </div>

                {coursePage && coursePage.totalCount > 0 && (
                    <PaginationBar
                        page={coursePage.page}
                        pageSize={coursePage.pageSize}
                        totalCount={coursePage.totalCount}
                        totalPages={coursePage.totalPages}
                        loading={coursesLoading}
                        onPageChange={setPage}
                    />
                )}

                {filteredCourses.length === 0 && !coursesLoading && (
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
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>
                                    Edit Course
                                </h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className={styles.closeButton}
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <form
                                onSubmit={handleUpdateCourse}
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
                                        onClick={() => setShowEditModal(false)}
                                        className={styles.modalButtonSecondary}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.modalButtonPrimary}
                                    >
                                        Update Course
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
                                <h3 className={styles.modalTitle}>
                                    Delete Course
                                </h3>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className={styles.closeButton}
                                >
                                    <XMarkIcon className={styles.closeIcon} />
                                </button>
                            </div>
                            <div className={styles.modalForm}>
                                <div className="text-center mb-6">
                                    <div className={styles.deleteWarningIcon}>
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        Are you sure you want to delete{" "}
                                        <strong className="text-gray-900 dark:text-white">
                                            {selectedCourse.courseCode} -{" "}
                                            {selectedCourse.courseName}
                                        </strong>
                                        ?
                                    </p>
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                        <p className="text-sm text-amber-800 dark:text-amber-200">
                                            <strong>Note:</strong> Courses with
                                            active applications (pending or
                                            selected) cannot be deleted. Please
                                            handle all active applications
                                            first, then try again.
                                        </p>
                                    </div>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        onClick={() =>
                                            setShowDeleteModal(false)
                                        }
                                        className={styles.modalButtonSecondary}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteCourse}
                                        className={styles.modalButtonDanger}
                                    >
                                        Delete
                                    </button>
                                </div>
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
                                {lecturers.length > 0 ? (
                                    <div className={styles.lecturersList}>
                                        {lecturers.map((lecturer: Lecturer) => (
                                            <div
                                                key={lecturer.id}
                                                className={styles.lecturerItem}
                                            >
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
                                                        {formatLecturerDisplayName({
                                                            ...lecturer,
                                                            userType: "lecturer",
                                                        })}
                                                    </p>
                                                    <p
                                                        className={
                                                            styles.lecturerEmail
                                                        }
                                                    >
                                                        {lecturer.email}
                                                    </p>
                                                </div>
                                                <button
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
                                            No available lecturers
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            All lecturers are already assigned
                                            to courses.
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
