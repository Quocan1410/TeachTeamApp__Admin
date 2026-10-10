export type GraphQLUserTypeName = "CANDIDATE" | "LECTURER" | "ADMIN";

/** Map form values to the GraphQL UserType enum names. */
export function toGraphQLUserType(value: string): GraphQLUserTypeName {
  switch (value.trim().toLowerCase()) {
    case "lecturer":
      return "LECTURER";
    case "admin":
      return "ADMIN";
    default:
      return "CANDIDATE";
  }
}
