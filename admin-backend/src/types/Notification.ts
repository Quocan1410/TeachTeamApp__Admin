import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { ObjectType, Field, ID, registerEnumType } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";
import { User } from "./User";

export enum NotificationType {
    APPLICATION_SUBMITTED = "application_submitted",
    APPLICATION_SELECTED = "application_selected",
    APPLICATION_REJECTED = "application_rejected",
    APPLICATION_COMMENT = "application_comment",
    APPLICATION_RESPONSE = "application_response",
    APPLICATION_WITHDRAWN = "application_withdrawn",
    CANDIDATE_BLOCKED = "candidate_blocked",
    CANDIDATE_UNBLOCKED = "candidate_unblocked",
    ACCOUNT_BLOCKED = "account_blocked",
    ACCOUNT_UNBLOCKED = "account_unblocked",
    USER_REGISTERED = "user_registered",
    COURSE_ASSIGNED = "course_assigned",
}

registerEnumType(NotificationType, {
    name: "NotificationType",
    description: "In-app notification event type",
});

@ObjectType()
@Entity("notifications")
export class Notification {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "int" })
    userId: number;

    @Field(() => NotificationType)
    @Column({ type: "varchar", length: 50 })
    type: NotificationType;

    @Field()
    @Column({ type: "varchar", length: 255 })
    title: string;

    @Field()
    @Column({ type: "text" })
    message: string;

    @Field({ nullable: true })
    @Column({ type: "varchar", length: 255, nullable: true })
    link?: string | null;

    @Field(() => GraphQLJSONObject, { nullable: true })
    @Column({ type: "json", nullable: true })
    metadata?: Record<string, unknown> | null;

    @Field()
    @Column({ type: "boolean", default: false })
    read: boolean;

    @Field()
    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: User;
}

@ObjectType()
export class NotificationListResponse {
    @Field(() => [Notification])
    notifications: Notification[];

    @Field()
    unreadCount: number;
}
