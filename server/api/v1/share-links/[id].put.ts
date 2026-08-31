import { eq, and, count, inArray } from 'drizzle-orm'
import { shareLinks, albums, photos, shareGroups, albumToShareGroups } from '../../../db/schema'
import { requireAuth } from '../../../utils/auth'
import argon2 from 'argon2'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.id, id),
        with: {
            album: { columns: { ownerId: true } },
            shareGroup: { columns: { ownerId: true } },
        },
    })

    if (!link) throw createError({ statusCode: 404, statusMessage: 'Link not found' })

    const isOwner = (link.album?.ownerId === user.id) || (link.shareGroup?.ownerId === user.id)
    if (!isOwner && user.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })

    const linkUpdateData: Partial<typeof shareLinks.$inferInsert> = {}
    if (body.label !== undefined) linkUpdateData.label = body.label
    if (body.showMetadata !== undefined) linkUpdateData.showMetadata = body.showMetadata
    if (body.faceSearchEnabled !== undefined) linkUpdateData.faceSearchEnabled = !!body.faceSearchEnabled
    if (body.uploadMessage !== undefined) linkUpdateData.uploadMessage = body.uploadMessage || null
    if (body.password) linkUpdateData.password = await argon2.hash(body.password)
    else if (body.removePassword) linkUpdateData.password = null

    const isPictureGroup = !link.shareGroupId && !!link.photoIds?.length
    if (isPictureGroup) {
        if (body.description !== undefined) {
            if (typeof body.description !== 'string') throw createError({ statusCode: 400, statusMessage: 'Description must be text' })
            const description = body.description.trim()
            if (description.length > 2000) throw createError({ statusCode: 400, statusMessage: 'Description is too long' })
            linkUpdateData.description = description || null
        }
        if (body.privateNotes !== undefined) {
            if (typeof body.privateNotes !== 'string') throw createError({ statusCode: 400, statusMessage: 'Private notes must be text' })
            const privateNotes = body.privateNotes.trim()
            if (privateNotes.length > 4000) throw createError({ statusCode: 400, statusMessage: 'Private notes are too long' })
            linkUpdateData.privateNotes = privateNotes || null
        }
        if (body.photoIds !== undefined) {
            if (!Array.isArray(body.photoIds)) throw createError({ statusCode: 400, statusMessage: 'Photo selection must be a list' })
            const rawPhotoIds: unknown[] = body.photoIds
            const photoIds: string[] = [...new Set(
                rawPhotoIds.filter((photoId): photoId is string => typeof photoId === 'string' && photoId.length > 0),
            )]
            if (photoIds.length === 0) throw createError({ statusCode: 400, statusMessage: 'A picture group must contain at least one photo' })
            if (photoIds.length > 1000) throw createError({ statusCode: 400, statusMessage: 'A picture group can contain at most 1000 photos' })

            const matchingPhotos = await db.select({ id: photos.id })
                .from(photos)
                .where(and(eq(photos.albumId, link.albumId!), inArray(photos.id, photoIds)))
            if (matchingPhotos.length !== photoIds.length) {
                throw createError({ statusCode: 400, statusMessage: 'Every selected photo must belong to this album' })
            }
            linkUpdateData.photoIds = photoIds
        }
    }

    if (Object.keys(linkUpdateData).length > 0) {
        await db.update(shareLinks).set(linkUpdateData).where(eq(shareLinks.id, id))
    }

    if (link.shareGroupId && body.isGroup) {
        const groupUpdateData: Partial<typeof shareGroups.$inferInsert> = {}
        if (body.groupTitle !== undefined) groupUpdateData.title = body.groupTitle
        if (body.groupDescription !== undefined) groupUpdateData.description = body.groupDescription
        if (body.groupTags !== undefined) groupUpdateData.tags = Array.isArray(body.groupTags) ? body.groupTags : []
        if (body.themePreset !== undefined) groupUpdateData.themePreset = body.themePreset || null
        if (body.customTheme !== undefined) groupUpdateData.customTheme = body.customTheme ? (typeof body.customTheme === 'string' ? body.customTheme : JSON.stringify(body.customTheme)) : null
        if (body.logoText !== undefined) groupUpdateData.logoText = body.logoText || null
        if (body.logoImageId !== undefined) groupUpdateData.logoImageId = body.logoImageId || null

        if (body.groupAlbumIds && Array.isArray(body.groupAlbumIds)) {
            const countResult = await db.select({ value: count() })
                .from(albums)
                .where(and(inArray(albums.id, body.groupAlbumIds), eq(albums.ownerId, user.id)))

            const value = countResult[0]?.value ?? 0

            if (value !== body.groupAlbumIds.length) {
                throw createError({ statusCode: 400, statusMessage: 'One or more albums invalid or not owned by you' })
            }

            await db.transaction(async (tx) => {
                await tx.delete(albumToShareGroups).where(eq(albumToShareGroups.B, link.shareGroupId!))
                if (body.groupAlbumIds.length > 0) {
                    await tx.insert(albumToShareGroups).values(
                        body.groupAlbumIds.map((aid: string) => ({ A: aid, B: link.shareGroupId! }))
                    )
                }
            })
        }

        if (Object.keys(groupUpdateData).length > 0) {
            await db.update(shareGroups).set(groupUpdateData).where(eq(shareGroups.id, link.shareGroupId))
        }
    }

    return { success: true, message: 'Share link updated' }
})
