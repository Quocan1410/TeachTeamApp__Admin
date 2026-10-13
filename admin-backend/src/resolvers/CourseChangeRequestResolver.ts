import {
    Arg,
    Ctx,
    ID,
    Mutation,
    Query,
    Resolver,
    UseMiddleware,
} from "type-graphql";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { AppDataSource } from "../config/database";
import { CourseChangeRequest } from "../types/CourseChangeRequest";
import { Course } from "../types/Course";
import { CourseSession } from "../types/CourseSession";
import { GraphQLContext } from "../utils/graphqlContext";

@Resolver()
export class CourseChangeRequestResolver {
    private requestRepository = AppDataSource.getRepository(CourseChangeRequest);
    private courseRepository = AppDataSource.getRepository(Course);
    private sessionRepository = AppDataSource.getRepository(CourseSession);

    @Query(() => [CourseChangeRequest])
    @UseMiddleware(AdminAuthMiddleware)
    async getPendingCourseChangeRequests(): Promise<CourseChangeRequest[]> {
        return this.requestRepository.find({
            where: { status: "pending" },
            relations: ["course", "requestedBy"],
            order: { createdAt: "DESC" },
        });
    }

    @Mutation(() => Course)
    @UseMiddleware(AdminAuthMiddleware)
    async setCoursePublished(
        @Arg("courseId", () => ID) courseId: string,
        @Arg("isPublished") isPublished: boolean
    ): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
        });
        if (!course) {
            throw new Error("Course not found");
        }
        course.isPublished = isPublished;
        return this.courseRepository.save(course);
    }

    @Mutation(() => CourseChangeRequest)
    @UseMiddleware(AdminAuthMiddleware)
    async resolveCourseChangeRequest(
        @Arg("requestId", () => ID) requestId: string,
        @Arg("approve") approve: boolean,
        @Arg("adminNote", { nullable: true }) adminNote: string | null,
        @Ctx() ctx: GraphQLContext
    ): Promise<CourseChangeRequest> {
        const request = await this.requestRepository.findOne({
            where: { id: requestId },
            relations: ["course"],
        });
        if (!request || request.status !== "pending") {
            throw new Error("Pending request not found");
        }

        const course = await this.courseRepository.findOne({
            where: { id: request.courseId },
        });
        if (!course) {
            throw new Error("Course not found");
        }

        if (approve) {
            const payload = request.payload || {};
            if (request.requestType === "content") {
                if (typeof payload.description === "string") {
                    course.description = payload.description;
                }
                await this.courseRepository.save(course);
            } else if (request.requestType === "capacity") {
                if (typeof payload.maxTutors === "number") {
                    course.maxTutors = payload.maxTutors;
                }
                if (typeof payload.maxLabAssistants === "number") {
                    course.maxLabAssistants = payload.maxLabAssistants;
                }
                if (typeof payload.studentsPerClass === "number") {
                    course.studentsPerClass = payload.studentsPerClass;
                }
                await this.courseRepository.save(course);
            } else if (request.requestType === "schedule") {
                const sessions = Array.isArray(payload.sessions)
                    ? payload.sessions
                    : [];
                await this.sessionRepository.delete({ courseId: course.id });
                const rows = sessions.map((row: any, index: number) =>
                    this.sessionRepository.create({
                        courseId: course.id,
                        sessionType: row.sessionType,
                        dayOfWeek: Number(row.dayOfWeek),
                        startTime: String(row.startTime),
                        endTime: String(row.endTime),
                        location: row.location ?? null,
                        capacity:
                            row.capacity == null ? null : Number(row.capacity),
                        sortOrder: index,
                    })
                );
                if (rows.length) {
                    await this.sessionRepository.save(rows);
                }
            }
            request.status = "approved";
        } else {
            request.status = "rejected";
        }

        request.adminNote = adminNote?.trim() || null;
        request.resolvedAt = new Date();
        request.resolvedById = ctx.adminUser?.id ?? ctx.user?.id ?? null;
        return this.requestRepository.save(request);
    }
}
