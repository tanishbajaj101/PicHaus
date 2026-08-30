import sharp from 'sharp'
import justifiedLayout from 'justified-layout'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { photos, shareLinks } from '../../../../db/schema'
import { getUnixTimestamp } from '../../../../utils/auth'
import { readStorageFile } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
    const token = getRouterParam(event, 'token')
    if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing share token' })

    const link = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.token, token),
        columns: { albumId: true, photoIds: true, expiresAt: true },
    })

    if (!link?.albumId || !link.photoIds?.length || (link.expiresAt && link.expiresAt < getUnixTimestamp())) {
        throw createError({ statusCode: 404, statusMessage: 'Picture group not found' })
    }

    const width = 1200
    const height = 630
    let groupPhotos = await db.select({
        id: photos.id,
        width: photos.width,
        height: photos.height,
        storagePath: photos.storagePath,
        thumbnailStoragePath: photos.thumbnailStoragePath,
    })
        .from(photos)
        .where(and(
            eq(photos.albumId, link.albumId),
            inArray(photos.id, link.photoIds),
            isNotNull(photos.width),
            isNotNull(photos.height),
        ))
        .limit(1000)

    // Keep the preview varied while strictly limiting every source image to
    // the photo IDs stored on this picture-group share link.
    for (let i = groupPhotos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const current = groupPhotos[i]!
        groupPhotos[i] = groupPhotos[j]!
        groupPhotos[j] = current
    }
    groupPhotos = groupPhotos.slice(0, Math.min(groupPhotos.length, 32))

    const canvas = sharp({
        create: { width, height, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } },
    })
    const composites: sharp.OverlayOptions[] = []

    if (groupPhotos.length > 0) {
        const aspectRatios = groupPhotos.map(photo => (photo.width || 1) / (photo.height || 1))
        const averageAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0) / aspectRatios.length
        const targetRowHeight = Math.sqrt((width * height * 1.2) / (groupPhotos.length * averageAspectRatio))
        const layout = justifiedLayout(aspectRatios, {
            targetRowHeight,
            containerWidth: width,
            boxSpacing: 10,
            containerPadding: 20,
            targetRowHeightTolerance: 0.2,
        })

        const renderedPhotos = await Promise.all(groupPhotos.map(async (photo, index) => {
            const box = (layout as any).boxes[index]
            if (!box || box.top > height) return null
            const storagePath = photo.thumbnailStoragePath || photo.storagePath
            if (!storagePath) return null

            try {
                const boxWidth = Math.round(box.width)
                const boxHeight = Math.round(box.height)
                const sourceBuffer = await readStorageFile(storagePath)
                const roundedCorners = Buffer.from(
                    `<svg><rect width="${boxWidth}" height="${boxHeight}" rx="10" ry="10" /></svg>`,
                )
                const image = await sharp(sourceBuffer)
                    .resize(boxWidth, boxHeight, { fit: 'cover' })
                    .composite([{ input: roundedCorners, blend: 'dest-in' }])
                    .toBuffer()

                return { input: image, top: Math.round(box.top), left: Math.round(box.left) }
            } catch {
                return null
            }
        }))

        composites.push(...renderedPhotos.filter(photo => photo !== null) as sharp.OverlayOptions[])
    }

    const preview = await canvas.composite(composites).png().toBuffer()
    setHeaders(event, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
    })
    return preview
})
