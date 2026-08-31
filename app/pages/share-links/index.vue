<template>
    <div class="min-h-screen" style="background: var(--bg-page);">
        <NavBar title="Share Links" :showBack="true" />

        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <h2 class="text-3xl font-bold tracking-tight mb-1" style="color: var(--text-1);">Share Links</h2>
                <p class="text-sm" style="color: var(--text-2);">Manage your shared albums and groups</p>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex justify-center py-12">
                <div class="w-8 h-8 rounded-full border-2 animate-spin"
                    style="border-color: var(--separator); border-top-color: var(--accent);"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="rounded-xl px-4 py-3 text-sm mb-8"
                style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                {{ error }}
            </div>

            <!-- Empty State -->
            <div v-else-if="links.length === 0" class="text-center py-16 rounded-2xl"
                style="background: var(--surface-1); border: 1px solid var(--separator);">
                <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style="background: var(--surface-3);">
                    <Icon name="lucide:link-2" class="h-7 w-7" style="color: var(--text-3);" :stroke-width="1.5" />
                </div>
                <h3 class="text-lg font-semibold mb-1" style="color: var(--text-1);">No share links yet</h3>
                <p class="text-sm mb-6" style="color: var(--text-3);">Create a share link from your albums to see it here.</p>
                <button @click="navigateTo('/album')"
                    class="px-6 py-2.5 rounded-full text-sm font-medium transition"
                    style="background: var(--accent); color: var(--accent-text);"
                    @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'"
                    @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                    Go to Albums
                </button>
            </div>

            <!-- Links Table -->
            <div v-else class="rounded-2xl overflow-hidden"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-sm);">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr style="background: var(--surface-2); border-bottom: 1px solid var(--separator);">
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Link Label</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Target</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Type</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-center" style="color: var(--text-3);">Views</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-3);">Created</th>
                                <th class="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-right" style="color: var(--text-3);">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="link in links" :key="link.id" class="transition"
                                style="border-top: 1px solid var(--separator);"
                                @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-2)'"
                                @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2 font-medium" style="color: var(--text-1);">
                                        <Icon name="lucide:lock" class="h-3.5 w-3.5" style="color: var(--text-3);" :stroke-width="2" />
                                        {{ link.label || 'No Label' }}
                                    </div>
                                    <div class="flex flex-wrap items-center gap-2 mt-1">
                                        <div class="text-xs font-mono truncate max-w-[200px]" style="color: var(--text-3);">
                                            {{ getFullUrl(link.url) }}
                                        </div>
                                        <span v-if="!link.showMetadata"
                                            class="text-[10px] px-1.5 py-0.5 rounded-full"
                                            style="background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border);">
                                            No Metadata
                                        </span>
                                        <span v-if="link.faceSearchEnabled === false"
                                            class="text-[10px] px-1.5 py-0.5 rounded-full"
                                            style="background: var(--surface-3); color: var(--text-3);">
                                            No Face Search
                                        </span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="font-medium mb-1" style="color: var(--text-1);">{{ link.targetName }}</div>
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                        :style="link.targetType === 'Album' ? 'background: var(--surface-3); color: var(--text-2);' : 'background: var(--accent-light); color: var(--accent);'">
                                        {{ link.targetType }}
                                    </span>
                                    <span v-if="link.targetType === 'Picture Group'" class="ml-1 text-xs" style="color: var(--text-3);">
                                        {{ link.photoCount }} photos
                                    </span>
                                </td>
                                <td class="px-6 py-4 capitalize" style="color: var(--text-2);">{{ link.type }}</td>
                                <td class="px-6 py-4 text-center" style="color: var(--text-2);">{{ link.views }}</td>
                                <td class="px-6 py-4 whitespace-nowrap" style="color: var(--text-2);">
                                    {{ formatDate(link.createdAt) }}
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <button @click="openEditModal(link)"
                                            class="p-1.5 rounded-lg transition" style="color: var(--accent);"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--accent-light)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Edit Link">
                                            <Icon name="lucide:square-pen" class="h-4 w-4" :stroke-width="2" />
                                        </button>
                                        <button @click="copyLink(link.id, link.url)"
                                            class="p-1.5 rounded-lg transition"
                                            :style="copiedLinkId === link.id ? 'color: var(--success-text);' : 'color: var(--text-2);'"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--surface-3)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Copy Link">
                                            <Icon v-if="copiedLinkId === link.id" name="lucide:check" class="h-4 w-4" :stroke-width="2" />
                                            <Icon v-else name="lucide:copy" class="h-4 w-4" :stroke-width="2" />
                                        </button>
                                        <button @click="confirmDelete(link)"
                                            class="p-1.5 rounded-lg transition" style="color: var(--error);"
                                            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--error-bg)'"
                                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                                            title="Delete Link">
                                            <Icon name="lucide:trash-2" class="h-4 w-4" :stroke-width="2" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);"
            @click.self="showEditModal = false">
            <div class="rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-xl font-bold mb-6" style="color: var(--text-1);">Edit Share Link</h3>

                <div v-if="loadingEdit" class="flex justify-center py-8">
                    <div class="w-8 h-8 rounded-full border-2 animate-spin"
                        style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                </div>

                <form v-else @submit.prevent="handleUpdateLink" class="space-y-5">
                    <!-- General Settings -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-semibold pb-2" style="color: var(--text-2); border-bottom: 1px solid var(--separator);">General Settings</h4>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Link Label</label>
                            <input v-model="editForm.label" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="Public Link"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div class="flex items-center gap-2.5 p-3 rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <input v-model="editForm.showMetadata" type="checkbox" id="editShowMetadata"
                                class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <label for="editShowMetadata" class="text-sm" style="color: var(--text-1);">Show photo metadata (date, camera, etc.)</label>
                        </div>

                        <div class="flex items-center gap-2.5 p-3 rounded-xl"
                            style="background: var(--surface-2); border: 1px solid var(--separator);">
                            <input v-model="editForm.faceSearchEnabled" type="checkbox" id="editFaceSearchEnabled"
                                class="w-4 h-4 rounded" style="accent-color: var(--accent);" />
                            <label for="editFaceSearchEnabled" class="text-sm" style="color: var(--text-1);">Allow visitors to search photos by face</label>
                        </div>

                        <div v-if="editForm.type === 'upload'">
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Upload Announcement <span style="color: var(--text-3);">(optional)</span></label>
                            <textarea v-model="editForm.uploadMessage" rows="2"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="e.g. Ensure images are culled, please don't dump raws"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                            <p class="text-xs mt-1" style="color: var(--text-3);">Shown as a banner to uploaders when they open the link.</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Password Protection</label>
                            <input v-model="editForm.password" type="password"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="Set new password (leave empty to keep current)"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                            <div v-if="editForm.hasPassword" class="flex items-center gap-2 mt-2">
                                <input v-model="editForm.removePassword" type="checkbox" id="removePass"
                                    class="w-4 h-4 rounded" style="accent-color: var(--error);" />
                                <label for="removePass" class="text-sm" style="color: var(--error);">Remove current password</label>
                            </div>
                        </div>
                    </div>

                    <!-- Picture Group Content -->
                    <div v-if="editForm.isPictureGroup" class="space-y-4 pt-2">
                        <div class="flex flex-wrap items-end justify-between gap-2 pb-2" style="border-bottom: 1px solid var(--separator);">
                            <div>
                                <h4 class="text-sm font-semibold" style="color: var(--text-2);">Picture Group Content</h4>
                                <p class="text-xs mt-1" style="color: var(--text-3);">Manage what visitors see without changing the share URL.</p>
                            </div>
                            <div class="text-sm font-semibold" style="color: var(--accent);">
                                {{ editForm.photoIds.length }} selected
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Public Description</label>
                                <textarea v-model="editForm.description" rows="3" maxlength="2000"
                                    class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    placeholder="Shown to everyone who opens the link"></textarea>
                                <div class="text-right text-[11px] mt-1" style="color: var(--text-3);">{{ editForm.description.length }}/2000</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Private Notes</label>
                                <textarea v-model="editForm.privateNotes" rows="3" maxlength="4000"
                                    class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    placeholder="Internal notes — never shown to visitors"></textarea>
                                <div class="text-right text-[11px] mt-1" style="color: var(--text-3);">{{ editForm.privateNotes.length }}/4000</div>
                            </div>
                        </div>

                        <div>
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <label class="text-sm font-medium" style="color: var(--text-2);">Photos</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" @click="selectLoadedPhotos" class="text-xs font-medium" style="color: var(--accent);">Select loaded</button>
                                    <span style="color: var(--separator);">·</span>
                                    <button type="button" @click="clearLoadedPhotos" class="text-xs font-medium" style="color: var(--text-3);">Clear loaded</button>
                                </div>
                            </div>
                            <div class="relative mb-3">
                                <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style="color: var(--text-3);" />
                                <input v-model="photoSearch" @input="schedulePhotoSearch" type="search"
                                    class="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl"
                                    style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                    placeholder="Search photos by filename" />
                            </div>

                            <div v-if="loadingPhotos && availablePhotos.length === 0" class="flex justify-center py-10">
                                <div class="w-7 h-7 rounded-full border-2 animate-spin" style="border-color: var(--separator); border-top-color: var(--accent);"></div>
                            </div>
                            <div v-else-if="availablePhotos.length === 0" class="text-center py-8 rounded-xl text-sm"
                                style="background: var(--surface-2); color: var(--text-3); border: 1px solid var(--separator);">
                                No photos match your search.
                            </div>
                            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[28rem] overflow-y-auto pr-1">
                                <button v-for="photo in availablePhotos" :key="photo.id" type="button"
                                    @click="togglePictureGroupPhoto(photo.id)"
                                    class="relative rounded-xl overflow-hidden text-left transition focus:outline-none"
                                    :style="editForm.photoIds.includes(photo.id) ? 'box-shadow: 0 0 0 3px var(--accent);' : 'box-shadow: 0 0 0 1px var(--separator);'">
                                    <div class="aspect-[4/3]" style="background: var(--surface-3);">
                                        <img :src="buildAssetUrl(`/api/assets/thumb/${photo.id}`)" :alt="photo.originalName"
                                            class="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                    <div class="px-2 py-1.5 text-xs truncate" style="background: var(--surface-2); color: var(--text-2);">
                                        {{ photo.originalName }}
                                    </div>
                                    <div class="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                        :style="editForm.photoIds.includes(photo.id) ? 'background: var(--accent); color: var(--accent-text);' : 'background: color-mix(in srgb, var(--surface-1) 85%, transparent); color: var(--text-3); border: 1px solid var(--separator);'">
                                        <Icon v-if="editForm.photoIds.includes(photo.id)" name="lucide:check" class="w-3.5 h-3.5" :stroke-width="3" />
                                        <Icon v-else name="lucide:plus" class="w-3.5 h-3.5" :stroke-width="2" />
                                    </div>
                                </button>
                            </div>
                            <button v-if="photosHaveMore" type="button" @click="loadAvailablePhotos(false)" :disabled="loadingPhotos"
                                class="w-full mt-3 px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                                style="background: var(--surface-2); color: var(--text-2); border: 1px solid var(--separator);">
                                {{ loadingPhotos ? 'Loading…' : 'Load more photos' }}
                            </button>
                            <p v-if="editForm.photoIds.length === 0" class="text-xs mt-2" style="color: var(--error);">Select at least one photo.</p>
                            <p v-else-if="editForm.photoIds.length > 1000" class="text-xs mt-2" style="color: var(--error);">Picture groups can contain at most 1000 photos.</p>
                        </div>
                    </div>

                    <!-- Group Content Settings -->
                    <div v-if="editForm.isGroup" class="space-y-4 pt-2">
                        <h4 class="text-sm font-semibold pb-2" style="color: var(--text-2); border-bottom: 1px solid var(--separator);">Group Content</h4>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Group Title</label>
                            <input v-model="editForm.groupTitle" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Description</label>
                            <textarea v-model="editForm.groupDescription" rows="2"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition resize-none"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'"></textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-2);">Tag Filters</label>
                            <p class="text-xs mb-2" style="color: var(--text-3);">Albums matching any of these tags are included live (in addition to explicitly selected albums below).</p>
                            <input v-model="editForm.groupTagsInput" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="wedding, portrait (comma-separated)"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <!-- Theme -->
                        <div>
                            <label class="block text-sm font-medium mb-2" style="color: var(--text-2);">Theme</label>
                            <div class="flex flex-wrap gap-2 items-center">
                                <button v-for="(theme, key) in ALBUM_THEMES" :key="key" type="button"
                                    @click="editForm.themePreset = key" :title="theme.label"
                                    class="w-7 h-7 rounded-full transition"
                                    :style="`background: linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd}); border: 2px solid ${editForm.themePreset === key ? 'var(--accent)' : 'transparent'}; outline: 2px solid ${editForm.themePreset === key ? 'var(--accent)' : 'transparent'};`" />
                                <button type="button" @click="editForm.themePreset = 'custom'" title="Custom"
                                    class="w-7 h-7 rounded-full text-xs font-bold transition"
                                    :style="editForm.themePreset === 'custom' ? 'background: var(--accent-light); color: var(--accent); border: 2px solid var(--accent);' : 'background: var(--surface-3); color: var(--text-2); border: 2px solid var(--separator);'">
                                    +
                                </button>
                                <button type="button" @click="editForm.themePreset = ''" title="Default (none)"
                                    class="px-2 h-7 rounded-full text-xs transition"
                                    :style="editForm.themePreset === '' ? 'background: var(--accent-light); color: var(--accent); border: 2px solid var(--accent);' : 'background: var(--surface-3); color: var(--text-2); border: 2px solid var(--separator);'">
                                    Default
                                </button>
                            </div>
                            <div v-if="editForm.themePreset === 'custom'" class="mt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">BG Start</label>
                                    <input type="color" v-model="editForm.customTheme.bgStart" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">BG End</label>
                                    <input type="color" v-model="editForm.customTheme.bgEnd" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">Accent Start</label>
                                    <input type="color" v-model="editForm.customTheme.btnStart" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                                <div>
                                    <label class="text-xs mb-1 block" style="color: var(--text-3);">Accent End</label>
                                    <input type="color" v-model="editForm.customTheme.btnEnd" class="w-full h-8 rounded cursor-pointer bg-transparent" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1.5" style="color: var(--text-2);">Logo Text</label>
                            <input v-model="editForm.logoText" type="text"
                                class="w-full px-3.5 py-2.5 text-sm rounded-xl transition"
                                style="background: var(--surface-2); border: 1px solid var(--separator); color: var(--text-1); outline: none;"
                                placeholder="e.g. Wedding Collection 2025"
                                @focus="($event.target as HTMLElement).style.borderColor = 'var(--accent)'; ($event.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)'"
                                @blur="($event.target as HTMLElement).style.borderColor = 'var(--separator)'; ($event.target as HTMLElement).style.boxShadow = 'none'" />
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-1" style="color: var(--text-2);">Albums in Group</label>
                            <p class="text-xs mb-2" style="color: var(--text-3);">Explicit selection. Tag-filtered albums are added on top of these.</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                <div v-for="album in availableAlbums" :key="album.id"
                                    class="flex items-center p-2.5 rounded-xl cursor-pointer transition"
                                    :style="editForm.groupAlbumIds.includes(album.id) ? 'background: var(--accent-light); border: 1px solid var(--accent);' : 'background: var(--surface-2); border: 1px solid var(--separator);'"
                                    @click="toggleAlbumInGroup(album.id)">
                                    <div class="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 mr-2.5"
                                        style="background: var(--surface-3);">
                                        <img v-if="album.coverPhoto" :src="buildAssetUrl(`/api/assets/thumb/${album.coverPhoto.id}`)"
                                            class="w-full h-full object-cover" />
                                        <div v-else class="w-full h-full flex items-center justify-center text-xs" style="color: var(--text-3);">📷</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium truncate" :style="editForm.groupAlbumIds.includes(album.id) ? 'color: var(--accent)' : 'color: var(--text-1)'">{{ album.name }}</div>
                                        <div class="text-xs" style="color: var(--text-3);">{{ album.photoCount }} photos</div>
                                    </div>
                                    <div class="w-5 h-5 rounded-full flex items-center justify-center ml-2 shrink-0"
                                        :style="editForm.groupAlbumIds.includes(album.id) ? 'background: var(--accent);' : 'background: transparent; border: 1.5px solid var(--separator);'">
                                        <Icon v-if="editForm.groupAlbumIds.includes(album.id)" name="lucide:check" class="w-3 h-3" style="color: var(--accent-text);" :stroke-width="3" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="editError" class="rounded-xl px-4 py-3 text-sm"
                        style="background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text);">
                        {{ editError }}
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" @click="showEditModal = false"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                            style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                            Cancel
                        </button>
                        <button type="submit" :disabled="saving || (editForm.isPictureGroup && (editForm.photoIds.length === 0 || editForm.photoIds.length > 1000))"
                            class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                            style="background: var(--accent); color: var(--accent-text);"
                            @mouseover="!saving && (($event.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')"
                            @mouseout="($event.currentTarget as HTMLElement).style.background = 'var(--accent)'">
                            {{ saving ? 'Saving…' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal"
            class="fixed inset-0 flex items-center justify-center p-4 z-50"
            style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);">
            <div class="rounded-2xl p-6 max-w-sm w-full"
                style="background: var(--surface-1); border: 1px solid var(--separator); box-shadow: var(--shadow-xl);">
                <h3 class="text-lg font-bold mb-2" style="color: var(--text-1);">Delete Share Link?</h3>
                <p class="text-sm mb-6" style="color: var(--text-2);">
                    Are you sure you want to delete this link? Anyone with the link will lose access.
                </p>
                <div class="flex gap-3">
                    <button @click="showDeleteModal = false"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition"
                        style="background: var(--surface-2); color: var(--text-1); border: 1px solid var(--separator);">
                        Cancel
                    </button>
                    <button @click="handleDelete" :disabled="deleting"
                        class="flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50"
                        style="background: var(--error); color: var(--accent-text);">
                        {{ deleting ? 'Deleting…' : 'Delete' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'
const dialog = useDialog()
import { buildAssetUrl } from '~/utils/auth-client'
import { ALBUM_THEMES } from '~/composables/useAlbumTheme'

interface ShareLink {
    id: string
    token: string
    type: string
    targetType: 'Group' | 'Picture Group' | 'Album'
    targetName: string
    photoCount: number | null
    label: string | null
    views: number
    createdAt: number
    expiresAt: number | null
    hasPassword: boolean
    showMetadata: boolean
    faceSearchEnabled: boolean
    url: string
}

interface AvailableAlbum {
    id: string
    name: string
    photoCount: number
    coverPhoto: { id: string; blurhash: string | null } | null
}

interface PictureGroupPhoto {
    id: string
    originalName: string
    blurhash: string | null
    width: number
    height: number
    dateTaken: number | null
    createdAt: number
}

const loading = ref(true)
const error = ref('')
const links = ref<ShareLink[]>([])

const showDeleteModal = ref(false)
const linkToDelete = ref<ShareLink | null>(null)
const deleting = ref(false)
const copiedLinkId = ref<string | null>(null)

// Edit State
const showEditModal = ref(false)
const loadingEdit = ref(false)
const editingLink = ref<ShareLink | null>(null)
const editError = ref('')
const saving = ref(false)
const availableAlbums = ref<AvailableAlbum[]>([])
const availablePhotos = ref<PictureGroupPhoto[]>([])
const loadingPhotos = ref(false)
const photosPage = ref(1)
const photosHaveMore = ref(false)
const photoSearch = ref('')
let photoSearchTimer: ReturnType<typeof setTimeout> | undefined
let photoLoadGeneration = 0

const editForm = reactive({
    id: '',
    label: '',
    password: '',
    hasPassword: false,
    removePassword: false,
    showMetadata: false,
    faceSearchEnabled: false,
    type: '',
    uploadMessage: '',
    isGroup: false,
    isPictureGroup: false,
    photoIds: [] as string[],
    description: '',
    privateNotes: '',
    groupTitle: '',
    groupDescription: '',
    groupAlbumIds: [] as string[],
    groupTags: [] as string[],
    groupTagsInput: '',
    themePreset: '',
    customTheme: { bgStart: '#2d2d2d', bgEnd: '#141414', btnStart: '#d4d4d4', btnEnd: '#a3a3a3' },
    logoText: '',
})

// Fetch Links
const fetchLinks = async () => {
    loading.value = true
    try {
        const response = await $fetch<{ success: boolean; data: ShareLink[] }>('/api/v1/share-links')
        links.value = response.data
    } catch (err: any) {
        error.value = err.data?.statusMessage || 'Failed to load share links'
    } finally {
        loading.value = false
    }
}

// Helpers
const getFullUrl = (path: string) => {
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Edit Logic
const openEditModal = async (link: ShareLink) => {
    editingLink.value = link
    showEditModal.value = true
    loadingEdit.value = true
    editError.value = ''

    // Reset Form
    editForm.id = link.id
    editForm.isGroup = false
    editForm.isPictureGroup = false
    editForm.photoIds = []
    editForm.description = ''
    editForm.privateNotes = ''
    availablePhotos.value = []
    photoSearch.value = ''
    photosPage.value = 1
    photosHaveMore.value = false

    try {
        // Fetch Details
        const details = await $fetch<{ success: boolean; data: any }>(`/api/v1/share-links/${link.id}`)
        const data = details.data

        editForm.label = data.label || ''
        editForm.password = ''
        editForm.hasPassword = data.hasPassword
        editForm.removePassword = false
        editForm.showMetadata = data.showMetadata !== undefined ? data.showMetadata : false
        editForm.faceSearchEnabled = data.faceSearchEnabled !== undefined ? data.faceSearchEnabled : false
        editForm.type = data.type || ''
        editForm.uploadMessage = data.uploadMessage || ''
        editForm.isGroup = data.isGroup
        editForm.isPictureGroup = data.isPictureGroup
        editForm.photoIds = Array.isArray(data.photoIds) ? [...data.photoIds] : []
        editForm.description = data.description || ''
        editForm.privateNotes = data.privateNotes || ''

        if (data.isPictureGroup) {
            await loadAvailablePhotos(true)
        }

        if (data.isGroup) {
            editForm.groupTitle = data.groupTitle
            editForm.groupDescription = data.groupDescription || ''
            editForm.groupAlbumIds = data.groupAlbumIds
            editForm.groupTags = data.groupTags || []
            editForm.groupTagsInput = (data.groupTags || []).join(', ')
            editForm.themePreset = data.groupThemePreset || ''
            editForm.logoText = data.groupLogoText || ''
            if (data.groupCustomTheme) {
                try { Object.assign(editForm.customTheme, JSON.parse(data.groupCustomTheme)) } catch { /* keep defaults */ }
            }

            // Fetch Available Albums
            const albumsResponse = await $fetch<{ success: boolean; data: AvailableAlbum[] }>('/api/v1/albums/list')
            availableAlbums.value = albumsResponse.data
        }
    } catch (err: any) {
        editError.value = 'Failed to load details'
        console.error(err)
    } finally {
        loadingEdit.value = false
    }
}

const loadAvailablePhotos = async (reset: boolean) => {
    if (!editForm.id || (!reset && loadingPhotos.value)) return
    const generation = reset ? ++photoLoadGeneration : photoLoadGeneration
    const linkId = editForm.id
    if (reset) {
        photosPage.value = 1
        availablePhotos.value = []
        photosHaveMore.value = false
    }

    loadingPhotos.value = true
    try {
        const response = await $fetch<{
            success: boolean
            data: { photos: PictureGroupPhoto[]; pagination: { hasMore: boolean } }
        }>(`/api/v1/share-links/${linkId}/available-photos`, {
            query: { page: photosPage.value, limit: 100, search: photoSearch.value || undefined },
        })
        if (generation !== photoLoadGeneration || linkId !== editForm.id) return
        availablePhotos.value = reset
            ? response.data.photos
            : [...availablePhotos.value, ...response.data.photos]
        photosHaveMore.value = response.data.pagination.hasMore
        if (response.data.pagination.hasMore) photosPage.value += 1
    } catch (err: any) {
        if (generation !== photoLoadGeneration || linkId !== editForm.id) return
        editError.value = err.data?.statusMessage || 'Failed to load photos'
    } finally {
        if (generation === photoLoadGeneration) loadingPhotos.value = false
    }
}

const schedulePhotoSearch = () => {
    if (photoSearchTimer) clearTimeout(photoSearchTimer)
    photoSearchTimer = setTimeout(() => loadAvailablePhotos(true), 250)
}

const togglePictureGroupPhoto = (photoId: string) => {
    const index = editForm.photoIds.indexOf(photoId)
    if (index === -1) editForm.photoIds.push(photoId)
    else editForm.photoIds.splice(index, 1)
}

const selectLoadedPhotos = () => {
    const selected = new Set(editForm.photoIds)
    for (const photo of availablePhotos.value) selected.add(photo.id)
    editForm.photoIds = [...selected]
}

const clearLoadedPhotos = () => {
    const loadedIds = new Set(availablePhotos.value.map(photo => photo.id))
    editForm.photoIds = editForm.photoIds.filter(photoId => !loadedIds.has(photoId))
}

const toggleAlbumInGroup = (albumId: string) => {
    const index = editForm.groupAlbumIds.indexOf(albumId)
    if (index === -1) {
        editForm.groupAlbumIds.push(albumId)
    } else {
        editForm.groupAlbumIds.splice(index, 1)
    }
}

const handleUpdateLink = async () => {
    saving.value = true
    editError.value = ''

    try {
        const groupTags = editForm.groupTagsInput
            .split(',').map((t: string) => t.trim()).filter(Boolean)
        const customTheme = editForm.themePreset === 'custom'
            ? JSON.stringify(editForm.customTheme)
            : undefined

        await $fetch(`/api/v1/share-links/${editForm.id}`, {
            method: 'PUT',
            body: {
                label: editForm.label,
                showMetadata: editForm.showMetadata,
                faceSearchEnabled: editForm.faceSearchEnabled,
                uploadMessage: editForm.uploadMessage || null,
                password: editForm.password || undefined,
                removePassword: editForm.removePassword,
                isGroup: editForm.isGroup,
                photoIds: editForm.isPictureGroup ? editForm.photoIds : undefined,
                description: editForm.isPictureGroup ? editForm.description : undefined,
                privateNotes: editForm.isPictureGroup ? editForm.privateNotes : undefined,
                groupTitle: editForm.groupTitle,
                groupDescription: editForm.groupDescription,
                groupAlbumIds: editForm.groupAlbumIds,
                groupTags,
                themePreset: editForm.themePreset || null,
                customTheme,
                logoText: editForm.logoText || null,
            }
        })

        showEditModal.value = false
        await fetchLinks() // Refresh list
    } catch (err: any) {
        editError.value = err.data?.statusMessage || 'Failed to update link'
    } finally {
        saving.value = false
    }
}

const copyLink = async (id: string, path: string) => {
    const url = getFullUrl(path)
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url)
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea")
            textArea.value = url

            // Ensure element is not visible but part of DOM
            textArea.style.position = "fixed"
            textArea.style.left = "-9999px"
            textArea.style.top = "0"
            document.body.appendChild(textArea)

            textArea.focus()
            textArea.select()

            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)

            if (!successful) {
                throw new Error('Unable to copy')
            }
        }

        // Success feedback
        copiedLinkId.value = id
        setTimeout(() => {
            copiedLinkId.value = null
        }, 2000)

    } catch (err) {
        console.error('Failed to copy: ', err)
        dialog.toast('Failed to copy link manually: ' + url)
    }
}

// Delete Logic
const confirmDelete = (link: ShareLink) => {
    linkToDelete.value = link
    showDeleteModal.value = true
}

const handleDelete = async () => {
    if (!linkToDelete.value) return
    deleting.value = true

    try {
        await $fetch(`/api/v1/share-links/${linkToDelete.value.id}`, { method: 'DELETE' })
        // Remove from list locally
        links.value = links.value.filter(l => l.id !== linkToDelete.value?.id)
        showDeleteModal.value = false
        linkToDelete.value = null
    } catch (err: any) {
        dialog.toast(err.data?.statusMessage || 'Failed to delete link')
    } finally {
        deleting.value = false
    }
}

onMounted(() => {
    fetchLinks()
})

onBeforeUnmount(() => {
    if (photoSearchTimer) clearTimeout(photoSearchTimer)
})
</script>
