import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Int,
    ObjectType,
    Field,
    InputType,
    UseMiddleware,
} from "type-graphql";
import { Brackets } from "typeorm";
import {
    normalizePagination,
    paginatedResult,
} from "../utils/pagination";
import { attachCourseListStats } from "../utils/courseListStats";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { Course } from "../types/Course";
import { CourseAssignment } from "../types/CourseAssignment";
import { User, UserType } from "../types/User";
import { ApplicationStatus } from "../types/Application";
import { AppDataSource } from "../config/database";
import { NotificationService } from "../services/NotificationService";
import { NotificationType } from "../types/Notification";
import { pubsub, SUBSCRIPTION_TOPICS } from "../config/pubsub";
import { CourseEvent } from "./SubscriptionResolver";

@InputType()
class CourseInput {
    @Field()
    courseCode: string;

    @Field()
    courseName: string;

    @Field()
    semester: string;

    @Field({ nullable: true })
    description?: string;

    @Field(() => Int)
    maxTutors: number;

    @Field(() => Int)
    maxLabAssistants: number;

    @Field({ nullable: true })
    applicationDeadline?: Date;
}

@InputType()
class CourseListInput {
    @Field(() => Int, { defaultValue: 1 })
    page: number;

    @Field(() => Int, { defaultValue: 20 })
    pageSize: number;

    @Field({ nullable: true })
    search?: string;
}

@ObjectType()
class CoursePage {
    @Field(() => [Course])
    items: Course[];

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
class CourseResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => Course, { nullable: true })
    course?: Course;
}

