import {
    Resolver,
    Query,
    ObjectType,
    Field,
    Int,
    UseMiddleware,
} from "type-graphql";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { User, UserType } from "../types/User";
import { Course } from "../types/Course";
import { Application } from "../types/Application";
import { SelectedCandidate } from "../types/SelectedCandidate";
import { AppDataSource } from "../config/database";

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

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class ReportResolver {
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
}
