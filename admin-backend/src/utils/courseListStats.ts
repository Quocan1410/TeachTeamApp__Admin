import { Course } from "../types/Course";
import { ApplicationStatus } from "../types/Application";
import { AppDataSource } from "../config/database";

type RoleCountRow = { courseId: number; roleName: string; count: string };
type AppCountRow = { courseId: number; count: string };

export async function attachCourseListStats(courses: Course[]): Promise<Course[]> {
    if (courses.length === 0) {
        return courses;
    }

    const ids = courses.map((c) => c.id);
    const applicationRepository = AppDataSource.getRepository("Application");

    const [appCountRows, selectedRows] = await Promise.all([
        applicationRepository
            .createQueryBuilder("a")
            .select("a.courseId", "courseId")
            .addSelect("COUNT(*)", "count")
            .where("a.courseId IN (:...ids)", { ids })
            .groupBy("a.courseId")
            .getRawMany<AppCountRow>(),
        applicationRepository
            .createQueryBuilder("a")
            .innerJoin("a.role", "r")
            .select("a.courseId", "courseId")
            .addSelect("r.roleName", "roleName")
            .addSelect("COUNT(*)", "count")
            .where("a.courseId IN (:...ids)", { ids })
            .andWhere("a.status = :status", {
                status: ApplicationStatus.SELECTED,
            })
            .andWhere("a.isWithdrawn = :isWithdrawn", { isWithdrawn: false })
            .groupBy("a.courseId")
            .addGroupBy("r.roleName")
            .getRawMany<RoleCountRow>(),
    ]);

    const appCountMap = new Map(
        appCountRows.map((row) => [Number(row.courseId), Number(row.count)])
    );

    const selectedByCourse = new Map<number, { tutors: number; lab: number }>();
    for (const row of selectedRows) {
        const courseId = Number(row.courseId);
        const entry = selectedByCourse.get(courseId) ?? {
            tutors: 0,
            lab: 0,
        };
        if (row.roleName === "tutor") {
            entry.tutors = Number(row.count);
        } else if (row.roleName === "lab_assistant") {
            entry.lab = Number(row.count);
        }
        selectedByCourse.set(courseId, entry);
    }

    return courses.map((course) => {
        const selected = selectedByCourse.get(course.id) ?? {
            tutors: 0,
            lab: 0,
        };
        course.applicationCount = appCountMap.get(course.id) ?? 0;
        course.selectedTutors = selected.tutors;
        course.selectedLabAssistants = selected.lab;
        course.availableTutors = Math.max(0, course.maxTutors - selected.tutors);
        course.availableLabAssistants = Math.max(
            0,
            course.maxLabAssistants - selected.lab
        );
        return course;
    });
}
