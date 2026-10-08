import { eq } from 'drizzle-orm'
import { users } from '../db/schema'

type MemberRecord = {
    passwordHash?: string | null
    googleId?: string | null
    microsoftId?: string | null
    role?: string | null
}

/**
 * Community mode is on by default; set COMMUNITY_MODE="false" to restore
 * upstream owner/collaborator-only behaviour.
 */
export function isCommunityModeEnabled(): boolean {
    return process.env.COMMUNITY_MODE !== 'false'
}

/**
 * A "member" is any signed-in account with real credentials (password, Google,
 * Microsoft) or admin role. Anonymous guest accounts created by upload share
 * links have none of these, so a share link still only opens its own album.
 */
export function isMemberRecord(user: MemberRecord | null | undefined): boolean {
    if (!isCommunityModeEnabled()) return false
    if (!user) return false
    return !!(user.passwordHash || user.googleId || user.microsoftId || user.role === 'ADMIN')
}

export async function isCommunityMember(userId: string | null | undefined): Promise<boolean> {
    if (!userId) return false
    if (!isCommunityModeEnabled()) return false

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { passwordHash: true, googleId: true, microsoftId: true, role: true },
    })

    return isMemberRecord(user)
}
