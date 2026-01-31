'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { AVAILABLE_MODELS } from '@/lib/gemini'
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type Author = {
    id: string
    name: string
    sanity_id: string
}

type Category = {
    id: string
    title: string
    sanity_id: string
}

type ArticleGeneratorFormProps = {
    websiteName: string
    createJob: (formData: FormData) => Promise<void>
    authors: Author[]
    categories: Category[]
    disabled?: boolean
    preferredProvider?: string
    hasGeminiKey?: boolean
    hasGroqKey?: boolean
    preferredModel?: string | null
}

export default function ArticleGeneratorForm({
    websiteName,
    createJob,
    authors = [],
    categories = [],
    disabled = false,
    preferredProvider = 'auto',
    hasGeminiKey = false,
    hasGroqKey = false,
    preferredModel = null
}: ArticleGeneratorFormProps) {
    const [isPending, setIsPending] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState(preferredProvider || 'auto')
    const [selectedModel, setSelectedModel] = useState<string>(preferredModel || 'auto')
    const [showInternalLinking, setShowInternalLinking] = useState(false)
    const [date, setDate] = useState<Date>()
    const [hour, setHour] = useState("12")
    const [minute, setMinute] = useState("00")
    const [period, setPeriod] = useState<"AM" | "PM">("PM")
    const [userTier, setUserTier] = useState<'free' | 'pro'>('free')

    // Load tier from localStorage on mount
    useEffect(() => {
        const savedTier = localStorage.getItem('userTier') as 'free' | 'pro' | null;
        if (savedTier) {
            setUserTier(savedTier);
        }

        // Listen for tier changes
        const handleTierChange = (e: CustomEvent) => {
            setUserTier(e.detail.tier);
        };

        window.addEventListener('tierChanged', handleTierChange as EventListener);
        return () => window.removeEventListener('tierChanged', handleTierChange as EventListener);
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        // Validate Date & Time
        if (date) {
            let h = parseInt(hour)
            if (period === 'PM' && h !== 12) h += 12
            if (period === 'AM' && h === 12) h = 0

            const scheduledDateTime = new Date(date)
            scheduledDateTime.setHours(h, parseInt(minute), 0, 0)

            if (scheduledDateTime < new Date()) {
                alert("Scheduled time must be in the future.")
                return
            }
        }

        setIsPending(true)

        try {
            const form = event.currentTarget
            const formData = new FormData(form)

            // Handle Timezone Conversion
            const scheduledForInput = formData.get('scheduledFor') as string
            if (scheduledForInput) {
                // Input is "YYYY-MM-DDTHH:mm" in Local Time
                // Date constructor in browser treats ISO-like string without Z as Local
                const localDate = new Date(scheduledForInput)
                const utcIsoString = localDate.toISOString()

                // Replace the value with UTC string
                formData.set('scheduledFor', utcIsoString)
            }

            await createJob(formData)
            // Form reset is handled by the redirect/refresh in the action usually,
            // but if we want to be sure:
            form.reset()
        } catch (error) {
            console.error(error)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Card className="mb-8 border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    Generate Article for {websiteName}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <Input
                            name="keyword"
                            placeholder="Enter Article Topic / Keyword (e.g. Best Coffee Machines)"
                            required
                            className="flex-1"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[180px] justify-start text-left font-normal pl-3",
                                        !date && "text-muted-foreground"
                                    )}
                                    type="button"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Schedule</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="flex gap-1 items-center">
                            <Select value={hour} onValueChange={setHour}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="HH" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                        <SelectItem key={h} value={h.toString()}>
                                            {h.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-gray-400">:</span>
                            <Select value={minute} onValueChange={setMinute}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="MM" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                        <SelectItem key={m} value={m.toString().padStart(2, '0')}>
                                            {m.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={period} onValueChange={(val: "AM" | "PM") => setPeriod(val)}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <input
                            type="hidden"
                            name="scheduledFor"
                            value={date ? (() => {
                                let h = parseInt(hour)
                                if (period === 'PM' && h !== 12) h += 12
                                if (period === 'AM' && h === 12) h = 0
                                return `${format(date, 'yyyy-MM-dd')}T${h.toString().padStart(2, '0')}:${minute}:00`
                            })() : ''}
                        />
                    </div>

                    <div className="flex gap-6 px-1">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                name="includeImages"
                                defaultChecked
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                            />
                            Include Images
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                name="includeVideos"
                                defaultChecked
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                            />
                            Include Videos
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                name="useGoogleSearchLinks"
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                            />
                            Auto Links (Brave Search)
                        </label>
                    </div>

                    <div className="flex gap-4">
                        <select
                            name="authorId"
                            className="flex-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                        >
                            <option value="">Select Author (Optional)</option>
                            {authors.map(author => (
                                <option key={author.id} value={author.sanity_id}>{author.name}</option>
                            ))}
                        </select>

                        <select
                            name="intent"
                            className="flex-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                        >
                            <option value="informational">Informational (Default)</option>
                            <option value="howto">How-To Guide</option>
                            <option value="commercial">Single Product Review</option>
                            <option value="comparison">Comparison (X vs Y)</option>
                        </select>


                        <select
                            name="categoryId"
                            className="flex-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                        >
                            <option value="">Select Category (Optional)</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.sanity_id}>{category.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Model Selection Dropdown */}
                    <div className="space-y-2 px-1">
                        <Label htmlFor="model" className="text-sm font-medium">
                            AI Model
                        </Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger id="model">
                                <SelectValue placeholder="Auto (Recommended)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>Free Models</SelectLabel>
                                    {AVAILABLE_MODELS.free.map(model => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                {userTier === 'pro' && (
                                    <>
                                        <SelectSeparator />
                                        <SelectGroup>
                                            <SelectLabel>⭐ Pro Models</SelectLabel>
                                            {AVAILABLE_MODELS.pro.map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    {model.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {selectedModel === 'auto'
                                ? 'Automatically tries fastest model first with fallback'
                                : `Using ${AVAILABLE_MODELS.free.find(m => m.id === selectedModel)?.name || AVAILABLE_MODELS.pro.find(m => m.id === selectedModel)?.name}`
                            }
                        </p>
                        {/* Hidden input to send selected model to server */}
                        <input type="hidden" name="preferredModel" value={selectedModel === 'auto' ? '' : selectedModel} />
                    </div>

                    {/* Internal Linking Options */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-md p-4 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="includeInternalLinks"
                                    checked={showInternalLinking}
                                    onChange={(e) => setShowInternalLinking(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                />
                                Include Internal Links (Same Website)
                            </label>
                        </div>

                        {showInternalLinking && (
                            <div className="mt-2 pl-6">
                                <label className="text-xs text-gray-500 block mb-1">Link Density</label>
                                <select
                                    name="internalLinkDensity"
                                    className="h-9 w-full max-w-[200px] rounded-md border border-gray-200 bg-white px-3 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                                    defaultValue="medium"
                                >
                                    <option value="low">Low (2-3 links)</option>
                                    <option value="medium">Medium (3-5 links)</option>
                                    <option value="high">High (5-7 links)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Automatically finds relevant articles from this project to link to.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* AI Provider Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">AI Provider</label>
                        <select
                            name="aiProvider"
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                        >
                            <option value="auto">🔄 Auto (Intelligent Fallback)</option>
                            <option value="gemini" disabled={!hasGeminiKey}>
                                {hasGeminiKey ? '✓' : '⚠'} Gemini {hasGeminiKey ? '(Configured)' : '(API Key Required)'}
                            </option>
                            <option value="groq" disabled={!hasGroqKey}>
                                {hasGroqKey ? '✓' : '⚠'} Groq {hasGroqKey ? '(Configured)' : '(API Key Required)'}
                            </option>
                        </select>

                        {/* Validation Warnings */}
                        {selectedProvider === 'gemini' && !hasGeminiKey && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                                ⚠ <strong>Gemini API key required.</strong> Please add your Gemini API key in website settings above before generating content.
                            </div>
                        )}
                        {selectedProvider === 'groq' && !hasGroqKey && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                                ⚠ <strong>Groq API key required.</strong> Please add your Groq API key in website settings above before generating content.
                            </div>
                        )}
                        {selectedProvider === 'auto' && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-400">
                                ℹ <strong>Auto mode:</strong> Will try Gemini first{hasGeminiKey && ', then fall back to Groq if needed'}{!hasGeminiKey && !hasGroqKey && ', but you need at least one API key configured'}.
                            </div>
                        )}
                    </div>


                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={
                                isPending ||
                                disabled ||
                                (selectedProvider === 'gemini' && !hasGeminiKey) ||
                                (selectedProvider === 'groq' && !hasGroqKey) ||
                                (selectedProvider === 'auto' && !hasGeminiKey && !hasGroqKey)
                            }
                            className="gradient-primary text-white border-0"
                        >
                            {isPending ? 'Generating...' : 'Generate Article'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card >
    )
}
