import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { hashPassword, getUnixTimestamp, normalizeUsername } from '../../../utils/auth'
import { getRegistrationPolicy } from '../../../utils/registration'
import { enforceRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    try {
        enforceRateLimit(event, { key: 'auth-register', limit: 5, windowMs: 15 * 60 * 1000 })
        const policy = await getRegistrationPolicy()
        if (!policy.allowRegistration) {
            throw createError({ statusCode: 403, statusMessage: 'Public registration is disabled' })
        }

        const body = await readBody(event)
        const username = normalizeUsername(body.username)

        if (!username || !body.password) {
            throw createError({ statusCode: 400, statusMessage: 'Username (3-32 letters, numbers, underscore, period, or hyphen) and password are required' })
        }
        if (typeof body.password !== 'string' || body.password.length < 8) {
            throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
        }

        const existing = await db.query.users.findFirst({ where: eq(users.username, username) })
        if (existing) {
            throw createError({ statusCode: 409, statusMessage: 'Username is already taken' })
        }

        const passwordHash = await hashPassword(body.password)
        const now = getUnixTimestamp()

        const [user] = await db.insert(users).values({
            username,
            passwordHash,
            name: body.name,
            instagram: body.instagram,
            createdAt: now,
            updatedAt: now,
        }).returning({
            id: users.id,
            username: users.username,
            name: users.name,
            instagram: users.instagram,
            createdAt: users.createdAt,
        })

        if (!user) throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })

        return {
            success: true,
            data: { ...user, createdAt: Number(user.createdAt) },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
    }
})
