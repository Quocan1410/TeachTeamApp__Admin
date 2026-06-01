import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from "typeorm";
import { ObjectType, Field, ID, Int } from "type-graphql";
import { CourseAssignment } from "./CourseAssignment";
import { Application } from "./Application";

@ObjectType()
@Entity("courses")
export class Course {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column({
        type: "varchar",
        length: 20,
        unique: true,
        nullable: false,
    })
    courseCode: string;

    @Field()
    @Column({
        type: "varchar",
        length: 255,
        nullable: false,
    })
    courseName: string;

    @Field()
    @Column({
        type: "varchar",
        length: 50,
        nullable: false,
    })
    semester: string;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    description?: string;

    @Field(() => Int)
    @Column({
        type: "int",
        default: 5,
    })
    maxTutors: number;

    @Field(() => Int)
    @Column({
        type: "int",
        default: 3,
    })
    maxLabAssistants: number;

    @Field({ nullable: true })
    @Column({
        type: "datetime",
        nullable: true,
    })
    applicationDeadline?: Date | null;

    @Field()
    @CreateDateColumn()
    createdAt: Date;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @Field(() => [CourseAssignment])
    @OneToMany(
        () => CourseAssignment,
        (courseAssignment) => courseAssignment.course
    )
    courseAssignments: CourseAssignment[];

    @Field(() => [Application])
    @OneToMany(() => Application, (application) => application.course)
    applications: Application[];

    // Position tracking fields (computed at runtime)
    @Field(() => Int, { nullable: true })
    selectedTutors?: number;

    @Field(() => Int, { nullable: true })
    selectedLabAssistants?: number;

    @Field(() => Int, { nullable: true })
    availableTutors?: number;

    @Field(() => Int, { nullable: true })
    availableLabAssistants?: number;

    // Virtual properties
    @Field()
    get displayName(): string {
        return `${this.courseCode} - ${this.courseName}`;
    }

    @Field()
    get shortDisplayName(): string {
        return `${this.courseCode} (${this.semester})`;
    }
}
