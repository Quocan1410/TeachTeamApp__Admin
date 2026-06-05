import { InputType, Field, Int, ObjectType } from "type-graphql";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

@InputType()
export class PaginationInput {
    @Field(() => Int, { defaultValue: 1 })
    page: number;

    @Field(() => Int, { defaultValue: DEFAULT_PAGE_SIZE })
    pageSize: number;
}

export function normalizePagination(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
): { skip: number; take: number; page: number; pageSize: number } {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
    return {
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        page: safePage,
        pageSize: safeSize,
    };
}

export function paginatedResult<T>(
    items: T[],
    totalCount: number,
    page: number,
    pageSize: number
) {
    return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
}

export function createPaginatedType<TItem>(
    itemClass: new () => TItem,
    name: string
) {
    @ObjectType(`${name}Page`)
    class PaginatedResult {
        @Field(() => [itemClass])
        items: TItem[];

        @Field(() => Int)
        totalCount: number;

        @Field(() => Int)
        page: number;

        @Field(() => Int)
        pageSize: number;

        @Field(() => Int)
        totalPages: number;
    }

    return PaginatedResult;
}
