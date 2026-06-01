import { Resolver, Mutation, Arg, Ctx, ObjectType, Field } from "type-graphql";
import { User, UserType } from "../types/User";
import { AppDataSource } from "../config/database";
import bcrypt from "bcryptjs";
import { signAdminToken } from "../config/jwtConfig";
import { isCanonicalAdminEmail } from "../utils/adminConfig";

@ObjectType()
class LoginResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    token?: string;

    @Field({ nullable: true })
    message?: string;

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class AuthResolver {
    @Mutation(() => LoginResponse)
    async adminLogin(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() ctx: any
    ): Promise<LoginResponse> {
        try {
            const userRepository = AppDataSource.getRepository(User);

            // Find admin user
            const user = await userRepository.findOne({
                where: { email: email.toLowerCase() },
            });

            if (!user) {
                return {
                    success: false,
                    message: "Invalid credentials",
                };
            }

            if (user.userType !== UserType.ADMIN) {
                return {
                    success: false,
                    message: "Access denied. Admin privileges required.",
                };
            }

            if (!isCanonicalAdminEmail(user.email)) {
                return {
                    success: false,
                    message: "Access denied. Use the designated system admin account.",
                };
            }

            // Check if account is blocked
            if (user.isBlocked) {
                return {
                    success: false,
                    message: "Account has been blocked.",
                };
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(
                password,
                user.password
            );
            if (!isValidPassword) {
                return {
                    success: false,
                    message: "Invalid credentials",
                };
            }

            const token = signAdminToken({
                userId: user.id,
                email: user.email,
                userType: user.userType,
            });

            // Store session info
            if (ctx.req.session) {
                ctx.req.session.userId = user.id;
                ctx.req.session.userType = user.userType;
            }

            return {
                success: true,
                token,
                message: "Login successful",
                user,
            };
        } catch (error) {
            return {
                success: false,
                message: "An error occurred during login",
            };
        }
    }

    @Mutation(() => Boolean)
    async adminLogout(@Ctx() ctx: any): Promise<boolean> {
        try {
            if (ctx.req.session) {
                ctx.req.session.destroy();
            }
            return true;
        } catch (error) {
            return false;
        }
    }
}
