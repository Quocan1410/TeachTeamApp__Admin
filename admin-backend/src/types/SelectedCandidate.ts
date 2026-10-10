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
import { Application } from "./Application";
import { User } from "./User";

@ObjectType()
@Entity("selected_candidates")
@Index(["applicationId"], { unique: true })
export class SelectedCandidate {
    @Field(() => ID)
    @PrimaryGeneratedColumn()
    id: string;

    @Field(() => ID)
    @Column({ type: "int" })
    applicationId: string;

    @Field(() => ID)
    @Column({ type: "int" })
    selectedById: string;

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
