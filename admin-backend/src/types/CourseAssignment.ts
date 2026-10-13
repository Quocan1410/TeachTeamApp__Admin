import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { User } from "./User";
import { Course } from "./Course";

@ObjectType()
@Entity("course_assignments")
@Index(["lecturerId", "courseId"], { unique: true })
export class CourseAssignment {
    @Field(() => ID)
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Field(() => ID)
    @Column({ type: "varchar", length: 36 })
    lecturerId: string;

    @Field(() => ID)
    @Column({ type: "varchar", length: 36 })
    courseId: string;

    @Field()
    @CreateDateColumn()
    assignedAt: Date;

    // Relationships
    @Field(() => User, { nullable: true })
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "lecturerId" })
    lecturer: User;

    @Field(() => Course)
    @ManyToOne(() => Course, (course) => course.courseAssignments, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "courseId" })
    course: Course;

    // Virtual properties
    @Field()
    get assignmentKey(): string {
        return `${this.lecturerId}-${this.courseId}`;
    }
}
