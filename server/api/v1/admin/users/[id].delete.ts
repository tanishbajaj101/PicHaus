import { eq, or, inArray } from 'drizzle-orm'
import { users, albums, photos } from '../../../../db/schema'
import { requireAuth } from '../../../../utils/auth'
import { deleteFile } from '../../../../utils/upload'

export default defineEventHandler(async (event) => {
    try {
        const currentUser = await requireAuth(event)
        const userId = getRouterParam(event, 'id')

        if (currentUser.role !== 'ADMIN') throw createError({ statusCode: 403, statusMessage: 'Permission denied' })
        if (!userId) throw createError({ statusCode: 400, statusMessage: 'User ID required' })
        if (userId === currentUser.id) throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })

        const target = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
        if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

        const ownedAlbumRows = await db.select({ id: albums.id }).from(albums).where(eq(albums.ownerId, userId))
        const ownedAlbumIds = ownedAlbumRows.map(a => a.id)

        const photosWhere = or(
            eq(photos.uploaderId, userId),
            ownedAlbumIds.length > 0 ? inArray(photos.albumId, ownedAlbumIds) : undefined,
        )

        const photoFiles = await db.transaction(async (tx) => {
            const photoRows = await tx.select({
                id: photos.id,
                storagePath: photos.storagePath,
                thumbnailStoragePath: photos.thumbnailStoragePath,
            }).from(photos).where(photosWhere)

            if (photoRows.length > 0) {
                await tx.delete(photos).where(inArray(photos.id, photoRows.map(p => p.id)))
            }

            await tx.delete(users).where(eq(users.id, userId))

            return photoRows
        })

        await Promise.all(photoFiles.flatMap(photo => [
            photo.storagePath ? deleteFile(photo.storagePath) : null,
            photo.thumbnailStoragePath ? deleteFile(photo.thumbnailStoragePath) : null,
        ]))

        return {
            success: true,
            message: 'User deleted successfully',
            deletedPhotos: photoFiles.length,
            deletedAlbums: ownedAlbumIds.length,
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete user' })
    }
})
