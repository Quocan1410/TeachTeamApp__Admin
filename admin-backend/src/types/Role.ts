import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { Application } from "./Application";

@ObjectType()
@Entity("roles")
export class Role {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column({
        type: "varchar",
        length: 50,
        unique: true,
        nullable: false,
    })
    roleName: string;

    @Field({ nullable: true })
    @Column({
        type: "text",
        nullable: true,
    })
    description?: string;

    // Relationships
    @Field(() => [Application])
    @OneToMany(() => Application, (application) => application.role)
    applications: Application[];

    // Static role constants for easy reference
    static readonly TUTOR = "tutor";
    static readonly LAB_ASSISTANT = "lab_assistant";

    // Virtual properties
    @Field()
    get isTutor(): boolean {
        return this.roleName === Role.TUTOR;
    }

    @Field()
    get isLabAssistant(): boolean {
        return this.roleName === Role.LAB_ASSISTANT;
    }
}
