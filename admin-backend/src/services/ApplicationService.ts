import { AppDataSource } from "../config/database";
import { Application } from "../types/Application";
import { ApplicationStatus } from "../types/Application";
import { CourseAssignment } from "../types/CourseAssignment";
import { SelectedCandidate } from "../types/SelectedCandidate";

export interface CandidateApplicationCleanupResult {
    success: boolean;
    message: string;
    unselectedCount: number;
    unrankedCount: number;
    selectionsClearedCount: number;
}

export class ApplicationService {
    /**
     * Get affected lecturer IDs who have applications from the given candidate
     * This is used to send targeted notifications only to relevant lecturers
     */
    static async getAffectedLecturerIds(
        candidateId: number
    ): Promise<number[]> {
        try {
            const applicationRepository =
                AppDataSource.getRepository(Application);
            const courseAssignmentRepository =
                AppDataSource.getRepository(CourseAssignment);

            const candidateApplications = await applicationRepository.find({
                where: { candidateId: candidateId },
                relations: ["course"],
                select: ["id", "courseId"],
            });

            if (candidateApplications.length === 0) {
                return [];
            }

            const courseIds = [
                ...new Set(candidateApplications.map((app) => app.courseId)),
            ];

            if (courseIds.length === 0) {
                return [];
            }

            const assignments = await courseAssignmentRepository
                .createQueryBuilder("assignment")
                .select(["assignment.lecturerId", "assignment.courseId"])
                .where("assignment.courseId IN (:...courseIds)", {
                    courseIds,
                })
                .getMany();

            return [
                ...new Set(assignments.map((assignment) => assignment.lecturerId)),
            ];
        } catch {
            return [];
        }
    }

    /**
     * Remove candidate from shortlists, rankings, and selections.
     * Mirrors main-app rules: pending shortlisted rows and selected apps must not linger after block/delete.
     */
    static async cleanupCandidateApplications(
        candidateId: number
    ): Promise<CandidateApplicationCleanupResult> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const applicationRepository =
                queryRunner.manager.getRepository(Application);
            const selectedCandidateRepository =
                queryRunner.manager.getRepository(SelectedCandidate);

            const applications = await applicationRepository.find({
                where: { candidateId },
            });

            if (applications.length === 0) {
                await queryRunner.commitTransaction();
                return {
                    success: true,
                    message: "No applications to clean up",
                    unselectedCount: 0,
                    unrankedCount: 0,
                    selectionsClearedCount: 0,
                };
            }

            const applicationIds = applications.map((app) => app.id);
            let unselectedCount = 0;
            let unrankedCount = 0;

            for (const application of applications) {
                let dirty = false;

                if (application.status === ApplicationStatus.SELECTED) {
                    application.status = ApplicationStatus.PENDING;
                    unselectedCount++;
                    dirty = true;
                }

                const wasRanked =
                    application.rank !== null &&
                    application.rank !== undefined &&
                    application.rank > 0;

                if (wasRanked) {
                    application.rank = null;
                    application.rankedBy = null;
                    application.rankedAt = null;
                    application.rankedForCourse = null;
                    unrankedCount++;
                    dirty = true;
                }

                if (dirty) {
                    await applicationRepository.save(application);
                }
            }

            const deleteResult = await selectedCandidateRepository
                .createQueryBuilder()
                .delete()
                .from(SelectedCandidate)
                .where("applicationId IN (:...applicationIds)", {
                    applicationIds,
                })
                .execute();

            await this.reorderRankingsAfterRemoval(queryRunner.manager);

            await queryRunner.commitTransaction();

            return {
                success: true,
                message: `Cleaned ${unselectedCount} selection(s), ${unrankedCount} ranking(s), and ${deleteResult.affected ?? 0} shortlist row(s)`,
                unselectedCount,
                unrankedCount,
                selectionsClearedCount: deleteResult.affected ?? 0,
            };
        } catch {
            await queryRunner.rollbackTransaction();
            return {
                success: false,
                message: "Failed to clean up candidate applications",
                unselectedCount: 0,
                unrankedCount: 0,
                selectionsClearedCount: 0,
            };
        } finally {
            await queryRunner.release();
        }
    }

    /** @deprecated Use cleanupCandidateApplications */
    static async unselectAndUnrankCandidateApplications(
        candidateId: number
    ): Promise<{
        success: boolean;
        message: string;
        unselectedCount: number;
        unrankedCount: number;
    }> {
        const result = await this.cleanupCandidateApplications(candidateId);
        return {
            success: result.success,
            message: result.message,
            unselectedCount: result.unselectedCount,
            unrankedCount: result.unrankedCount,
        };
    }

    /**
     * Reorder rankings after removing applications to ensure consecutive ranking
     * This prevents gaps in the ranking sequence
     */
    static async reorderRankingsAfterRemoval(
        manager = AppDataSource.manager
    ): Promise<void> {
        try {
            const applicationRepository = manager.getRepository(Application);

            const rankedApplications = await applicationRepository.find({
                where: {
                    status: ApplicationStatus.SELECTED,
                },
                relations: ["course", "role", "candidate"],
                order: {
                    rankedForCourse: "ASC",
                    rank: "ASC",
                },
            });

            const applicationsWithRanks = rankedApplications.filter(
                (app) =>
                    app.rank !== null && app.rank !== undefined && app.rank > 0
            );

            const applicationsByCourse = applicationsWithRanks.reduce(
                (acc, app) => {
                    const course = app.rankedForCourse || "unknown";
                    if (!acc[course]) {
                        acc[course] = [];
                    }
                    acc[course].push(app);
                    return acc;
                },
                {} as Record<string, Application[]>
            );

            for (const courseApplications of Object.values(
                applicationsByCourse
            )) {
                courseApplications.sort(
                    (a, b) => (a.rank || 0) - (b.rank || 0)
                );

                for (let i = 0; i < courseApplications.length; i++) {
                    const newRank = i + 1;
                    if (courseApplications[i].rank !== newRank) {
                        courseApplications[i].rank = newRank;
                        await applicationRepository.save(courseApplications[i]);
                    }
                }
            }
        } catch {
            // Silent error handling for production
        }
    }
}
