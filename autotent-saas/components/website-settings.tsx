'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pencil, Save, X, Check } from 'lucide-react'

type WebsiteSettingsProps = {
    websiteId: string
    initialConfig: {
        projectId?: string | null
        dataset?: string | null
        geminiApiKey?: string | null
        groqApiKey?: string | null
        websiteName?: string | null
        websiteUrl?: string | null
        geminiApiKeyLabel?: string | null
        groqApiKeyLabel?: string | null
        sanityApiTokenLabel?: string | null
    }
    action: (formData: FormData) => Promise<void>
}

export default function WebsiteSettings({ websiteId, initialConfig, action }: WebsiteSettingsProps) {
    const isConnected = !!initialConfig.projectId
    const hasGeminiKey = !!initialConfig.geminiApiKey
    const hasGroqKey = !!initialConfig.groqApiKey
    const [isEditing, setIsEditing] = useState(!isConnected)
    const [isPending, setIsPending] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        try {
            await action(formData)
            setIsEditing(false)
        } finally {
            setIsPending(false)
        }
    }

    if (!isEditing && isConnected) {
        return (
            <div className="flex items-center gap-4">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    CMS Connected
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Config
                </Button>
            </div>
        )
    }

    return (
        <Card className={`mb-8 ${!isConnected ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={`text-lg ${!isConnected ? 'text-yellow-800 dark:text-yellow-200' : ''}`}>
                    {isConnected ? 'Edit Sanity Configuration' : '⚠️ Connect Sanity CMS'}
                </CardTitle>
                {isConnected && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                setIsPending(true)
                                try {
                                    const { syncSanityMetadata } = await import('@/app/actions/sanity')
                                    const result = await syncSanityMetadata(websiteId)
                                    alert(`Synced ${result.counts.authors} authors and ${result.counts.categories} categories!`)
                                } catch (e: any) {
                                    alert(`Sync failed: ${e.message}`)
                                } finally {
                                    setIsPending(false)
                                }
                            }}
                            disabled={isPending}
                        >
                            🔄 Sync Data
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {!isConnected && (
                    <p className="mb-4 text-sm text-yellow-700 dark:text-yellow-300">
                        You must connect your Sanity CMS before you can generate articles for this website.
                    </p>
                )}
                <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Website Name (Project Name)</label>
                        <Input
                            name="websiteName"
                            defaultValue={initialConfig.websiteName || ''}
                            placeholder="My Awesome Website"
                            required
                            className="bg-white dark:bg-gray-800"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Website URL</label>
                        <Input
                            name="websiteUrl"
                            defaultValue={initialConfig.websiteUrl || ''}
                            placeholder="https://example.com"
                            className="bg-white dark:bg-gray-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sanity Project ID</label>
                        <Input
                            name="projectId"
                            defaultValue={initialConfig.projectId || ''}
                            placeholder="e.g. 8p53q..."
                            required
                            className="bg-white dark:bg-gray-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sanity Dataset Name</label>
                        <Input
                            name="dataset"
                            defaultValue={initialConfig.dataset || ''}
                            placeholder="e.g. production"
                            required
                            className="bg-white dark:bg-gray-800"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Sanity API Write Token</label>
                        <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <Input
                                    name="sanityApiTokenLabel"
                                    defaultValue={initialConfig.sanityApiTokenLabel || ''}
                                    placeholder="Label (Optional)"
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    name="token"
                                    type="password"
                                    placeholder={isConnected ? "•••••••••••••••• (Leave blank to keep unchanged)" : "sk..."}
                                    required={!isConnected}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        {isConnected && <p className="text-xs text-gray-500">Only enter a new token if you want to update it.</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            Google Gemini API Key
                            {!hasGeminiKey && <span className="text-xs text-red-500 font-normal">(Required)</span>}
                        </label>
                        <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <Input
                                    name="geminiApiKeyLabel"
                                    defaultValue={initialConfig.geminiApiKeyLabel || ''}
                                    placeholder="Label (e.g. Personal Email)"
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    name="geminiApiKey"
                                    type="password"
                                    placeholder={hasGeminiKey ? "•••••••••••••••• (Leave blank to keep unchanged)" : "Your Gemini API Key"}
                                    required={!hasGeminiKey}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Label matches your key to an email/account so you don't forget which one it is.
                            Get key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google AI Studio</a>
                        </p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            Groq API Key (Fallback)
                            {!hasGeminiKey && !hasGroqKey && <span className="text-xs text-yellow-600 font-normal">(Optional - fallback if Gemini fails)</span>}
                            {hasGroqKey && <span className="text-xs text-green-600 font-normal">✓ Configured</span>}
                        </label>
                        <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <Input
                                    name="groqApiKeyLabel"
                                    defaultValue={initialConfig.groqApiKeyLabel || ''}
                                    placeholder="Label (e.g. Personal Email)"
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    name="groqApiKey"
                                    type="password"
                                    placeholder={hasGroqKey ? "•••••••••••••••• (Leave blank to keep unchanged)" : "Your Groq API Key (Optional)"}
                                    className="bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Groq provides fast, free AI inference. Get your API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Groq Console</a>
                        </p>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2">
                        {isConnected && (
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={isPending} className="gradient-primary text-white border-0">
                            {isPending ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
