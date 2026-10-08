import { eq } from 'drizzle-orm'
import { users } from '../../../db/schema'
import { verifyPassword, createAccessToken } from '../../../utils/auth'
import { enforceRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
    try {
        enforceRateLimit(event, { key: 'auth-login', limit: 10, windowMs: 15 * 60 * 1000 })
        const body = await readBody(event)
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''

        if (!username || !body.password) {
            throw createError({ statusCode: 400, statusMessage: 'Username and password are required' })
        }

        const user = await db.query.users.findFirst({ where: eq(users.username, username) })

        if (!user || !user.passwordHash) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
        }

        const isValid = await verifyPassword(user.passwordHash, body.password)
        if (!isValid) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
        }

        const accessToken = await createAccessToken(user.id)

        return {
            success: true,
            message: 'Login successful',
            data: { accessToken, id: user.id, username: user.username, name: user.name, instagram: user.instagram },
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to login' })
    }
})
