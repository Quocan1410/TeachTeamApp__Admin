import {
    Resolver,
    Query,
    ObjectType,
    Field,
    Int,
    Arg,
    InputType,
    UseMiddleware,
} from "type-graphql";
import { Brackets, In } from "typeorm";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { User, UserType } from "../types/User";
import { Course } from "../types/Course";
import { Application } from "../types/Application";
import { SelectedCandidate } from "../types/SelectedCandidate";
import { AppDataSource } from "../config/database";
import {
    normalizePagination,
    paginatedResult,
} from "../utils/pagination";

@InputType()
class ReportListInput {
    @Field(() => Int, { defaultValue: 1 })
    page: number;

    @Field(() => Int, { defaultValue: 10 })
    pageSize: number;

    @Field({ nullable: true })
    search?: string;
}

@ObjectType()
class CandidateSelectionInfo {
    @Field(() => User)
    candidate: User;

    @Field(() => Course)
    course: Course;

    @Field()
    selectedAt: Date;

    @Field(() => User)
    selectedBy: User;

    @Field(() => Application)
    application: Application;
}

@ObjectType()
class CourseSelectedCandidates {
    @Field(() => Course)
    course: Course;

    @Field(() => [CandidateSelectionInfo])
    selectedCandidates: CandidateSelectionInfo[];

    @Field(() => Int)
    totalSelected: number;
}

@ObjectType()
class CandidateMultipleSelections {
    @Field(() => User)
    candidate: User;

    @Field(() => [CandidateSelectionInfo])
    selections: CandidateSelectionInfo[];

    @Field(() => Int)
    totalSelections: number;
}

@ObjectType()
class UnselectedCandidate {
    @Field(() => User)
    candidate: User;

    @Field(() => [Application])
    applications: Application[];

    @Field(() => Int)
    totalApplications: number;
}

@ObjectType()
class CourseSelectedCandidatesPage {
    @Field(() => [CourseSelectedCandidates])
    items: CourseSelectedCandidates[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;

    @Field(() => Int)
    totalPages: number;
}

@ObjectType()
class CandidateMultipleSelectionsPage {
    @Field(() => [CandidateMultipleSelections])
    items: CandidateMultipleSelections[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;

    @Field(() => Int)
    totalPages: number;
}

@ObjectType()
class UnselectedCandidatePage {
    @Field(() => [UnselectedCandidate])
    items: UnselectedCandidate[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;

    @Field(() => Int)
    totalPages: number;
}

@ObjectType()
class ReportSummary {
    @Field(() => Int)
    totalSelectedCandidates: number;

    @Field(() => Int)
    multipleSelectionsCount: number;

