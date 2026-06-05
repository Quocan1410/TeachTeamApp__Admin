import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Int,
    InputType,
    Field,
    ObjectType,
    UseMiddleware,
    Ctx,
} from "type-graphql";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import {
    Announcement,
    AnnouncementAudience,
} from "../types/Announcement";
import { AppDataSource } from "../config/database";
import type { GraphQLContext } from "../utils/graphqlContext";
import { Brackets } from "typeorm";
import {
    normalizePagination,
    paginatedResult,
} from "../utils/pagination";

@InputType()
class AnnouncementListInput {
    @Field(() => Int, { defaultValue: 1 })
    page: number;

    @Field(() => Int, { defaultValue: 20 })
    pageSize: number;

    @Field({ nullable: true })
    search?: string;

    @Field(() => AnnouncementAudience, { nullable: true })
    audience?: AnnouncementAudience;

    @Field({ nullable: true })
    isActive?: boolean;
}

@ObjectType()
class AnnouncementPage {
    @Field(() => [Announcement])
    items: Announcement[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;

    @Field(() => Int)
    totalPages: number;
}

@InputType()
class AnnouncementInput {
    @Field()
    title: string;

    @Field()
    body: string;

    @Field(() => AnnouncementAudience, { nullable: true })
    audience?: AnnouncementAudience;

    @Field({ nullable: true })
    startsAt?: Date;

    @Field({ nullable: true })
    endsAt?: Date;

    @Field({ nullable: true })
    isActive?: boolean;
}

@ObjectType()
class AnnouncementResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => Announcement, { nullable: true })
    announcement?: Announcement;
}

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class AnnouncementResolver {
    @Query(() => [Announcement])
    async getAllAnnouncements(): Promise<Announcement[]> {
        const repo = AppDataSource.getRepository(Announcement);
        return repo.find({ order: { createdAt: "DESC" } });
    }

    @Query(() => AnnouncementPage)
    async getAnnouncements(
        @Arg("input") input: AnnouncementListInput
    ): Promise<AnnouncementPage> {
        const repo = AppDataSource.getRepository(Announcement);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const search = input.search?.trim();

        const qb = repo
            .createQueryBuilder("announcement")
            .orderBy("announcement.createdAt", "DESC");

        if (search) {
            const term = `%${search}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where("announcement.title LIKE :term", { term }).orWhere(
                        "announcement.body LIKE :term",
                        { term }
                    );
                })
            );
        }

        if (input.audience !== undefined) {
            qb.andWhere("announcement.audience = :audience", {
                audience: input.audience,
            });
        }

        if (input.isActive !== undefined) {
            qb.andWhere("announcement.isActive = :isActive", {
                isActive: input.isActive,
            });
        }

        const [items, totalCount] = await qb.skip(skip).take(take).getManyAndCount();

        return paginatedResult(items, totalCount, page, pageSize);
    }

    @Query(() => Announcement, { nullable: true })
    async getAnnouncementById(
        @Arg("id", () => Int) id: number
    ): Promise<Announcement | null> {
        const repo = AppDataSource.getRepository(Announcement);
        return repo.findOne({ where: { id } });
    }

    @Mutation(() => AnnouncementResponse)
    async createAnnouncement(
        @Arg("input") input: AnnouncementInput,
        @Ctx() ctx: GraphQLContext
    ): Promise<AnnouncementResponse> {
        try {
            const repo = AppDataSource.getRepository(Announcement);
            const adminId = ctx.adminUser?.id ?? null;
            const row = repo.create({
                title: input.title.trim(),
                body: input.body.trim(),
                audience: input.audience ?? AnnouncementAudience.ALL,
                startsAt: input.startsAt ?? null,
                endsAt: input.endsAt ?? null,
                isActive: input.isActive ?? true,
                createdBy: adminId ?? null,
            });
            await repo.save(row);
            return {
                success: true,
                message: "Announcement created",
                announcement: row,
            };
        } catch {
            return { success: false, message: "Failed to create announcement" };
        }
    }

    @Mutation(() => AnnouncementResponse)
    async updateAnnouncement(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: AnnouncementInput
    ): Promise<AnnouncementResponse> {
        try {
            const repo = AppDataSource.getRepository(Announcement);
            const row = await repo.findOne({ where: { id } });
            if (!row) {
                return { success: false, message: "Announcement not found" };
            }
            if (input.title !== undefined) row.title = input.title.trim();
            if (input.body !== undefined) row.body = input.body.trim();
            if (input.audience !== undefined) row.audience = input.audience;
            if (input.startsAt !== undefined) row.startsAt = input.startsAt;
            if (input.endsAt !== undefined) row.endsAt = input.endsAt;
            if (input.isActive !== undefined) row.isActive = input.isActive;
            await repo.save(row);
            return {
                success: true,
                message: "Announcement updated",
                announcement: row,
            };
        } catch {
            return { success: false, message: "Failed to update announcement" };
        }
    }

    @Mutation(() => AnnouncementResponse)
    async deleteAnnouncement(
        @Arg("id", () => Int) id: number
    ): Promise<AnnouncementResponse> {
        try {
            const repo = AppDataSource.getRepository(Announcement);
            const row = await repo.findOne({ where: { id } });
            if (!row) {
                return { success: false, message: "Announcement not found" };
            }
            await repo.remove(row);
            return { success: true, message: "Announcement deleted" };
        } catch {
            return { success: false, message: "Failed to delete announcement" };
        }
    }
}
