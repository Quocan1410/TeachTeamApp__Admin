"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import {
    GET_REPORT_SUMMARY,
    GET_CANDIDATES_CHOSEN_PER_COURSE_PAGINATED,
    GET_CANDIDATES_WITH_MULTIPLE_SELECTIONS_PAGINATED,
    GET_UNSELECTED_CANDIDATES_PAGINATED,
} from "@/lib/graphql/queries";
import {
    formatCandidateDisplayName,
    formatLecturerDisplayName,
} from "@/shared/utils/personDisplayName";
import PaginationBar from "@/shared/components/common/PaginationBar/PaginationBar";
import UserAvatar from "@/shared/components/common/UserAvatar/UserAvatar";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    AcademicCapIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import AdminPageSkeleton from "@/shared/components/common/AdminPageSkeleton/AdminPageSkeleton";
import styles from "./reports.module.css";

type ReportTab = "candidates-per-course" | "multiple-selections" | "unselected";

const PAGE_SIZE = 3;

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>(
        "candidates-per-course"
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 320);

    useEffect(() => {
        setPage(1);
    }, [activeTab, debouncedSearchTerm]);

    const listInput = {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearchTerm || null,
    };

    const { data: summaryData } = useQuery(GET_REPORT_SUMMARY);

    const {
        data: candidatesPerCourseData,
        loading: candidatesPerCourseLoading,
        error: candidatesPerCourseError,
    } = useQuery(GET_CANDIDATES_CHOSEN_PER_COURSE_PAGINATED, {
        variables: { input: listInput },
        skip: activeTab !== "candidates-per-course",
        fetchPolicy: "cache-and-network",
    });

    const {
        data: multipleSelectionsData,
        loading: multipleSelectionsLoading,
        error: multipleSelectionsError,
    } = useQuery(GET_CANDIDATES_WITH_MULTIPLE_SELECTIONS_PAGINATED, {
        variables: { input: listInput },
        skip: activeTab !== "multiple-selections",
        fetchPolicy: "cache-and-network",
    });

    const {
        data: unselectedCandidatesData,
        loading: unselectedCandidatesLoading,
        error: unselectedCandidatesError,
    } = useQuery(GET_UNSELECTED_CANDIDATES_PAGINATED, {
        variables: { input: listInput },
        skip: activeTab !== "unselected",
        fetchPolicy: "cache-and-network",
    });

    const summary = summaryData?.getReportSummary;

    const tabs = [
        {
            id: "candidates-per-course" as ReportTab,
            name: "Selected by Course",
            hint: "Who was picked for each course, by which lecturer, and when.",
            icon: AcademicCapIcon,
            count: summary?.totalSelectedCandidates ?? 0,
        },
        {
            id: "multiple-selections" as ReportTab,
            name: "Over-selected",
            hint: "Candidates selected more than 3 times — review for overlap or imbalance.",
            icon: UserGroupIcon,
            count: summary?.multipleSelectionsCount ?? 0,
        },
        {
            id: "unselected" as ReportTab,
            name: "Applied, Not Selected",
            hint: "Candidates who applied but have not been selected for any course yet.",
            icon: ExclamationTriangleIcon,
            count: summary?.unselectedCandidatesCount ?? 0,
        },
    ];

    const perCoursePage =
        candidatesPerCourseData?.getCandidatesChosenPerCoursePaginated;
    const multiplePage =
        multipleSelectionsData?.getCandidatesWithMultipleSelectionsPaginated;
    const unselectedPage =
        unselectedCandidatesData?.getUnselectedCandidatesPaginated;

    const isPerCourseInitialLoad =
        candidatesPerCourseLoading && !candidatesPerCourseData;
    const isMultipleInitialLoad =
        multipleSelectionsLoading && !multipleSelectionsData;
    const isUnselectedInitialLoad =
        unselectedCandidatesLoading && !unselectedCandidatesData;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-AU", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatSelectionDate = (dateString: string) => {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "—";

        const datePart = date.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const timePart = date
            .toLocaleTimeString("en-AU", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            })
            .toLowerCase();

        return `${datePart}, ${timePart}`;
    };

    const ErrorMessage = ({ message }: { message: string }) => (
        <div className={styles.errorContainer}>
            <ExclamationTriangleIcon className={styles.errorIcon} />
            <p>Error: {message}</p>
        </div>
    );

    const SearchBar = () => (
        <div className={styles.searchContainer}>
            <MagnifyingGlassIcon className={styles.searchIcon} />
            <input
                type="text"
                placeholder="Search courses or candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
            />
        </div>
    );

    return (
        <div className={styles.reportsPage}>
            <div className={styles.reportsContainer}>
                <div className={styles.headerSection}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.title}>Selection Overview</h1>
                        <p className={styles.subtitle}>
                            Track who was selected, who was missed, and
                            overlapping picks across courses
                        </p>
                    </div>
                </div>

                <div className={styles.filtersSection}>
                    <div className={styles.filtersHeader}>
                        <div className={styles.tabsList}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`${styles.tabButton} ${
                                        activeTab === tab.id
                                            ? styles.active
                                            : ""
                                    }`}
                                >
                                    <tab.icon className={styles.tabIcon} />
                                    <span className={styles.tabName}>
                                        {tab.name}
                                    </span>
                                    <span className={styles.tabCount}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <SearchBar />
                    </div>
                    <p className={styles.tabHint}>
                        {tabs.find((tab) => tab.id === activeTab)?.hint}
                    </p>
                </div>

                <div className={styles.reportContent}>
                    {activeTab === "candidates-per-course" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Selected by Course
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Selected tutors and lab assistants per
                                    course, with lecturer and timestamp
                                </p>
                            </div>

                            {isPerCourseInitialLoad ? (
                                <AdminPageSkeleton
                                    variant="list-cards"
                                    count={PAGE_SIZE}
                                    showHeader={false}
                                    showFilters={false}
                                    gridClassName={styles.coursesGrid}
                                />
                            ) : null}
                            {candidatesPerCourseError && (
                                <ErrorMessage
                                    message={candidatesPerCourseError.message}
                                />
                            )}

                            {perCoursePage && !isPerCourseInitialLoad && (
                                <>
                                    <div className={styles.coursesGrid}>
                                        {perCoursePage.items.map(
                                            (courseData: any) => (
                                                <div
                                                    key={courseData.course.id}
                                                    className={
                                                        styles.selectionCourseCard
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.selectionCourseHeader
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.selectionCourseIdentity
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.courseCodeBadge
                                                                }
                                                            >
                                                                {
                                                                    courseData
                                                                        .course
                                                                        .courseCode
                                                                }
                                                            </span>
                                                            <div>
                                                                <h3
                                                                    className={
                                                                        styles.selectionCourseName
                                                                    }
                                                                >
                                                                    {
                                                                        courseData
                                                                            .course
                                                                            .courseName
                                                                    }
                                                                </h3>
                                                                <p
                                                                    className={
                                                                        styles.courseSemester
                                                                    }
                                                                >
                                                                    {
                                                                        courseData
                                                                            .course
                                                                            .semester
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={
                                                                styles.selectedCountBadge
                                                            }
                                                        >
                                                            {
                                                                courseData.totalSelected
                                                            }{" "}
                                                            selected
                                                        </span>
                                                    </div>

                                                    {courseData
                                                        .selectedCandidates
                                                        .length > 0 ? (
                                                        <div
                                                            className={
                                                                styles.candidatesList
                                                            }
                                                        >
                                                            {courseData.selectedCandidates.map(
                                                                (
                                                                    selection: any
                                                                ) => (
                                                                    <div
                                                                        key={`${selection.application.id}-${selection.candidate.id}-${selection.course.id}`}
                                                                        className={
                                                                            styles.candidateItem
                                                                        }
                                                                    >
                                                                        <div
                                                                            className={
                                                                                styles.candidateInfo
                                                                            }
                                                                        >
                                                                            <UserAvatar
                                                                                firstName={
                                                                                    selection
                                                                                        .candidate
                                                                                        .firstName
                                                                                }
                                                                                lastName={
                                                                                    selection
                                                                                        .candidate
                                                                                        .lastName
                                                                                }
                                                                                email={
                                                                                    selection
                                                                                        .candidate
                                                                                        .email
                                                                                }
                                                                                avatarUrl={
                                                                                    selection
                                                                                        .candidate
                                                                                        .avatarUrl
                                                                                }
                                                                                size="sm"
                                                                                className={
                                                                                    styles.selectionCandidateAvatar
                                                                                }
                                                                            />
                                                                            <div
                                                                                className={
                                                                                    styles.candidateDetails
                                                                                }
                                                                            >
                                                                                <h4
                                                                                    className={
                                                                                        styles.candidateName
                                                                                    }
                                                                                >
                                                                                    {formatCandidateDisplayName(
                                                                                        selection.candidate
                                                                                    )}
                                                                                </h4>
                                                                                <p
                                                                                    className={
                                                                                        styles.candidateEmail
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        selection
                                                                                            .candidate
                                                                                            .email
                                                                                    }
                                                                                </p>
                                                                                <div
                                                                                    className={
                                                                                        styles.candidateMeta
                                                                                    }
                                                                                >
                                                                                    {selection
                                                                                        .application
                                                                                        .role
                                                                                        ?.roleName && (
                                                                                        <span
                                                                                            className={
                                                                                                styles.selectionRoleTag
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                selection
                                                                                                    .application
                                                                                                    .role
                                                                                                    .roleName
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                    <time
                                                                                        className={
                                                                                            styles.selectionDate
                                                                                        }
                                                                                        dateTime={
                                                                                            selection.selectedAt
                                                                                        }
                                                                                    >
                                                                                        Selected:{" "}
                                                                                        {formatSelectionDate(
                                                                                            selection.selectedAt
                                                                                        )}
                                                                                    </time>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <aside
                                                                            className={
                                                                                styles.selectedByMeta
                                                                            }
                                                                        >
                                                                            <p
                                                                                className={
                                                                                    styles.selectedBy
                                                                                }
                                                                            >
                                                                                Selected
                                                                                by:{" "}
                                                                                {selection.selectedBy
                                                                                    ? formatLecturerDisplayName(
                                                                                          {
                                                                                              ...selection.selectedBy,
                                                                                              userType:
                                                                                                  "lecturer",
                                                                                          }
                                                                                      )
                                                                                    : "Unknown lecturer"}
                                                                            </p>
                                                                        </aside>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={
                                                                styles.emptyState
                                                            }
                                                        >
                                                            <ExclamationTriangleIcon
                                                                className={
                                                                    styles.emptyIcon
                                                                }
                                                            />
                                                            <p>
                                                                No candidates
                                                                selected for
                                                                this course
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div className={styles.reportsPagination}>
                                        <PaginationBar
                                            page={perCoursePage.page}
                                            pageSize={perCoursePage.pageSize}
                                            totalCount={perCoursePage.totalCount}
                                            totalPages={perCoursePage.totalPages}
                                            loading={isPerCourseInitialLoad}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "multiple-selections" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Over-selected Candidates
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Candidates selected for more than 3 courses
                                    or roles
                                </p>
                            </div>

                            {isMultipleInitialLoad ? (
                                <AdminPageSkeleton
                                    variant="list-cards"
                                    count={PAGE_SIZE}
                                    showHeader={false}
                                    showFilters={false}
                                    gridClassName={styles.candidatesGrid}
                                />
                            ) : null}
                            {multipleSelectionsError && (
                                <ErrorMessage
                                    message={multipleSelectionsError.message}
                                />
                            )}

                            {multiplePage && !isMultipleInitialLoad && (
                                <>
                                    <div className={styles.candidatesGrid}>
                                        {multiplePage.items.length > 0 ? (
                                            multiplePage.items.map(
                                                (candidateData: any) => (
                                                    <div
                                                        key={
                                                            candidateData
                                                                .candidate.id
                                                        }
                                                        className={
                                                            styles.multipleSelectionCard
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.candidateHeader
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.candidateInfo
                                                                }
                                                            >
                                                                <UserAvatar
                                                                    firstName={
                                                                        candidateData
                                                                            .candidate
                                                                            .firstName
                                                                    }
                                                                    lastName={
                                                                        candidateData
                                                                            .candidate
                                                                            .lastName
                                                                    }
                                                                    email={
                                                                        candidateData
                                                                            .candidate
                                                                            .email
                                                                    }
                                                                    avatarUrl={
                                                                        candidateData
                                                                            .candidate
                                                                            .avatarUrl
                                                                    }
                                                                    size="sm"
                                                                    className={
                                                                        styles.selectionCandidateAvatar
                                                                    }
                                                                />
                                                                <div
                                                                    className={
                                                                        styles.candidateDetails
                                                                    }
                                                                >
                                                                    <h3
                                                                        className={
                                                                            styles.candidateName
                                                                        }
                                                                    >
                                                                        {formatCandidateDisplayName(
                                                                            candidateData.candidate
                                                                        )}
                                                                    </h3>
                                                                    <p
                                                                        className={
                                                                            styles.candidateEmail
                                                                        }
                                                                    >
                                                                        {
                                                                            candidateData
                                                                                .candidate
                                                                                .email
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={
                                                                    styles.selectionsCountBadge
                                                                }
                                                            >
                                                                {
                                                                    candidateData.totalSelections
                                                                }{" "}
                                                                selections
                                                            </span>
                                                        </div>

                                                        <div
                                                            className={
                                                                styles.selectionsList
                                                            }
                                                        >
                                                            {candidateData.selections.map(
                                                                (
                                                                    selection: any,
                                                                    index: number
                                                                ) => (
                                                                    <div
                                                                        key={`${selection.course.id}-${index}`}
                                                                        className={
                                                                            styles.selectionItem
                                                                        }
                                                                    >
                                                                        <div
                                                                            className={
                                                                                styles.selectionInfo
                                                                            }
                                                                        >
                                                                            <h4
                                                                                className={
                                                                                    styles.courseName
                                                                                }
                                                                            >
                                                                                {
                                                                                    selection
                                                                                        .course
                                                                                        .courseCode
                                                                                }{" "}
                                                                                -{" "}
                                                                                {
                                                                                    selection
                                                                                        .course
                                                                                        .courseName
                                                                                }
                                                                            </h4>
                                                                            <div
                                                                                className={
                                                                                    styles.selectionItemMeta
                                                                                }
                                                                            >
                                                                                {selection
                                                                                    .application
                                                                                    .role
                                                                                    ?.roleName && (
                                                                                    <span
                                                                                        className={
                                                                                            styles.selectionRoleTag
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            selection
                                                                                                .application
                                                                                                .role
                                                                                                .roleName
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <time
                                                                                className={
                                                                                    styles.selectionItemDate
                                                                                }
                                                                                dateTime={
                                                                                    selection.selectedAt
                                                                                }
                                                                            >
                                                                                Selected:{" "}
                                                                                {formatSelectionDate(
                                                                                    selection.selectedAt
                                                                                )}
                                                                            </time>
                                                                            {selection.selectedBy && (
                                                                                <p
                                                                                    className={
                                                                                        styles.selectionItemSelectedBy
                                                                                    }
                                                                                >
                                                                                    Selected
                                                                                    by:{" "}
                                                                                    {formatLecturerDisplayName(
                                                                                        {
                                                                                            ...selection.selectedBy,
                                                                                            userType:
                                                                                                "lecturer",
                                                                                        }
                                                                                    )}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <div
                                                className={styles.emptyState}
                                            >
                                                <CheckCircleIcon
                                                    className={
                                                        styles.emptyIcon
                                                    }
                                                />
                                                <h3>
                                                    No Multiple Selections Found
                                                </h3>
                                                <p>
                                                    No candidates have been
                                                    selected for more than 3
                                                    courses
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.reportsPagination}>
                                        <PaginationBar
                                            page={multiplePage.page}
                                            pageSize={multiplePage.pageSize}
                                            totalCount={multiplePage.totalCount}
                                            totalPages={multiplePage.totalPages}
                                            loading={isMultipleInitialLoad}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "unselected" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Applied, Not Selected
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Candidates with applications but no
                                    selection on any course yet
                                </p>
                            </div>

                            {isUnselectedInitialLoad ? (
                                <AdminPageSkeleton
                                    variant="list-cards"
                                    count={PAGE_SIZE}
                                    showHeader={false}
                                    showFilters={false}
                                    gridClassName={styles.candidatesGrid}
                                />
                            ) : null}
                            {unselectedCandidatesError && (
                                <ErrorMessage
                                    message={unselectedCandidatesError.message}
                                />
                            )}

                            {unselectedPage && !isUnselectedInitialLoad && (
                                <>
                                    <div className={styles.candidatesGrid}>
                                        {unselectedPage.items.length > 0 ? (
                                            unselectedPage.items.map(
                                                (candidateData: any) => (
                                                    <div
                                                        key={
                                                            candidateData
                                                                .candidate.id
                                                        }
                                                        className={
                                                            styles.unselectedCard
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.candidateHeader
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    styles.candidateInfo
                                                                }
                                                            >
                                                                <UserAvatar
                                                                    firstName={
                                                                        candidateData
                                                                            .candidate
                                                                            .firstName
                                                                    }
                                                                    lastName={
                                                                        candidateData
                                                                            .candidate
                                                                            .lastName
                                                                    }
                                                                    email={
                                                                        candidateData
                                                                            .candidate
                                                                            .email
                                                                    }
                                                                    avatarUrl={
                                                                        candidateData
                                                                            .candidate
                                                                            .avatarUrl
                                                                    }
                                                                    size="sm"
                                                                    className={
                                                                        styles.selectionCandidateAvatar
                                                                    }
                                                                />
                                                                <div
                                                                    className={
                                                                        styles.candidateDetails
                                                                    }
                                                                >
                                                                    <h3
                                                                        className={
                                                                            styles.candidateName
                                                                        }
                                                                    >
                                                                        {formatCandidateDisplayName(
                                                                            candidateData.candidate
                                                                        )}
                                                                    </h3>
                                                                    <p
                                                                        className={
                                                                            styles.candidateEmail
                                                                        }
                                                                    >
                                                                        {
                                                                            candidateData
                                                                                .candidate
                                                                                .email
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span
                                                                className={
                                                                    styles.applicationsCountBadge
                                                                }
                                                            >
                                                                {
                                                                    candidateData.totalApplications
                                                                }{" "}
                                                                applications
                                                            </span>
                                                        </div>

                                                        <div
                                                            className={
                                                                styles.applicationsList
                                                            }
                                                        >
                                                            {candidateData.applications.map(
                                                                (
                                                                    application: any
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            application.id
                                                                        }
                                                                        className={
                                                                            styles.applicationItem
                                                                        }
                                                                    >
                                                                        <div
                                                                            className={
                                                                                styles.applicationInfo
                                                                            }
                                                                        >
                                                                            <h4
                                                                                className={
                                                                                    styles.courseName
                                                                                }
                                                                            >
                                                                                {
                                                                                    application
                                                                                        .course
                                                                                        .courseCode
                                                                                }{" "}
                                                                                -{" "}
                                                                                {
                                                                                    application
                                                                                        .course
                                                                                        .courseName
                                                                                }
                                                                            </h4>
                                                                            <div
                                                                                className={
                                                                                    styles.applicationMeta
                                                                                }
                                                                            >
                                                                                {application.role && (
                                                                                    <span
                                                                                        className={
                                                                                            styles.selectionRoleTag
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            application
                                                                                                .role
                                                                                                .roleName
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                                <span
                                                                                    className={
                                                                                        styles.applicationStatusTag
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        application.status
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <time
                                                                                className={
                                                                                    styles.applicationDate
                                                                                }
                                                                                dateTime={
                                                                                    application.appliedAt
                                                                                }
                                                                            >
                                                                                Applied:{" "}
                                                                                {formatSelectionDate(
                                                                                    application.appliedAt
                                                                                )}
                                                                            </time>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <div
                                                className={styles.emptyState}
                                            >
                                                <CheckCircleIcon
                                                    className={
                                                        styles.emptyIcon
                                                    }
                                                />
                                                <h3>All Candidates Selected</h3>
                                                <p>
                                                    All candidates who have
                                                    applied have been selected
                                                    for at least one course
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.reportsPagination}>
                                        <PaginationBar
                                            page={unselectedPage.page}
                                            pageSize={unselectedPage.pageSize}
                                            totalCount={unselectedPage.totalCount}
                                            totalPages={unselectedPage.totalPages}
                                            loading={isUnselectedInitialLoad}
                                            onPageChange={setPage}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
