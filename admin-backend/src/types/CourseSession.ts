import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { ObjectType, Field, ID, Int } from "type-graphql";
import { Course } from "./Course";

@ObjectType()
@Entity("course_sessions")
export class CourseSession {
    @Field(() => ID)
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Field()
    @Column({ type: "varchar", length: 36 })
    courseId: string;

    @Field()
    @Column({ type: "varchar", length: 20 })
    sessionType: string;

    @Field(() => Int)
    @Column({ type: "tinyint" })
    dayOfWeek: number;

    @Field()
    @Column({ type: "varchar", length: 8 })
    startTime: string;

    @Field()
    @Column({ type: "varchar", length: 8 })
    endTime: string;

    @Field({ nullable: true })
    @Column({ type: "varchar", length: 120, nullable: true })
    location: string | null;

    @Field(() => Int, { nullable: true })
    @Column({ type: "int", nullable: true })
    capacity: number | null;

    @Field(() => Int)
    @Column({ type: "int", default: 0 })
    sortOrder: number;

    @Field()
    @CreateDateColumn()
    createdAt: Date;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Course, { onDelete: "CASCADE" })
    @JoinColumn({ name: "courseId" })
    course: Course;
}
