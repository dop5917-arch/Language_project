import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL ?? "default@aicards.local";
const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME ?? "Default User";

async function getDefaultUser() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {
      name: DEFAULT_USER_NAME
    },
    create: {
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USER_NAME
    }
  });

  await prisma.deck.updateMany({
    where: { userId: null },
    data: { userId: user.id }
  });

  return user;
}

export async function getCurrentUser() {
  const authenticatedUser = await getAuthenticatedUser();
  if (authenticatedUser) {
    return authenticatedUser;
  }

  return getDefaultUser();
}

export async function getCurrentUserId() {
  return (await getCurrentUser()).id;
}
