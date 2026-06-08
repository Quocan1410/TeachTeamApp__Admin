import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { User } from "./User";

@Entity("user_security_answers")
@Index(["userId", "questionId"], { unique: true })
export class UserSecurityAnswer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "int" })
    userId: number;

    @Column({ type: "varchar", length: 32 })
    questionId: string;

    @Column({ type: "varchar", length: 255 })
    answerHash: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user: User;
}
