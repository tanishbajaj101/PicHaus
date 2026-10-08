import { eq, and, ne, count } from 'drizzle-orm'
import { users } from '../../../../db/schema'
import { requireAuth, normalizeUsername } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const userId = getRouterParam(event, 'id')
        const body = await readBody(event)
        const { role, name, username, instagram } = body

        if (currentUser.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        if (!userId) throw createError({ statusCode: 400, statusMessage: 'User ID required' })

        const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
        if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

        const updateData: Partial<typeof users.$inferInsert> = {}

        if (role) {
            if (!['USER', 'ADMIN'].includes(role)) throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
            if (userId === currentUser.id && role !== 'ADMIN') {
                const [adminCount] = await db.select({ value: count() }).from(users).where(eq(users.role, 'ADMIN'))
                if ((adminCount?.value ?? 0) <= 1) throw createError({ statusCode: 400, statusMessage: 'Cannot demote the last admin' })
            }
            updateData.role = role
        }

        if (name !== undefined) updateData.name = name
        if (instagram !== undefined) updateData.instagram = instagram

        if (username) {
            const normalized = normalizeUsername(username)
            if (!normalized) throw createError({ statusCode: 400, statusMessage: 'Username must be 3-32 letters, numbers, underscore, period, or hyphen' })
            const existing = await db.query.users.findFirst({ where: and(eq(users.username, normalized), ne(users.id, userId)) })
            if (existing) throw createError({ statusCode: 400, statusMessage: 'Username already in use' })
            updateData.username = normalized
        }

        const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning({
            id: users.id, name: users.name, username: users.username, instagram: users.instagram, role: users.role, createdAt: users.createdAt,
        })
        if (!updatedUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })

        return { success: true, data: { ...updatedUser, createdAt: Number(updatedUser.createdAt) } }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to update user' })
    }
})
