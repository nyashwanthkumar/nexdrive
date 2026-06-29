import type { TeamMembership } from "./types";

export function roleTitle(role?: string | null) {
  if (role === "org:admin" || role === "admin") return "Admin";
  if (role === "org:member" || role === "member") return "Member";
  return "Owner";
}

export function memberName(member: TeamMembership) {
  const userData = member.publicUserData;
  const fullName = [userData?.firstName, userData?.lastName].filter(Boolean).join(" ");
  return fullName || userData?.username || userData?.identifier || "Member";
}

export function memberInitial(member: TeamMembership) {
  return memberName(member).trim().charAt(0).toUpperCase() || "N";
}

export function formatJoinDate(value?: Date | number | string) {
  if (!value) return "Recently joined";
  return `Joined ${new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}
