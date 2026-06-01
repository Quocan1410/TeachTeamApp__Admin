export type Honorific = "Mr." | "Ms." | "Mrs." | "Dr." | "Prof.";

export type PersonLike = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  userType?: string | null;
  honorific?: string | null;
};

const VALID_HONORIFICS = new Set<Honorific>([
  "Mr.",
  "Ms.",
  "Mrs.",
  "Dr.",
  "Prof.",
]);

function hasExistingHonorific(name: string): boolean {
  return /^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s/i.test(name.trim());
}

function normalizeHonorific(value?: string | null): Honorific | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim() as Honorific;
  return VALID_HONORIFICS.has(trimmed) ? trimmed : null;
}

export function joinPersonName(
  person: PersonLike,
  fallback = ""
): string {
  const name = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || person.email?.trim() || fallback;
}

export function inferHonorific(person: PersonLike): Honorific {
  const stored = normalizeHonorific(person.honorific);
  if (stored) return stored;
  if (person.userType === "lecturer") return "Dr.";
  return "Mr.";
}

export function formatPersonDisplayName(
  person: PersonLike,
  fallback = "User"
): string {
  const base = joinPersonName(person, fallback);
  if (hasExistingHonorific(base)) return base;
  return `${inferHonorific(person)} ${base}`;
}

/** @deprecated Prefer formatPersonDisplayName */
export const formatHonorificName = formatPersonDisplayName;

export function getUserDisplayName(user: PersonLike, fallback = "User"): string {
  return formatPersonDisplayName(user, fallback);
}

export function formatCandidateDisplayName(
  person: PersonLike,
  fallback = "Applicant"
): string {
  return formatPersonDisplayName(
    { ...person, userType: person.userType ?? "candidate" },
    fallback
  );
}

export function formatLecturerDisplayName(
  person: PersonLike,
  fallback = "Lecturer"
): string {
  return formatPersonDisplayName(
    { ...person, userType: "lecturer" },
    fallback
  );
}

export function splitDisplayName(displayName: string): {
  leading: string;
  rest: string;
} {
  const match = displayName.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+(.+)$/);
  if (match) {
    return { leading: match[1], rest: match[2] };
  }

  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { leading: parts[0] ?? "", rest: "" };
  }

  return { leading: parts[0], rest: parts.slice(1).join(" ") };
}

export function formatApplicationApplicantDisplayName(
  application: { candidate?: PersonLike | null },
  authUser?: PersonLike | null
): string | null {
  if (application.candidate?.firstName || application.candidate?.lastName) {
    const name = formatCandidateDisplayName(application.candidate);
    if (name !== "Applicant") return name;
  }
  if (authUser?.firstName || authUser?.lastName) {
    const name = formatCandidateDisplayName({
      ...authUser,
      userType: authUser.userType ?? "candidate",
    });
    if (name !== "Applicant") return name;
  }
  return null;
}
