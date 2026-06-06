"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import Link from "next/link";
import { GET_USER_STATS, GET_ALL_COURSES } from "@/lib/graphql/queries";
import { formatLecturerDisplayName } from "@/shared/utils/personDisplayName";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";
import {
    UsersIcon,
    AcademicCapIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    DocumentChartBarIcon,
    MegaphoneIcon,
} from "@heroicons/react/24/outline";
import AdminPageSkeleton from "@/shared/components/common/AdminPageSkeleton/AdminPageSkeleton";
import styles from "./admin-dashboard.module.css";

type DashboardCourse = {
    id: number;
    courseCode: string;
    courseName: string;
    semester: string;
    applicationDeadline?: string | null;
    maxTutors: number;
    maxLabAssistants: number;
    selectedTutors?: number;
    selectedLabAssistants?: number;
    availableTutors?: number;
    availableLabAssistants?: number;
    courseAssignments?: Array<{
        lecturer?: {
            firstName: string;
            lastName: string;
            email: string;
        } | null;
    }>;
    applications?: Array<{ id: number }>;
};

const QUICK_ACTIONS = [
    { href: "/dashboard/users", label: "Users", icon: UsersIcon },
    { href: "/dashboard/courses", label: "Courses", icon: AcademicCapIcon },
    { href: "/dashboard/reports", label: "Selections", icon: DocumentChartBarIcon },
    {
        href: "/dashboard/announcements",
        label: "Announcements",
        icon: MegaphoneIcon,
    },
] as const;

const COURSE_PAGE_SIZE = 6;

const formatDeadline = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const getLecturerLabel = (course: DashboardCourse) => {
    const lecturer = course.courseAssignments?.[0]?.lecturer;
    if (!lecturer) return "Unassigned";
    return formatLecturerDisplayName({ ...lecturer, userType: "lecturer" });
};

