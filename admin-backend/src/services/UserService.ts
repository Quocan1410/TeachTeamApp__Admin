import bcrypt from "bcryptjs";
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/database";
import { User, UserType } from "../types/User";
import { UserSecurityAnswer } from "../types/UserSecurityAnswer";
import { NotificationService } from "./NotificationService";
import { NotificationType } from "../types/Notification";
import { ADMIN_CREATED_USER_SECURITY_ANSWERS } from "../config/securityQuestions";

export interface CreateUserPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    honorific?: string | null;
}

export interface UpdateUserPayload {
    firstName?: string;
    lastName?: string;
    userType?: UserType;
}

export type UserServiceResult = {
    success: boolean;
    message: string;
    user?: User;
};

const BCRYPT_ROUNDS = 10;

const ALLOWED_HONORIFICS = new Set([
    "Mr.",
    "Ms.",
    "Mrs.",
    "Dr.",
    "Prof.",
]);

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const expectedDomainForType = (userType: UserType): string | null => {
    if (userType === UserType.CANDIDATE) return "@candidate.edu.au";
    if (userType === UserType.LECTURER) return "@lecturer.edu.au";
    return null;
};

export class UserService {
    static async createUser(
        payload: CreateUserPayload
    ): Promise<UserServiceResult> {
        const userRepository = AppDataSource.getRepository(User);
        const answerRepository = AppDataSource.getRepository(UserSecurityAnswer);

        const email = normalizeEmail(payload.email);
        const firstName = payload.firstName.trim();
        const lastName = payload.lastName.trim();

        if (payload.userType === UserType.ADMIN) {
            return {
                success: false,
                message: "Admin accounts cannot be created from this form",
            };
        }

        const expectedDomain = expectedDomainForType(payload.userType);
        if (expectedDomain && !email.endsWith(expectedDomain)) {
            return {
                success: false,
                message: `Email must end with ${expectedDomain} for ${payload.userType} accounts`,
            };
        }

        const honorific = payload.honorific?.trim() || null;
        if (!honorific || !ALLOWED_HONORIFICS.has(honorific)) {
            return {
                success: false,
                message: "Please select a valid title",
            };
        }

        const existing = await userRepository.findOne({ where: { email } });
        if (existing) {
            return {
                success: false,
                message: existing.deletedAt
                    ? "This email belonged to a deleted account and cannot be reused"
                    : "A user with this email already exists",
            };
        }

        const passwordHash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
        const newUser = userRepository.create({
            email,
            password: passwordHash,
            firstName,
            lastName,
            honorific,
            userType: payload.userType,
            isBlocked: false,
        });

        const savedUser = await userRepository.save(newUser);

        try {
            const hashedAnswers = await Promise.all(
                ADMIN_CREATED_USER_SECURITY_ANSWERS.map(async (row) => ({
                    questionId: row.questionId,
                    answerHash: await bcrypt.hash(
                        row.answer.trim().toLowerCase(),
                        BCRYPT_ROUNDS
                    ),
                }))
            );
            await answerRepository.save(
                hashedAnswers.map((row) =>
                    answerRepository.create({
                        userId: savedUser.id,
                        questionId: row.questionId,
                        answerHash: row.answerHash,
                    })
                )
            );
        } catch {
            await userRepository.delete({ id: savedUser.id });
            return {
                success: false,
                message: "Unable to save default security answers",
            };
        }

        await NotificationService.notifyAdmins({
            type: NotificationType.USER_REGISTERED,
            title: "New user created by admin",
            message: `${savedUser.firstName} ${savedUser.lastName} (${savedUser.email}) was created as ${savedUser.userType}`,
            link: "/dashboard/users",
            metadata: {
                userId: savedUser.id,
                userType: savedUser.userType,
            },
        });

        return {
            success: true,
            message:
                "User created successfully. Default security answers: Melbourne, Demo School, TeachTeam Guide, Demo.",
            user: savedUser,
        };
    }

    static async updateUser(
        id: number,
        payload: UpdateUserPayload,
        adminUserId?: number
    ): Promise<UserServiceResult> {
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({
            where: { id, deletedAt: IsNull() },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        if (adminUserId && adminUserId === id) {
            return {
                success: false,
                message: "You cannot edit your own account here",
            };
        }

        if (user.userType === UserType.ADMIN) {
            return {
                success: false,
                message: "Admin accounts cannot be edited",
            };
        }

        if (payload.firstName !== undefined) {
            const firstName = payload.firstName.trim();
            if (firstName.length < 1) {
                return { success: false, message: "First name is required" };
            }
            user.firstName = firstName;
        }

        if (payload.lastName !== undefined) {
            const lastName = payload.lastName.trim();
            if (lastName.length < 1) {
                return { success: false, message: "Last name is required" };
            }
            user.lastName = lastName;
        }

        if (payload.userType !== undefined) {
            if (
                payload.userType !== UserType.CANDIDATE &&
                payload.userType !== UserType.LECTURER
            ) {
                return {
                    success: false,
                    message: "User type must be candidate or lecturer",
                };
            }
            user.userType = payload.userType;
        }

        await userRepository.save(user);

        return {
            success: true,
            message: "User updated successfully",
            user,
        };
    }
}
