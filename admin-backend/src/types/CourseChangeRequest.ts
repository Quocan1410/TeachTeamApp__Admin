import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { ObjectType, Field, ID, GraphQLISODateTime } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";
import { Course } from "./Course";
import { User } from "./User";

@ObjectType()
@Entity("course_change_requests")
export class CourseChangeRequest {
    @Field(() => ID)
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Field()
    @Column({ type: "varchar", length: 36 })
    courseId: string;

    @Field()
    @Column({ type: "varchar", length: 36 })
    requestedById: string;

    @Field()
    @Column({ type: "varchar", length: 20 })
    requestType: string;

    @Field(() => GraphQLJSONObject)
    @Column({ type: "json" })
    payload: Record<string, unknown>;

    @Field()
    @Column({ type: "varchar", length: 20, default: "pending" })
    status: string;

    @Field({ nullable: true })
    @Column({ type: "text", nullable: true })
    adminNote: string | null;

    @Field({ nullable: true })
    @Column({ type: "varchar", length: 36, nullable: true })
    resolvedById: string | null;

    @Field(() => GraphQLISODateTime, { nullable: true })
    @Column({ type: "datetime", nullable: true })
    resolvedAt: Date | null;

    @Field(() => GraphQLISODateTime)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => Course, { nullable: true })
    @ManyToOne(() => Course, { onDelete: "CASCADE" })
    @JoinColumn({ name: "courseId" })
    course: Course;

    @Field(() => User, { nullable: true })
    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "requestedById" })
    requestedBy: User;
}
