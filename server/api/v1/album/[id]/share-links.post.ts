import { and, eq, inArray } from 'drizzle-orm'
import { albums, photos, shareLinks } from '../../../../db/schema'
import { requireAuth, getUnixTimestamp } from '../../../../utils/auth'
import { nanoid } from 'nanoid'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const albumId = getRouterParam(event, 'id')
    const body = await readBody(event)

    const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId!), columns: { ownerId: true } })
    if (!album) throw createError({ statusCode: 404, statusMessage: 'Album not found' })
    if (album.ownerId !== user.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const type = body.type || 'view'
    const label = body.label || null
    const password = body.password || null
    const passwordHash = password ? await argon2.hash(password) : null
    const token = nanoid(32)
    const faceSearchEnabled = body.faceSearchEnabled !== undefined ? !!body.faceSearchEnabled : false
    const rawPhotoIds: unknown[] = Array.isArray(body.photoIds) ? body.photoIds : []
    const requestedPhotoIds: string[] = [...new Set(
        rawPhotoIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
    )]

    if (requestedPhotoIds.length > 1000) {
        throw createError({ statusCode: 400, statusMessage: 'A picture group can contain at most 1000 photos' })
    }

    if (requestedPhotoIds.length > 0) {
        if (type !== 'view') throw createError({ statusCode: 400, statusMessage: 'Picture groups must use view-only links' })

        const matchingPhotos = await db.select({ id: photos.id })
            .from(photos)
            .where(and(eq(photos.albumId, albumId!), inArray(photos.id, requestedPhotoIds)))

        if (matchingPhotos.length !== requestedPhotoIds.length) {
            throw createError({ statusCode: 400, statusMessage: 'Every selected photo must belong to this album' })
        }
    }

    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const privateNotes = typeof body.privateNotes === 'string' ? body.privateNotes.trim() : ''
    if (description.length > 2000) throw createError({ statusCode: 400, statusMessage: 'Description is too long' })
    if (privateNotes.length > 4000) throw createError({ statusCode: 400, statusMessage: 'Private notes are too long' })

    const [link] = await db.insert(shareLinks).values({
        token,
        type,
        label: label || (requestedPhotoIds.length > 0 ? `Picture group (${requestedPhotoIds.length})` : null),
        password: passwordHash,
        showMetadata: body.showMetadata !== undefined ? !!body.showMetadata : false,
        faceSearchEnabled: requestedPhotoIds.length > 0 ? false : faceSearchEnabled,
        uploadMessage: type === 'upload' ? (body.uploadMessage || null) : null,
        photoIds: requestedPhotoIds.length > 0 ? requestedPhotoIds : null,
        description: description || null,
        privateNotes: privateNotes || null,
        albumId: albumId!,
        createdAt: getUnixTimestamp(),
    }).returning()

    if (!link) throw createError({ statusCode: 500, statusMessage: 'Failed to create share link' })

    return {
        success: true,
        data: {
            ...link,
            password: !!link.password,
            createdAt: Number(link.createdAt),
            expiresAt: link.expiresAt ? Number(link.expiresAt) : null,
        },
    }
})
