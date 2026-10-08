import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { requireAuth, hashPassword, normalizeUsername } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const body = await readBody(event)
        const { name, username, instagram, password, themePreference } = body

        const updateData: Partial<typeof users.$inferInsert> = {}

        if (name !== undefined) updateData.name = name
        if (instagram !== undefined) updateData.instagram = instagram
        if (themePreference !== undefined) updateData.themePreference = themePreference

        if (username !== undefined) {
            const normalized = normalizeUsername(username)
            if (!normalized) throw createError({ statusCode: 400, statusMessage: 'Username must be 3-32 letters, numbers, underscore, period, or hyphen' })
            if (normalized !== currentUser.username) {
                const existing = await db.query.users.findFirst({ where: eq(users.username, normalized) })
                if (existing) throw createError({ statusCode: 400, statusMessage: 'Username already in use' })
                updateData.username = normalized
            }
        }

        if (password) {
            if (password.length < 8) throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
            updateData.passwordHash = await hashPassword(password)
        }

        const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, currentUser.id)).returning({
            id: users.id, name: users.name, username: users.username, instagram: users.instagram, role: users.role, createdAt: users.createdAt, avatarPath: users.avatarPath, themePreference: users.themePreference,
        })

        if (!updatedUser) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to update profile' })
        }

        return {
            success: true,
            data: {
                ...updatedUser,
                createdAt: Number(updatedUser.createdAt),
                avatar: updatedUser.avatarPath ? `/api/assets/avatar/${updatedUser.id}` : null,
                themePreference: updatedUser.themePreference,
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update profile' })
    }
})
