import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { photos, shareLinks } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.id, id),
        with: { album: { columns: { ownerId: true } } },
    })
    if (!link || !link.albumId || !link.photoIds?.length) {
        throw createError({ statusCode: 404, statusMessage: 'Picture group not found' })
    }
    if (link.album?.ownerId !== user.id && user.role !== 'ADMIN') {
        throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 200)
    const skip = (page - 1) * limit
    const search = typeof query.search === 'string' ? query.search.trim() : ''
    const where = and(
        eq(photos.albumId, link.albumId),
        search ? or(ilike(photos.originalName, `%${search}%`), ilike(photos.filename, `%${search}%`)) : undefined,
    )

    const [rows, countRows] = await Promise.all([
        db.select({
            id: photos.id,
            originalName: photos.originalName,
            blurhash: photos.blurhash,
            width: photos.width,
            height: photos.height,
            dateTaken: photos.dateTaken,
            createdAt: photos.createdAt,
        })
            .from(photos)
            .where(where)
            .orderBy(
                sql`CASE WHEN ${inArray(photos.id, link.photoIds)} THEN 0 ELSE 1 END`,
                asc(photos.dateTaken),
                asc(photos.createdAt),
            )
            .limit(limit)
            .offset(skip),
        db.select({ total: count() }).from(photos).where(where),
    ])

    const total = Number(countRows[0]?.total ?? 0)
    return {
        success: true,
        data: {
            photos: rows.map(photo => ({
                ...photo,
                dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
                createdAt: Number(photo.createdAt),
            })),
            pagination: { page, limit, total, hasMore: skip + rows.length < total },
        },
    }
})