export default function Dashboard() {
    const [coursePage, setCoursePage] = useState(1);

    const { data: userStats, loading: userStatsLoading } =
        useQuery(GET_USER_STATS);
    const { data: coursesData, loading: coursesLoading } =
        useQuery(GET_ALL_COURSES);

    const isInitialLoad =
        (userStatsLoading && !userStats) || (coursesLoading && !coursesData);

    const stats = [
        {
            name: "Total Users",
            value: userStats?.getUserStats?.totalUsers || 0,
            icon: UsersIcon,
            color: "total",
        },
        {
            name: "Candidates",
            value: userStats?.getUserStats?.totalCandidates || 0,
            icon: UserGroupIcon,
            color: "selected",
        },
        {
            name: "Lecturers",
            value: userStats?.getUserStats?.totalLecturers || 0,
            icon: AcademicCapIcon,
            color: "pending",
        },
        {
            name: "Blocked Users",
            value: userStats?.getUserStats?.blockedUsers || 0,
            icon: ExclamationTriangleIcon,
            color: "rate",
        },
    ];

    const courses: DashboardCourse[] = coursesData?.getAllCourses || [];
    const courseTotalPages = Math.max(
        1,
        Math.ceil(courses.length / COURSE_PAGE_SIZE)
    );
    const paginatedCourses = courses.slice(
        (coursePage - 1) * COURSE_PAGE_SIZE,
        coursePage * COURSE_PAGE_SIZE
    );

    useEffect(() => {
        if (coursePage > courseTotalPages) {
            setCoursePage(courseTotalPages);
        }
    }, [coursePage, courseTotalPages]);

    if (isInitialLoad) {
        return (
            <div className={styles.adminDashboard}>
                <div className={styles.dashboardContainer}>
                    <AdminPageSkeleton
                        variant="dashboard"
                        showHeader
                        showFilters={false}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminDashboard}>
            <div className={styles.dashboardContainer}>
                {/* Header Section */}
                <div className={styles.headerSection}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.title}>Admin Dashboard</h1>
                        <p className={styles.subtitle}>
                            Welcome to the Teaching Tutor administration panel
                        </p>
                    </div>
                </div>

                <>
                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    {stats.map((stat) => (
                        <div
                            key={stat.name}
                            className={`${styles.statCard} ${
                                styles[stat.color]
                            }`}
                        >
                            <div className={styles.statContent}>
                                <div className={styles.statIconWrapper}>
                                    <stat.icon className={styles.statIcon} />
                                </div>
                                <div className={styles.statInfo}>
                                    <div className={styles.statHeader}>
                                        <h3 className={styles.statValue}>
                                            {stat.value}
                                        </h3>
                                    </div>
                                    <p className={styles.statLabel}>
                                        {stat.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className={styles.contentGrid}>
                    {/* Courses Overview — wider */}
                    <div
                        className={`${styles.contentCard} ${styles.coursesCard}`}
                    >
                        <div className={styles.cardHeader}>
                            <div>
                                <h3 className={styles.cardTitle}>
                                    Courses Overview
                                </h3>
                                <p className={styles.cardSubtitle}>
                                    Capacity, assignments, and application load
                                </p>
                            </div>
                            <div className={styles.cardHeaderMeta}>
                                <div className={styles.cardBadge}>
                                    {courses.length} courses
                                </div>
                                <Link
                                    href="/dashboard/courses"
                                    className={styles.viewAllLink}
                                >
                                    Manage all
                                </Link>
                            </div>
                        </div>
                        <div className={styles.cardContent}>
                            {courses.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <AcademicCapIcon
                                        className={styles.emptyIcon}
                                    />
                                    <p className={styles.emptyText}>
                                        No courses yet
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.coursesTablePanel}>
                                    <div className={styles.coursesTableWrap}>
                                        <table className={styles.coursesTable}>
                                            <colgroup>
                                                <col
                                                    className={styles.colCourse}
                                                />
                                                <col
                                                    className={
                                                        styles.colLecturer
                                                    }
                                                />
                                                <col
                                                    className={styles.colApps}
                                                />
                                                <col
                                                    className={styles.colTutors}
                                                />
                                                <col
                                                    className={styles.colLab}
                                                />
                                                <col
                                                    className={
                                                        styles.colDeadline
                                                    }
                                                />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th>Course</th>
                                                    <th>Lecturer</th>
                                                    <th
                                                        className={
                                                            styles.thCompact
                                                        }
                                                    >
                                                        Applications
                                                    </th>
                                                    <th
                                                        className={
                                                            styles.thCompact
                                                        }
                                                    >
                                                        Tutors
                                                    </th>
                                                    <th
                                                        className={
                                                            styles.thCompact
                                                        }
                                                    >
                                                        Lab
                                                    </th>
                                                    <th
                                                        className={
                                                            styles.thDeadline
                                                        }
                                                    >
                                                        Deadline
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedCourses.map(
                                                    (course, index) => {
                                                        const rowStripe =
                                                            ((coursePage - 1) *
                                                                COURSE_PAGE_SIZE +
                                                                index) %
                                                                2 ===
                                                            0
                                                                ? styles.rowEven
                                                                : styles.rowOdd;
                                                const appCount =
                                                    course.applications
                                                        ?.length ?? 0;
                                                const tutorFilled =
                                                    course.selectedTutors ?? 0;
                                                const labFilled =
                                                    course.selectedLabAssistants ??
                                                    0;
                                                const tutorOpen =
                                                    course.availableTutors ??
                                                    Math.max(
                                                        0,
                                                        course.maxTutors -
                                                            tutorFilled
                                                    );
                                                const labOpen =
                                                    course.availableLabAssistants ??
                                                    Math.max(
                                                        0,
                                                        course.maxLabAssistants -
                                                            labFilled
                                                    );

                                                return (
                                                    <tr
                                                        key={course.id}
                                                        className={rowStripe}
                                                    >
                                                        <td
                                                            className={
                                                                styles.courseCell
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.courseCode
                                                                }
                                                            >
                                                                {
                                                                    course.courseCode
                                                                }
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.courseName
                                                                }
                                                            >
                                                                {
                                                                    course.courseName
                                                                }
                                                            </span>
                                                            <span
                                                                className={
                                                                    styles.courseSemester
                                                                }
                                                            >
                                                                {
                                                                    course.semester
                                                                }
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={
                                                                styles.cellLecturer
                                                            }
                                                        >
                                                            <span
                                                                className={`${
                                                                    styles.cellTruncate
                                                                } ${
                                                                    course
                                                                        .courseAssignments
                                                                        ?.length
                                                                        ? styles.lecturerAssigned
                                                                        : styles.lecturerMissing
                                                                }`}
                                                                title={getLecturerLabel(
                                                                    course
                                                                )}
                                                            >
                                                                {getLecturerLabel(
                                                                    course
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={
                                                                styles.cellNumeric
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.metricPill
                                                                }
                                                            >
                                                                {appCount}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={
                                                                styles.cellNumeric
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.slotLine
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.slotText
                                                                    }
                                                                >
                                                                    {tutorFilled}/
                                                                    {
                                                                        course.maxTutors
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.slotSep
                                                                    }
                                                                >
                                                                    ·
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.slotOpenInline
                                                                    }
                                                                >
                                                                    {tutorOpen}{" "}
                                                                    open
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={
                                                                styles.cellNumeric
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.slotLine
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.slotText
                                                                    }
                                                                >
                                                                    {labFilled}/
                                                                    {
                                                                        course.maxLabAssistants
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.slotSep
                                                                    }
                                                                >
                                                                    ·
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.slotOpenInline
                                                                    }
                                                                >
                                                                    {labOpen}{" "}
                                                                    open
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={
                                                                styles.cellDeadline
                                                            }
                                                        >
                                                            {formatDeadline(
                                                                course.applicationDeadline
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className={styles.coursesPagination}>
                                        <PaginationBar
                                            page={coursePage}
                                            pageSize={COURSE_PAGE_SIZE}
                                            totalCount={courses.length}
                                            totalPages={courseTotalPages}
                                            loading={coursesLoading}
                                            onPageChange={setCoursePage}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions — compact sidebar */}
                    <aside
                        className={`${styles.contentCard} ${styles.actionsCard}`}
                    >
                        <h3 className={styles.actionsHeading}>More Actions</h3>
                        <nav className={styles.actionsList}>
                            {QUICK_ACTIONS.map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={styles.actionItem}
                                >
                                    <action.icon
                                        className={styles.actionIconSvg}
                                    />
                                    <span className={styles.actionTitle}>
                                        {action.label}
                                    </span>
                                </Link>
                            ))}
                        </nav>
                    </aside>
                </div>
                </>
            </div>
        </div>
    );
}
