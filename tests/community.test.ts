import { afterEach, describe, expect, it } from 'vitest'
import { isCommunityModeEnabled, isMemberRecord } from '../server/utils/community'

const ORIGINAL_COMMUNITY_MODE = process.env.COMMUNITY_MODE

describe('isCommunityModeEnabled', () => {
    afterEach(() => {
        if (ORIGINAL_COMMUNITY_MODE === undefined) delete process.env.COMMUNITY_MODE
        else process.env.COMMUNITY_MODE = ORIGINAL_COMMUNITY_MODE
    })

    it('is enabled by default when the env var is unset', () => {
        delete process.env.COMMUNITY_MODE
        expect(isCommunityModeEnabled()).toBe(true)
    })

    it('is enabled when the env var is any value other than "false"', () => {
        process.env.COMMUNITY_MODE = 'true'
        expect(isCommunityModeEnabled()).toBe(true)
    })

    it('is disabled only when the env var is exactly "false"', () => {
        process.env.COMMUNITY_MODE = 'false'
        expect(isCommunityModeEnabled()).toBe(false)
    })
})

describe('isMemberRecord', () => {
    afterEach(() => {
        if (ORIGINAL_COMMUNITY_MODE === undefined) delete process.env.COMMUNITY_MODE
        else process.env.COMMUNITY_MODE = ORIGINAL_COMMUNITY_MODE
    })

    it('returns false when community mode is disabled, even for a password user', () => {
        process.env.COMMUNITY_MODE = 'false'
        expect(isMemberRecord({ passwordHash: 'hash' })).toBe(false)
    })

    it('returns true for a user with a passwordHash', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord({ passwordHash: 'hash' })).toBe(true)
    })

    it('returns true for a user with a googleId', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord({ googleId: 'g-123' })).toBe(true)
    })

    it('returns true for a user with a microsoftId', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord({ microsoftId: 'm-123' })).toBe(true)
    })

    it('returns true for an ADMIN regardless of other fields', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord({ role: 'ADMIN' })).toBe(true)
    })

    it('returns false for an anonymous guest with none of those fields', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord({ passwordHash: null, googleId: null, microsoftId: null, role: 'USER' })).toBe(false)
    })

    it('returns false for a null/undefined user', () => {
        delete process.env.COMMUNITY_MODE
        expect(isMemberRecord(null)).toBe(false)
        expect(isMemberRecord(undefined)).toBe(false)
    })
})
