import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { ObjectType, Field, ID, Int } from "type-graphql";
import { Application } from "./Application";
import { User } from "./User";

@ObjectType()
@Entity("selected_candidates")
@Index(["applicationId"], { unique: true })
export class SelectedCandidate {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: number;

    @Field(() => Int)
    @Column({
        type: "int",
        nullable: false,
    })
    applicationId: number;

    @Field(() => Int)
    @Column({
        type: "int",
        nullable: false,
    })
    selectedById: number;

    @Field()
    @CreateDateColumn()
    selectedAt: Date;

    // Relationships
    @Field(() => Application)
    @ManyToOne(() => Application, (application) => application.selections, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "applicationId" })
    application: Application;

    @Field(() => User)
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "selectedById" })
    selectedBy: User;

    // Virtual properties
    @Field()
    get selectionKey(): string {
        return `${this.applicationId}-${this.selectedById}`;
    }
}
