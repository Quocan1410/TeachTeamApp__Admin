import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from "typeorm";
import { ObjectType, Field, ID, registerEnumType } from "type-graphql";
import { CourseAssignment } from "./CourseAssignment";
import { Application } from "./Application";
import { SelectedCandidate } from "./SelectedCandidate";

export enum UserType {
    CANDIDATE = "candidate",
    LECTURER = "lecturer",
    ADMIN = "admin",
}

registerEnumType(UserType, {
    name: "UserType",
    description: "The type of user in the system",
});

@ObjectType()
@Entity("users")
export class User {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column({
        type: "varchar",
        length: 255,
        unique: true,
        nullable: false,
    })
    email: string;

    @Column({
        type: "varchar",
        length: 255,
        nullable: false,
    })
    password: string;

    @Field()
    @Column({
        type: "varchar",
        length: 100,
        nullable: false,
    })
    firstName: string;

    @Field()
    @Column({
        type: "varchar",
        length: 100,
        nullable: false,
    })
    lastName: string;

    @Field({ nullable: true })
    @Column({
        type: "varchar",
        length: 10,
        nullable: true,
    })
    honorific: string | null;

    @Field(() => UserType)
    @Column({
        type: "varchar",
        length: 20,
        nullable: false,
    })
    userType: UserType;

    @Field()
    @Column({
        type: "boolean",
        default: false,
    })
    isBlocked: boolean;

    @Field({ nullable: true })
    @Column({
        type: "varchar",
        length: 512,
        nullable: true,
    })
    avatarUrl: string | null;

    @Field()
    @CreateDateColumn()
    createdAt: Date;

    @Field()
    @UpdateDateColumn()
    updatedAt: Date;

    @Column({
        type: "datetime",
        precision: 6,
        nullable: true,
    })
    deletedAt: Date | null;

    // Relationships
    @Field(() => [CourseAssignment])
    @OneToMany(
        () => CourseAssignment,
        (courseAssignment) => courseAssignment.lecturer
    )
    courseAssignments: CourseAssignment[];

    @Field(() => [Application])
    @OneToMany(() => Application, (application) => application.candidate)
    applications: Application[];

    @Field(() => [SelectedCandidate])
    @OneToMany(
        () => SelectedCandidate,
        (selectedCandidate) => selectedCandidate.selectedBy
    )
    candidateSelections: SelectedCandidate[];

    // Virtual properties
    @Field()
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    @Field()
    get isCandidate(): boolean {
        return this.userType === UserType.CANDIDATE;
    }

    @Field()
    get isLecturer(): boolean {
        return this.userType === UserType.LECTURER;
    }

    @Field()
    get isAdmin(): boolean {
        return this.userType === UserType.ADMIN;
    }
}
