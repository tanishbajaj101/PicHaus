import { eq } from 'drizzle-orm'
import { siteSettings } from '../db/schema'

export async function getRegistrationPolicy() {
    const row = await db.query.siteSettings.findFirst({
        where: eq(siteSettings.id, 1),
        columns: {
            allowRegistration: true,
        },
    })

    return {
        allowRegistration: row?.allowRegistration ?? false,
    }
}