    @Field(() => Int)
    unselectedCandidatesCount: number;
}

async function loadSelectionsForCourse(
    courseId: number
): Promise<CandidateSelectionInfo[]> {
    const selectedCandidateRepository =
        AppDataSource.getRepository(SelectedCandidate);

    const selectedCandidates = await selectedCandidateRepository.find({
        relations: [
            "application",
            "application.candidate",
            "application.course",
            "application.role",
            "selectedBy",
        ],
        where: {
            application: {
                courseId,
            },
        },
        order: { selectedAt: "DESC" },
    });

    return selectedCandidates.map((selection) => ({
        candidate: selection.application.candidate,
        course: selection.application.course,
        selectedAt: selection.selectedAt,
        selectedBy: selection.selectedBy,
        application: selection.application,
    }));
}

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class ReportResolver {
    @Query(() => ReportSummary)
    async getReportSummary(): Promise<ReportSummary> {
        const selectedCandidateRepository =
            AppDataSource.getRepository(SelectedCandidate);
        const userRepository = AppDataSource.getRepository(User);

        const [totalSelectedCandidates, multipleRows, unselectedCandidatesCount] =
            await Promise.all([
                selectedCandidateRepository.count(),
                selectedCandidateRepository
                    .createQueryBuilder("sc")
                    .innerJoin("sc.application", "application")
                    .select("application.candidateId", "candidateId")
                    .groupBy("application.candidateId")
                    .having("COUNT(*) > 3")
                    .getRawMany(),
                userRepository
                    .createQueryBuilder("candidate")
                    .where("candidate.userType = :userType", {
                        userType: UserType.CANDIDATE,
                    })
                    .andWhere(
                        `EXISTS (
                            SELECT 1 FROM applications app
                            WHERE app.candidateId = candidate.id
                        )`
                    )
                    .andWhere(
                        `NOT EXISTS (
                            SELECT 1 FROM selected_candidates sc
                            INNER JOIN applications app ON app.id = sc.applicationId
                            WHERE app.candidateId = candidate.id
                        )`
                    )
                    .getCount(),
            ]);

        return {
            totalSelectedCandidates,
            multipleSelectionsCount: multipleRows.length,
            unselectedCandidatesCount,
        };
    }

    @Query(() => [CourseSelectedCandidates])
    async getCandidatesChosenPerCourse(): Promise<CourseSelectedCandidates[]> {
        const courseRepository = AppDataSource.getRepository(Course);
        const selectedCandidateRepository =
            AppDataSource.getRepository(SelectedCandidate);

        // Get all courses with their selected candidates
        const courses = await courseRepository.find({
            order: { courseCode: "ASC" },
        });

        const result: CourseSelectedCandidates[] = [];

        for (const course of courses) {
            // Get all selected candidates for this course
            const selectedCandidates = await selectedCandidateRepository.find({
                relations: [
                    "application",
                    "application.candidate",
                    "application.course",
                    "application.role",
                    "selectedBy",
                ],
                where: {
                    application: {
                        courseId: course.id,
                    },
                },
                order: { selectedAt: "DESC" },
            });

            const candidateSelections: CandidateSelectionInfo[] =
                selectedCandidates.map((selection) => ({
                    candidate: selection.application.candidate,
                    course: selection.application.course,
                    selectedAt: selection.selectedAt,
                    selectedBy: selection.selectedBy,
                    application: selection.application,
                }));

            result.push({
                course,
                selectedCandidates: candidateSelections,
                totalSelected: candidateSelections.length,
            });
        }

        return result;
    }

    @Query(() => [CandidateMultipleSelections])
    async getCandidatesWithMultipleSelections(): Promise<
        CandidateMultipleSelections[]
    > {
        const selectedCandidateRepository =
            AppDataSource.getRepository(SelectedCandidate);

        // Get all selected candidates with their relationships
        const selectedCandidates = await selectedCandidateRepository.find({
            relations: [
                "application",
                "application.candidate",
                "application.course",
                "application.role",
                "selectedBy",
            ],
            order: { selectedAt: "DESC" },
        });

        // Group by candidate
        const candidateSelectionMap = new Map<
            number,
            CandidateSelectionInfo[]
        >();

        selectedCandidates.forEach((selection) => {
            const candidateId = selection.application.candidate.id;
            if (!candidateSelectionMap.has(candidateId)) {
                candidateSelectionMap.set(candidateId, []);
            }

            candidateSelectionMap.get(candidateId)!.push({
                candidate: selection.application.candidate,
                course: selection.application.course,
                selectedAt: selection.selectedAt,
                selectedBy: selection.selectedBy,
                application: selection.application,
            });
        });

        // Filter candidates with more than 3 selections
        const result: CandidateMultipleSelections[] = [];

        candidateSelectionMap.forEach((selections, candidateId) => {
            if (selections.length > 3) {
                result.push({
                    candidate: selections[0].candidate,
                    selections,
                    totalSelections: selections.length,
                });
            }
        });

        // Sort by number of selections (descending)
        result.sort((a, b) => b.totalSelections - a.totalSelections);

        return result;
    }

    @Query(() => [UnselectedCandidate])
    async getUnselectedCandidates(): Promise<UnselectedCandidate[]> {
        const userRepository = AppDataSource.getRepository(User);
        const applicationRepository = AppDataSource.getRepository(Application);
        const selectedCandidateRepository =
            AppDataSource.getRepository(SelectedCandidate);

        // Get all candidates (users with userType 'candidate')
        const candidates = await userRepository.find({
            where: { userType: UserType.CANDIDATE },
            order: { lastName: "ASC", firstName: "ASC" },
        });

        // Get all selected application IDs
        const selectedApplications = await selectedCandidateRepository.find({
            select: ["applicationId"],
        });
        const selectedApplicationIds = new Set(
            selectedApplications.map((s) => s.applicationId)
        );

        const result: UnselectedCandidate[] = [];

        for (const candidate of candidates) {
            // Get all applications for this candidate
            const applications = await applicationRepository.find({
                where: { candidateId: candidate.id },
                relations: ["course", "role"],
                order: { appliedAt: "DESC" },
            });

            // Check if any of their applications were selected
            const hasAnySelection = applications.some((app) =>
                selectedApplicationIds.has(app.id)
            );

            // If no applications were selected, add to unselected list
            if (!hasAnySelection && applications.length > 0) {
                result.push({
                    candidate,
                    applications,
                    totalApplications: applications.length,
                });
            }
        }

        return result;
    }

    @Query(() => CourseSelectedCandidatesPage)
    async getCandidatesChosenPerCoursePaginated(
        @Arg("input") input: ReportListInput
    ): Promise<CourseSelectedCandidatesPage> {
        const courseRepository = AppDataSource.getRepository(Course);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const search = input.search?.trim();

        const qb = courseRepository
            .createQueryBuilder("course")
            .orderBy("course.courseCode", "ASC");

        if (search) {
            const term = `%${search}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where("course.courseCode LIKE :term", { term })
                        .orWhere("course.courseName LIKE :term", { term })
                        .orWhere("course.semester LIKE :term", { term });
                })
            );
        }

        const [courses, totalCount] = await qb.skip(skip).take(take).getManyAndCount();

        const items: CourseSelectedCandidates[] = await Promise.all(
            courses.map(async (course) => {
                const candidateSelections = await loadSelectionsForCourse(
                    course.id
                );
                return {
                    course,
                    selectedCandidates: candidateSelections,
                    totalSelected: candidateSelections.length,
                };
            })
        );

        return paginatedResult(items, totalCount, page, pageSize);
    }

    @Query(() => CandidateMultipleSelectionsPage)
    async getCandidatesWithMultipleSelectionsPaginated(
        @Arg("input") input: ReportListInput
    ): Promise<CandidateMultipleSelectionsPage> {
        const selectedCandidateRepository =
            AppDataSource.getRepository(SelectedCandidate);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const search = input.search?.trim();

        const countQb = selectedCandidateRepository
            .createQueryBuilder("sc")
            .innerJoin("sc.application", "application")
            .innerJoin("application.candidate", "candidate")
            .select("candidate.id", "candidateId")
            .addSelect("COUNT(*)", "selectionCount")
            .groupBy("candidate.id")
            .having("COUNT(*) > 3");

        if (search) {
            const term = `%${search}%`;
            countQb.andWhere(
                new Brackets((sub) => {
                    sub.where("candidate.email LIKE :term", { term })
                        .orWhere("candidate.firstName LIKE :term", { term })
                        .orWhere("candidate.lastName LIKE :term", { term });
                })
            );
        }

        const allRows = await countQb
            .orderBy("selectionCount", "DESC")
            .getRawMany<{ candidateId: string; selectionCount: string }>();

        const totalCount = allRows.length;
        const pageRows = allRows.slice(skip, skip + take);
        const candidateIds = pageRows.map((row) => Number(row.candidateId));

        if (candidateIds.length === 0) {
            return paginatedResult([], totalCount, page, pageSize);
        }

        const selectedCandidates = await selectedCandidateRepository.find({
            relations: [
                "application",
                "application.candidate",
                "application.course",
                "application.role",
                "selectedBy",
            ],
            where: {
                application: {
                    candidateId: In(candidateIds),
                },
            },
            order: { selectedAt: "DESC" },
        });

        const candidateSelectionMap = new Map<
            number,
            CandidateSelectionInfo[]
        >();

        selectedCandidates.forEach((selection) => {
            const candidateId = selection.application.candidate.id;
            if (!candidateSelectionMap.has(candidateId)) {
                candidateSelectionMap.set(candidateId, []);
            }
            candidateSelectionMap.get(candidateId)!.push({
                candidate: selection.application.candidate,
                course: selection.application.course,
                selectedAt: selection.selectedAt,
                selectedBy: selection.selectedBy,
                application: selection.application,
            });
        });

        const items: CandidateMultipleSelections[] = candidateIds
            .map((candidateId) => {
                const selections = candidateSelectionMap.get(candidateId) ?? [];
                if (selections.length <= 3) {
                    return null;
                }
                return {
                    candidate: selections[0].candidate,
                    selections,
                    totalSelections: selections.length,
                };
            })
            .filter((item): item is CandidateMultipleSelections => item !== null);

        return paginatedResult(items, totalCount, page, pageSize);
    }

    @Query(() => UnselectedCandidatePage)
    async getUnselectedCandidatesPaginated(
        @Arg("input") input: ReportListInput
    ): Promise<UnselectedCandidatePage> {
        const userRepository = AppDataSource.getRepository(User);
        const applicationRepository = AppDataSource.getRepository(Application);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const search = input.search?.trim();

        const qb = userRepository
            .createQueryBuilder("candidate")
            .where("candidate.userType = :userType", {
                userType: UserType.CANDIDATE,
            })
            .andWhere(
                `EXISTS (
                    SELECT 1 FROM applications app
                    WHERE app.candidateId = candidate.id
                )`
            )
            .andWhere(
                `NOT EXISTS (
                    SELECT 1 FROM selected_candidates sc
                    INNER JOIN applications app ON app.id = sc.applicationId
                    WHERE app.candidateId = candidate.id
                )`
            )
            .orderBy("candidate.lastName", "ASC")
            .addOrderBy("candidate.firstName", "ASC");

        if (search) {
            const term = `%${search}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where("candidate.email LIKE :term", { term })
                        .orWhere("candidate.firstName LIKE :term", { term })
                        .orWhere("candidate.lastName LIKE :term", { term });
                })
            );
        }

        const [candidates, totalCount] = await qb
            .skip(skip)
            .take(take)
            .getManyAndCount();

        const items: UnselectedCandidate[] = await Promise.all(
            candidates.map(async (candidate) => {
                const applications = await applicationRepository.find({
                    where: { candidateId: candidate.id },
                    relations: ["course", "role"],
                    order: { appliedAt: "DESC" },
                });
                return {
                    candidate,
                    applications,
                    totalApplications: applications.length,
                };
            })
        );

        return paginatedResult(items, totalCount, page, pageSize);
    }
}
