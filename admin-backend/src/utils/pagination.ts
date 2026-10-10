import { InputType, Field, Int, ObjectType } from "type-graphql";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  paginatedResult,
} from "./paginationHelpers";

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalizePagination, paginatedResult };

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  page: number;

  @Field(() => Int, { defaultValue: DEFAULT_PAGE_SIZE })
  pageSize: number;
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
