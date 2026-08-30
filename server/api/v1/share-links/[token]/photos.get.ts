import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { photos, shareLinks, users } from '../../../../db/schema'
import { getAuthUserId, getUnixTimestamp } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, 'token')
    if (!token) throw createError({ statusCode: 400, statusMessage: 'Share token is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.token, token),
        with: {
            album: {
                columns: { id: true, ownerId: true },
                with: { collaborators: { columns: { userId: true } } },
            },
        },
    })

    if (!link || !link.album || !link.albumId || !link.photoIds?.length) {
        throw createError({ statusCode: 404, statusMessage: 'Picture group not found' })
    }
    if (link.expiresAt && link.expiresAt < getUnixTimestamp()) {
        throw createError({ statusCode: 404, statusMessage: 'Picture group not found' })
    }

    const authUserId = getAuthUserId(event)
    const hasUserAccess = authUserId === link.album.ownerId
        || link.album.collaborators.some(collaborator => collaborator.userId === authUserId)
    const hasShareAccess = getCookie(event, `album-access-${link.albumId}`) === token
    if (!hasUserAccess && !hasShareAccess) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 1000)
    const skip = (page - 1) * limit
    const photoWhere = and(eq(photos.albumId, link.albumId), inArray(photos.id, link.photoIds))

    const [photoRows, countRows] = await Promise.all([
        db.select({
            id: photos.id,
            filename: photos.filename,
            originalName: photos.originalName,
            size: photos.size,
            blurhash: photos.blurhash,
            dateTaken: photos.dateTaken,
            createdAt: photos.createdAt,
            updatedAt: photos.updatedAt,
            width: photos.width,
            height: photos.height,
            cameraModel: photos.cameraModel,
            lens: photos.lens,
            focalLength: photos.focalLength,
            aperture: photos.aperture,
            shutterSpeed: photos.shutterSpeed,
            iso: photos.iso,
            uploaderId: photos.uploaderId,
            uploaderName: users.name,
            uploaderInstagram: users.instagram,
            uploaderAvatarPath: users.avatarPath,
        })
            .from(photos)
            .leftJoin(users, eq(photos.uploaderId, users.id))
            .where(photoWhere)
            .orderBy(asc(photos.dateTaken), asc(photos.createdAt))
            .limit(limit)
            .offset(skip),
        db.select({ total: sql<number>`COUNT(*)` }).from(photos).where(photoWhere),
    ])

    const total = Number(countRows[0]?.total ?? 0)
    return {
        success: true,
        data: {
            photos: photoRows.map(photo => ({
                id: photo.id,
                filename: photo.filename,
                originalName: photo.originalName,
                size: photo.size,
                blurhash: photo.blurhash,
                dateTaken: photo.dateTaken ? Number(photo.dateTaken) : null,
                createdAt: Number(photo.createdAt),
                updatedAt: Number(photo.updatedAt),
                width: photo.width,
                height: photo.height,
                cameraModel: photo.cameraModel,
                lens: photo.lens,
                focalLength: photo.focalLength,
                aperture: photo.aperture,
                shutterSpeed: photo.shutterSpeed,
                iso: photo.iso,
                uploader: photo.uploaderId ? {
                    id: photo.uploaderId,
                    name: photo.uploaderName,
                    instagram: photo.uploaderInstagram,
                    avatar: photo.uploaderAvatarPath ? `/api/assets/avatar/${photo.uploaderId}` : null,
                } : null,
            })),
            pagination: { page, limit, total, hasMore: skip + photoRows.length < total },
        },
    }
})