@ObjectType()
class AssignmentResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => CourseAssignment, { nullable: true })
    assignment?: CourseAssignment;
}

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class CourseResolver {
    @Query(() => [Course])
    async getAllCourses(): Promise<Course[]> {
        const courseRepository = AppDataSource.getRepository(Course);
        const applicationRepository =
            AppDataSource.getRepository("Application");

        const courses = await courseRepository.find({
            relations: [
                "courseAssignments",
                "courseAssignments.lecturer",
                "applications",
                "applications.candidate",
            ],
            order: { createdAt: "DESC" },
        });

        // Calculate available positions for each course
        const coursesWithAvailablePositions = await Promise.all(
            courses.map(async (course) => {
                // Count selected applications for tutors
                const selectedTutors = await applicationRepository.count({
                    where: {
                        courseId: course.id,
                        status: ApplicationStatus.SELECTED,
                        role: { roleName: "tutor" },
                    },
                    relations: ["role"],
                });

                // Count selected applications for lab assistants
                const selectedLabAssistants = await applicationRepository.count(
                    {
                        where: {
                            courseId: course.id,
                            status: ApplicationStatus.SELECTED,
                            role: { roleName: "lab_assistant" },
                        },
                        relations: ["role"],
                    }
                );

                // Calculate available positions
                const availableTutors = Math.max(
                    0,
                    course.maxTutors - selectedTutors
                );
                const availableLabAssistants = Math.max(
                    0,
                    course.maxLabAssistants - selectedLabAssistants
                );

                // Add the available positions as computed properties
                (course as any).selectedTutors = selectedTutors;
                (course as any).selectedLabAssistants = selectedLabAssistants;
                (course as any).availableTutors = availableTutors;
                (course as any).availableLabAssistants = availableLabAssistants;

                return course;
            })
        );

        return coursesWithAvailablePositions;
    }

    @Query(() => CoursePage)
    async getCourses(@Arg("input") input: CourseListInput): Promise<CoursePage> {
        const courseRepository = AppDataSource.getRepository(Course);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const search = input.search?.trim();

        const qb = courseRepository
            .createQueryBuilder("course")
            .leftJoinAndSelect("course.courseAssignments", "assignment")
            .leftJoinAndSelect("assignment.lecturer", "lecturer")
            .orderBy("course.createdAt", "DESC");

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
        const items = await attachCourseListStats(courses);

        return paginatedResult(items, totalCount, page, pageSize);
    }

    @Query(() => Course, { nullable: true })
    async getCourseById(
        @Arg("id", () => Int) id: number
    ): Promise<Course | null> {
        const courseRepository = AppDataSource.getRepository(Course);
        return await courseRepository.findOne({
            where: { id },
            relations: [
                "courseAssignments",
                "courseAssignments.lecturer",
                "applications",
            ],
        });
    }

    @Query(() => [CourseAssignment])
    async getAllCourseAssignments(): Promise<CourseAssignment[]> {
        const assignmentRepository =
            AppDataSource.getRepository(CourseAssignment);
        return await assignmentRepository.find({
            relations: ["lecturer", "course"],
            order: { assignedAt: "DESC" },
        });
    }

    @Query(() => [User])
    async getUnassignedLecturers(
        @Arg("courseId", () => Int, { nullable: true }) courseId?: number
    ): Promise<User[]> {
        const userRepository = AppDataSource.getRepository(User);

        if (courseId) {
            // Check if this course already has a lecturer assigned
            const assignmentRepository =
                AppDataSource.getRepository(CourseAssignment);
            const existingAssignment = await assignmentRepository.findOne({
                where: { courseId },
            });

            // If course already has a lecturer, return empty array
            if (existingAssignment) {
                return [];
            }
        }

        // Return all lecturers if course has no lecturer assigned
        return await userRepository.find({
            where: { userType: UserType.LECTURER },
            order: { createdAt: "DESC" },
        });
    }

    @Mutation(() => CourseResponse)
    async createCourse(
        @Arg("input") input: CourseInput
    ): Promise<CourseResponse> {
        try {
            const courseRepository = AppDataSource.getRepository(Course);

            // Check if course code already exists
            const existingCourse = await courseRepository.findOne({
                where: { courseCode: input.courseCode },
            });

            if (existingCourse) {
                return {
                    success: false,
                    message: "Course code already exists",
                };
            }

            const course = courseRepository.create(input);
            await courseRepository.save(course);

            // Publish real-time event for course creation
            const courseEvent: CourseEvent = {
                courseId: course.id,
                action: "created",
                timestamp: new Date().toISOString(),
                message: `Course created: ${course.courseCode} - ${course.courseName}`,
            };

            await pubsub.publish(SUBSCRIPTION_TOPICS.COURSE_CREATED, {
                courseUpdates: courseEvent,
            });

            return {
                success: true,
                message: "Course created successfully",
                course,
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to create course",
            };
        }
    }

    @Mutation(() => CourseResponse)
    async updateCourse(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: CourseInput
    ): Promise<CourseResponse> {
        try {
            const courseRepository = AppDataSource.getRepository(Course);
            const course = await courseRepository.findOne({ where: { id } });

            if (!course) {
                return {
                    success: false,
                    message: "Course not found",
                };
            }

            // Check if course code already exists (excluding current course)
            const existingCourse = await courseRepository.findOne({
                where: { courseCode: input.courseCode },
            });

            if (existingCourse && existingCourse.id !== id) {
                return {
                    success: false,
                    message: "Course code already exists",
                };
            }

            Object.assign(course, input);
            await courseRepository.save(course);

            // Publish real-time event for course update
            const courseEvent: CourseEvent = {
                courseId: course.id,
                action: "updated",
                timestamp: new Date().toISOString(),
                message: `Course updated: ${course.courseCode} - ${course.courseName}`,
            };

            await pubsub.publish(SUBSCRIPTION_TOPICS.COURSE_UPDATED, {
                courseUpdates: courseEvent,
            });

            return {
                success: true,
                message: "Course updated successfully",
                course,
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to update course",
            };
        }
    }

    @Mutation(() => CourseResponse)
    async deleteCourse(
        @Arg("id", () => Int) id: number
    ): Promise<CourseResponse> {
        try {
            const courseRepository = AppDataSource.getRepository(Course);
            const course = await courseRepository.findOne({
                where: { id },
                relations: ["courseAssignments", "applications"],
            });

            if (!course) {
                return {
                    success: false,
                    message: "Course not found",
                };
            }

            // Check if there are active applications
            const activeApplications =
                course.applications?.filter(
                    (app) =>
                        app.status === ApplicationStatus.PENDING ||
                        app.status === ApplicationStatus.SELECTED
                ) || [];

            if (activeApplications.length > 0) {
                return {
                    success: false,
                    message: `Cannot delete course. There are ${activeApplications.length} active application(s). Please handle these applications first.`,
                };
            }

            // Store course info before deletion for the event message
            const courseInfo = {
                id: course.id,
                courseCode: course.courseCode,
                courseName: course.courseName,
            };

            // The database cascade rules will handle the deletion of:
            // - Course assignments (due to onDelete: "CASCADE" in CourseAssignment entity)
            // - Applications (due to onDelete: "CASCADE" in Application entity)
            await courseRepository.remove(course);

            // Publish real-time event for course deletion
            const courseEvent: CourseEvent = {
                courseId: courseInfo.id,
                action: "deleted",
                timestamp: new Date().toISOString(),
                message: `Course deleted: ${courseInfo.courseCode} - ${courseInfo.courseName}`,
            };

            await pubsub.publish(SUBSCRIPTION_TOPICS.COURSE_DELETED, {
                courseUpdates: courseEvent,
            });

            return {
                success: true,
                message:
                    "Course deleted successfully. All related assignments and applications have been removed.",
            };
        } catch (error) {
            // Check if it's a foreign key constraint error
            if (error.message.includes("foreign key constraint")) {
                return {
                    success: false,
                    message:
                        "Cannot delete course due to existing references. Please remove all related data first.",
                };
            }

            return {
                success: false,
                message: "Failed to delete course",
            };
        }
    }

    @Mutation(() => AssignmentResponse)
    async assignLecturerToCourse(
        @Arg("lecturerId", () => Int) lecturerId: number,
        @Arg("courseId", () => Int) courseId: number
    ): Promise<AssignmentResponse> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const courseRepository = AppDataSource.getRepository(Course);
            const assignmentRepository =
                AppDataSource.getRepository(CourseAssignment);

            // Verify lecturer exists and is a lecturer
            const lecturer = await userRepository.findOne({
                where: { id: lecturerId, userType: UserType.LECTURER },
            });

            if (!lecturer) {
                return {
                    success: false,
                    message: "Lecturer not found",
                };
            }

            // Verify course exists
            const course = await courseRepository.findOne({
                where: { id: courseId },
            });
            if (!course) {
                return {
                    success: false,
                    message: "Course not found",
                };
            }

            // Check if assignment already exists
            const existingAssignment = await assignmentRepository.findOne({
                where: { lecturerId, courseId },
            });

            if (existingAssignment) {
                return {
                    success: false,
                    message: "Lecturer is already assigned to this course",
                };
            }

            const assignment = assignmentRepository.create({
                lecturerId,
                courseId,
            });

            await assignmentRepository.save(assignment);

            // Load the assignment with relations
            const savedAssignment = await assignmentRepository.findOne({
                where: { id: assignment.id },
                relations: ["lecturer", "course"],
            });

            await NotificationService.create({
                userId: lecturerId,
                type: NotificationType.COURSE_ASSIGNED,
                title: "Course assignment",
                message: `You have been assigned to ${course.courseCode} - ${course.courseName}`,
                link: "/lecturer",
                metadata: {
                    courseId: course.id,
                    lecturerId,
                },
            });

            return {
                success: true,
                message: "Lecturer assigned to course successfully",
                assignment: savedAssignment!,
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to assign lecturer to course",
            };
        }
    }

    @Mutation(() => AssignmentResponse)
    async removeLecturerFromCourse(
        @Arg("lecturerId", () => Int) lecturerId: number,
        @Arg("courseId", () => Int) courseId: number
    ): Promise<AssignmentResponse> {
        try {
            const assignmentRepository =
                AppDataSource.getRepository(CourseAssignment);

            const assignment = await assignmentRepository.findOne({
                where: { lecturerId, courseId },
                relations: ["lecturer", "course"],
            });

            if (!assignment) {
                return {
                    success: false,
                    message: "Assignment not found",
                };
            }

            await assignmentRepository.remove(assignment);

            return {
                success: true,
                message: "Lecturer removed from course successfully",
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to remove lecturer from course",
            };
        }
    }
}
