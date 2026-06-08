import { DataSource } from "typeorm";
import { User, UserType } from "../types/User";
import { Course } from "../types/Course";
import { Role } from "../types/Role";
import { CourseAssignment } from "../types/CourseAssignment";
import { Application } from "../types/Application";
import { SelectedCandidate } from "../types/SelectedCandidate";
import { Notification } from "../types/Notification";
import { Announcement } from "../types/Announcement";
import { UserSecurityAnswer } from "../types/UserSecurityAnswer";
import bcrypt from "bcryptjs";
import { getAdminEmail, getAdminSeedPassword } from "../utils/adminConfig";
import { loadAdminRepoEnv } from "./loadEnv";

loadAdminRepoEnv();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
    synchronize: false, // Don't auto-create tables in admin backend
    logging: process.env.NODE_ENV === "development",
    entities: [
        User,
        Course,
        Role,
        CourseAssignment,
        Application,
        SelectedCandidate,
        Notification,
        Announcement,
        UserSecurityAnswer,
    ],
    // Connection options for Cloud MySQL
    extra: {
        charset: "utf8mb4_unicode_ci",
        connectTimeout: 60000,
    },
});

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();

        // Seed admin user
        await seedAdminUser();
    } catch (error) {
        throw error;
    }
};

const seedAdminUser = async () => {
    try {
        const userRepository = AppDataSource.getRepository(User);
        const adminEmail = getAdminEmail();
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(
            getAdminSeedPassword(),
            saltRounds
        );

        const allAdmins = await userRepository.find({
            where: { userType: UserType.ADMIN },
        });

        for (const row of allAdmins) {
            if (row.email.toLowerCase() !== adminEmail) {
                await userRepository.remove(row);
            }
        }

        let admin = await userRepository.findOne({
            where: { email: adminEmail },
        });

        if (!admin) {
            admin = userRepository.create({
                email: adminEmail,
                password: hashedPassword,
                firstName: "System",
                lastName: "Administrator",
                userType: UserType.ADMIN,
                isBlocked: false,
            });
            await userRepository.save(admin);
            return;
        }

        admin.userType = UserType.ADMIN;
        admin.isBlocked = false;
        if (!admin.firstName) admin.firstName = "System";
        if (!admin.lastName) admin.lastName = "Administrator";
        await userRepository.save(admin);
    } catch (error) {
        // Silent error handling for production
    }
};
