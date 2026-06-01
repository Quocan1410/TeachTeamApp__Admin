import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { ObjectType, Field, ID, Int, registerEnumType } from "type-graphql";

export enum AnnouncementAudience {
    ALL = "all",
    CANDIDATE = "candidate",
    LECTURER = "lecturer",
}

registerEnumType(AnnouncementAudience, {
    name: "AnnouncementAudience",
    description: "Who can see the announcement on the main app",
});

@ObjectType()
@Entity("announcements")
export class Announcement {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column({ type: "varchar", length: 200 })
    title: string;

    @Field()
    @Column({ type: "text" })
    body: string;

    @Field(() => AnnouncementAudience)
    @Column({
        type: "varchar",
        length: 20,
        default: AnnouncementAudience.ALL,
    })
    audience: AnnouncementAudience;

    @Field({ nullable: true })
    @Column({ type: "datetime", nullable: true })
    startsAt?: Date | null;

    @Field({ nullable: true })
    @Column({ type: "datetime", nullable: true })
    endsAt?: Date | null;

    @Field()
    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @Field(() => Int, { nullable: true })
    @Column({ type: "int", nullable: true })
    createdBy?: number | null;

    @Field()
    @CreateDateColumn()
    createdAt: Date;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;
}
