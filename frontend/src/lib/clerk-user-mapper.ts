export type UpsertAppUserInput = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
};

/** Minimal Clerk user fields we read (matches `currentUser()`). */
export type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status: string } | null;
  }>;
  primaryEmailAddress?: { emailAddress: string } | null;
};

export function clerkUserToUpsertInput(user: ClerkUserLike): UpsertAppUserInput {
  const primary =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses?.find((e) => e.verification?.status === "verified")
      ?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    "";

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "User";

  const email = primary || `${user.id}@users.clerk.local`;

  return {
    id: user.id,
    name,
    email,
    imageUrl: user.imageUrl ?? null,
  };
}
