type AlbumOwnershipRecord = {
    ownerId: string
}

type AlbumUserRecord = {
    id: string
    passwordHash: string | null
}

type SerializableAlbum = {
    title: string
    createdAt: bigint | number
    updatedAt: bigint | number
    eventDate: bigint | number | null
}

type SerializableUser = {
    id: string
    avatarPath?: string | null
}

export function normalizeTags(value: unknown): string[] {
    if (!Array.isArray(value)) return []

    const normalized = value
        .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(tag => tag.length > 0)

    return Array.from(new Set(normalized))
}

export function assertAlbumOwnerWithPassword(
    album: AlbumOwnershipRecord,
    user: AlbumUserRecord,
    action: 'edit' | 'delete',
): void {
    if (album.ownerId !== user.id) {
        throw createError({ statusCode: 403, statusMessage: `Only the album owner can ${action} this album` })
    }

    if (!user.passwordHash) {
        throw createError({
            statusCode: 403,
            statusMessage: `Guest users cannot ${action} albums until they register with a username and password`,
        })
    }
}

export function avatarUrl(user: SerializableUser): string | null {
    return user.avatarPath ? `/api/assets/avatar/${user.id}` : null
}

export function serializeAlbum<TAlbum extends SerializableAlbum>(album: TAlbum) {
    return {
        ...album,
        name: album.title,
        createdAt: Number(album.createdAt),
        updatedAt: Number(album.updatedAt),
        eventDate: album.eventDate ? Number(album.eventDate) : null,
    }
}

