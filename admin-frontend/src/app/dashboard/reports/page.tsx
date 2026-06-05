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
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
    DocumentChartBarIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    PrinterIcon,
    UserIcon,
    AcademicCapIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import styles from "./reports.module.css";

type ReportTab = "candidates-per-course" | "multiple-selections" | "unselected";

const PAGE_SIZE = 10;

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
    });

    const {
        data: multipleSelectionsData,
        loading: multipleSelectionsLoading,
        error: multipleSelectionsError,
    } = useQuery(GET_CANDIDATES_WITH_MULTIPLE_SELECTIONS_PAGINATED, {
        variables: { input: listInput },
        skip: activeTab !== "multiple-selections",
    });

    const {
        data: unselectedCandidatesData,
        loading: unselectedCandidatesLoading,
        error: unselectedCandidatesError,
    } = useQuery(GET_UNSELECTED_CANDIDATES_PAGINATED, {
        variables: { input: listInput },
        skip: activeTab !== "unselected",
    });

    const summary = summaryData?.getReportSummary;

    const tabs = [
        {
            id: "candidates-per-course" as ReportTab,
            name: "Candidates Per Course",
            icon: AcademicCapIcon,
            count: summary?.totalSelectedCandidates ?? 0,
        },
        {
            id: "multiple-selections" as ReportTab,
            name: "Multiple Selections",
            icon: UserGroupIcon,
            count: summary?.multipleSelectionsCount ?? 0,
        },
        {
            id: "unselected" as ReportTab,
            name: "Unselected Candidates",
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

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-AU", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const LoadingSpinner = () => (
        <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading report data...</p>
        </div>
    );

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
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
            />
        </div>
    );

    return (
        <div className={styles.reportsPage}>
            <div className={styles.reportsContainer}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerText}>
                            <h1 className={styles.pageTitle}>
                                <DocumentChartBarIcon
                                    className={styles.titleIcon}
                                />
                                Admin Reports
                            </h1>
                            <p className={styles.pageSubtitle}>
                                Comprehensive candidate selection analytics and
                                reports
                            </p>
                        </div>
                        <button
                            onClick={handlePrint}
                            className={styles.printButton}
                            aria-label="Print Report"
                        >
                            <PrinterIcon className={styles.printIcon} />
                            Print Report
                        </button>
                    </div>
                </div>

                <div className={styles.tabsContainer}>
                    <div className={styles.tabsList}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.tabButton} ${
                                    activeTab === tab.id ? styles.active : ""
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
                </div>

                <SearchBar />

                <div className={styles.reportContent}>
                    {activeTab === "candidates-per-course" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Candidates Chosen for Each Course
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Overview of selected candidates per course
                                    with selection details
                                </p>
                            </div>

                            {candidatesPerCourseLoading && <LoadingSpinner />}
                            {candidatesPerCourseError && (
                                <ErrorMessage
                                    message={candidatesPerCourseError.message}
                                />
                            )}

                            {perCoursePage && (
                                <>
                                    <div className={styles.coursesGrid}>
                                        {perCoursePage.items.map(
                                            (courseData: any) => (
                                                <div
                                                    key={courseData.course.id}
                                                    className={
                                                        styles.courseCard
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.courseHeader
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.courseInfo
                                                            }
                                                        >
                                                            <h3
                                                                className={
                                                                    styles.courseTitle
                                                                }
                                                            >
                                                                {
                                                                    courseData
                                                                        .course
                                                                        .courseCode
                                                                }{" "}
                                                                -{" "}
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
                                                        <div
                                                            className={
                                                                styles.courseStats
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.selectedCount
                                                                }
                                                            >
                                                                {
                                                                    courseData.totalSelected
                                                                }{" "}
                                                                Selected
                                                            </span>
                                                        </div>
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
                                                                            <div
                                                                                className={
                                                                                    styles.candidateAvatar
                                                                                }
                                                                            >
                                                                                <UserIcon
                                                                                    className={
                                                                                        styles.avatarIcon
                                                                                    }
                                                                                />
                                                                            </div>
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
                                                                                        .role && (
                                                                                        <span
                                                                                            className={
                                                                                                styles.roleTag
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
                                                                                    <span
                                                                                        className={
                                                                                            styles.selectionDate
                                                                                        }
                                                                                    >
                                                                                        Selected:{" "}
                                                                                        {formatDate(
                                                                                            selection.selectedAt
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div
                                                                            className={
                                                                                styles.selectionMeta
                                                                            }
                                                                        >
                                                                            <p
                                                                                className={
                                                                                    styles.selectedBy
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
                                                                        </div>
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
                                    <PaginationBar
                                        page={perCoursePage.page}
                                        pageSize={perCoursePage.pageSize}
                                        totalCount={perCoursePage.totalCount}
                                        totalPages={perCoursePage.totalPages}
                                        loading={candidatesPerCourseLoading}
                                        onPageChange={setPage}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "multiple-selections" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Candidates with Multiple Selections (3+)
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Candidates who have been selected for more
                                    than 3 courses
                                </p>
                            </div>

                            {multipleSelectionsLoading && <LoadingSpinner />}
                            {multipleSelectionsError && (
                                <ErrorMessage
                                    message={multipleSelectionsError.message}
                                />
                            )}

                            {multiplePage && (
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
                                                                <div
                                                                    className={
                                                                        styles.candidateAvatar
                                                                    }
                                                                >
                                                                    <UserIcon
                                                                        className={
                                                                            styles.avatarIcon
                                                                        }
                                                                    />
                                                                </div>
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
                                                            <div
                                                                className={
                                                                    styles.selectionBadge
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.selectionCount
                                                                    }
                                                                >
                                                                    {
                                                                        candidateData.totalSelections
                                                                    }{" "}
                                                                    Selections
                                                                </span>
                                                            </div>
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
                                                                                    styles.selectionMeta
                                                                                }
                                                                            >
                                                                                {selection
                                                                                    .application
                                                                                    .role && (
                                                                                    <span
                                                                                        className={
                                                                                            styles.roleTag
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
                                                                                <span
                                                                                    className={
                                                                                        styles.selectionDate
                                                                                    }
                                                                                >
                                                                                    {formatDate(
                                                                                        selection.selectedAt
                                                                                    )}
                                                                                </span>
                                                                            </div>
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
                                    <PaginationBar
                                        page={multiplePage.page}
                                        pageSize={multiplePage.pageSize}
                                        totalCount={multiplePage.totalCount}
                                        totalPages={multiplePage.totalPages}
                                        loading={multipleSelectionsLoading}
                                        onPageChange={setPage}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "unselected" && (
                        <div className={styles.reportSection}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    Unselected Candidates
                                </h2>
                                <p className={styles.sectionDescription}>
                                    Candidates who have applied but have not
                                    been selected for any courses
                                </p>
                            </div>

                            {unselectedCandidatesLoading && <LoadingSpinner />}
                            {unselectedCandidatesError && (
                                <ErrorMessage
                                    message={unselectedCandidatesError.message}
                                />
                            )}

                            {unselectedPage && (
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
                                                                <div
                                                                    className={
                                                                        styles.candidateAvatar
                                                                    }
                                                                >
                                                                    <UserIcon
                                                                        className={
                                                                            styles.avatarIcon
                                                                        }
                                                                    />
                                                                </div>
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
                                                            <div
                                                                className={
                                                                    styles.applicationBadge
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.applicationCount
                                                                    }
                                                                >
                                                                    {
                                                                        candidateData.totalApplications
                                                                    }{" "}
                                                                    Applications
                                                                </span>
                                                            </div>
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
                                                                                            styles.roleTag
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
                                                                                        styles.statusTag
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        application.status
                                                                                    }
                                                                                </span>
                                                                                <span
                                                                                    className={
                                                                                        styles.applicationDate
                                                                                    }
                                                                                >
                                                                                    Applied:{" "}
                                                                                    {formatDate(
                                                                                        application.appliedAt
                                                                                    )}
                                                                                </span>
                                                                            </div>
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
                                    <PaginationBar
                                        page={unselectedPage.page}
                                        pageSize={unselectedPage.pageSize}
                                        totalCount={unselectedPage.totalCount}
                                        totalPages={unselectedPage.totalPages}
                                        loading={unselectedCandidatesLoading}
                                        onPageChange={setPage}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
