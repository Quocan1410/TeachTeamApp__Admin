import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from "typeorm";
import { ObjectType, Field, ID, Int, registerEnumType } from "type-graphql";
import { User } from "./User";
import { Course } from "./Course";
import { Role } from "./Role";
import { SelectedCandidate } from "./SelectedCandidate";

export enum ApplicationStatus {
    PENDING = "pending",
    SELECTED = "selected",
    REJECTED = "rejected",
}

registerEnumType(ApplicationStatus, {
    name: "ApplicationStatus",
    description: "The status of an application",
});

@ObjectType()
@Entity("applications")
@Index(["candidateId", "courseId", "roleId"], { unique: true })
export class Application {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field(() => Int)
    @Column({
        type: "int",
        nullable: false,
    })
    candidateId: number;

    @Field(() => Int)
    @Column({
        type: "int",
        nullable: false,
    })
    courseId: number;

    @Field(() => Int)
    @Column({
        type: "int",
        nullable: false,
    })
    roleId: number;

    @Field(() => ApplicationStatus)
    @Column({
        type: "varchar",
        length: 20,
        default: ApplicationStatus.PENDING,
    })
    status: ApplicationStatus;

    @Field(() => String, { nullable: true })
    @Column({
        type: "json",
        nullable: true,
    })
    availability?: object;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    skills?: string;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    experience?: string;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    motivation?: string;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    comment?: string;

    @Field(() => Int, { nullable: true })
    @Column({
        type: "int",
        nullable: true,
    })
    commentedBy?: number;

    @Field({ nullable: true })
    @Column({
        type: "datetime",
        nullable: true,
    })
    commentedAt?: Date;

    @Field(() => Int, { nullable: true })
    @Column({
        type: "int",
        nullable: true,
    })
    rank?: number | null;

    @Field(() => Int, { nullable: true })
    @Column({
        type: "int",
        nullable: true,
    })
    rankedBy?: number | null;

    @Field({ nullable: true })
    @Column({
        type: "datetime",
        nullable: true,
    })
    rankedAt?: Date | null;

    @Field({ nullable: true })
    @Column({
        type: "varchar",
        length: 20,
        nullable: true,
    })
    rankedForCourse?: string | null;

    @Field()
    @Column({
        type: "boolean",
        default: false,
    })
    isWithdrawn: boolean;

    @Field({ nullable: true })
    @Column({
        type: "datetime",
        nullable: true,
    })
    withdrawnAt?: Date | null;

    @Field()
    @CreateDateColumn()
    appliedAt: Date;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    // Relationships
    @Field(() => User)
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "candidateId" })
    candidate: User;

    @Field(() => Course)
    @ManyToOne(() => Course, (course) => course.applications, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "courseId" })
    course: Course;

    @Field(() => Role)
    @ManyToOne(() => Role, (role) => role.applications, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "roleId" })
    role: Role;

    @Field(() => [SelectedCandidate])
    @OneToMany(
        () => SelectedCandidate,
        (selectedCandidate) => selectedCandidate.application
    )
    selections: SelectedCandidate[];

    @Field(() => User, { nullable: true })
    @ManyToOne(() => User, {
        onDelete: "SET NULL",
    })
    @JoinColumn({ name: "commentedBy" })
    commentedByUser?: User;

    @Field(() => User, { nullable: true })
    @ManyToOne(() => User, {
        onDelete: "SET NULL",
    })
    @JoinColumn({ name: "rankedBy" })
    rankedByUser?: User;

    // Virtual properties
    @Field()
    get isSelected(): boolean {
        return this.status === ApplicationStatus.SELECTED;
    }

    @Field()
    get isPending(): boolean {
        return this.status === ApplicationStatus.PENDING;
    }

    @Field()
    get isRejected(): boolean {
        return this.status === ApplicationStatus.REJECTED;
    }

    @Field()
    get applicationKey(): string {
        return `${this.candidateId}-${this.courseId}-${this.roleId}`;
    }

    @Field()
    get hasComment(): boolean {
        return !!(this.comment && this.comment.trim().length > 0);
    }

    @Field()
    get isRanked(): boolean {
        return this.rank !== null && this.rank !== undefined;
    }

    @Field()
    get canBeRanked(): boolean {
        return (
            this.status === ApplicationStatus.PENDING &&
            !this.isRejected &&
            !this.isWithdrawn
        );
    }

    @Field()
    get commentSummary(): string {
        if (!this.comment) return "";
        return this.comment.length > 50
            ? this.comment.substring(0, 50) + "..."
            : this.comment;
    }
}
