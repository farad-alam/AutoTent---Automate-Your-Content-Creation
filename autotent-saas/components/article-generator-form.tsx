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
import { Calendar as CalendarIcon, Settings, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import Link from 'next/link'

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

type TopicCluster = {
    id: string
    name: string
}

type ArticleGeneratorFormProps = {
    websiteName: string
    websiteId: string
    createJob: (formData: FormData) => Promise<void>
    authors: Author[]
    categories: Category[]
    topicClusters?: TopicCluster[]
    disabled?: boolean
    preferredProvider?: string
    hasGeminiKey?: boolean
    hasGroqKey?: boolean
    preferredModel?: string | null
}

export default function ArticleGeneratorForm({
    websiteName,
    websiteId,
    createJob,
    authors = [],
    categories = [],
    topicClusters = [],
    disabled = false,
    preferredProvider = 'auto',
    hasGeminiKey = false,
    hasGroqKey = false,
    preferredModel = null
}: ArticleGeneratorFormProps) {
    const [isPending, setIsPending] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState(preferredProvider || 'auto')
    const [selectedModel, setSelectedModel] = useState<string>(preferredModel || 'auto')

    // Internal Linking state managed via a single dropdown logic
    const [internalLinkMode, setInternalLinkMode] = useState<'off' | 'low' | 'medium' | 'high'>('off')

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
                const localDate = new Date(scheduledForInput)
                const utcIsoString = localDate.toISOString()
                formData.set('scheduledFor', utcIsoString)
            }

            await createJob(formData)
            form.reset()
        } catch (error) {
            console.error(error)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Card className="mb-8 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 py-4 px-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        Generate Article
                    </CardTitle>
                    <Link href={`/dashboard/websites/${websiteId}/bulk-schedule`}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8"
                        >
                            📋 Bulk Schedule
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                    {/* Row 1: Keyword & Schedule */}
                    <div className="flex gap-3">
                        <Input
                            name="keyword"
                            placeholder="Enter Article Topic / Keyword"
                            required
                            className="flex-1 font-medium"
                        />

                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[140px] justify-start text-left font-normal pl-3",
                                            !date && "text-muted-foreground"
                                        )}
                                        type="button"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "MMM dd") : <span>Date</span>}
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

                            {date && (
                                <div className="flex gap-1 items-center bg-gray-50 dark:bg-gray-900 p-1 rounded-md border border-gray-200 dark:border-gray-800">
                                    <Select value={hour} onValueChange={setHour}>
                                        <SelectTrigger className="w-[55px] h-8 border-0 bg-transparent focus:ring-0 p-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                                <SelectItem key={h} value={h.toString()}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-gray-300">:</span>
                                    <Select value={minute} onValueChange={setMinute}>
                                        <SelectTrigger className="w-[55px] h-8 border-0 bg-transparent focus:ring-0 p-1">
                                            <SelectValue />
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
                                        <SelectTrigger className="w-[55px] h-8 border-0 bg-transparent focus:ring-0 p-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AM">AM</SelectItem>
                                            <SelectItem value="PM">PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

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
                    </div>

                    {/* Row 2: Author, Category, Topic Cluster */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <select
                                name="authorId"
                                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:border-gray-800 dark:bg-gray-950"
                            >
                                <option value="">Select Author (Optional)</option>
                                {authors.map(author => (
                                    <option key={author.id} value={author.sanity_id}>{author.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                name="categoryId"
                                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:border-gray-800 dark:bg-gray-950"
                            >
                                <option value="">Select Category (Optional)</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.sanity_id}>{category.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                name="topicClusterId"
                                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:border-gray-800 dark:bg-gray-950"
                            >
                                <option value="">Select Topic Cluster (Optional)</option>
                                {topicClusters.map(cluster => (
                                    <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Intent, Model, Internal Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Intent */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent</Label>
                            <Select name="intent" defaultValue="informational">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="informational">Informational</SelectItem>
                                    <SelectItem value="howto">How-To Guide</SelectItem>
                                    <SelectItem value="commercial">Product Review</SelectItem>
                                    <SelectItem value="comparison">Comparison</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* AI Model */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Model</Label>
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                                    <SelectSeparator />
                                    <SelectGroup>
                                        <SelectLabel>Free Models</SelectLabel>
                                        {AVAILABLE_MODELS.free.map(model => (
                                            <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {userTier === 'pro' && (
                                        <>
                                            <SelectSeparator />
                                            <SelectGroup>
                                                <SelectLabel>Pro Models</SelectLabel>
                                                {AVAILABLE_MODELS.pro.map(model => (
                                                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                            <input type="hidden" name="preferredModel" value={selectedModel === 'auto' ? '' : selectedModel} />
                        </div>

                        {/* Internal Links */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Links</Label>
                            <Select
                                value={internalLinkMode}
                                onValueChange={(val: any) => setInternalLinkMode(val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="off">Off</SelectItem>
                                    <SelectItem value="low">Low Density</SelectItem>
                                    <SelectItem value="medium">Medium Density</SelectItem>
                                    <SelectItem value="high">High Density</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Hidden inputs to map the single dropdown to the expected form fields */}
                            {internalLinkMode !== 'off' && (
                                <>
                                    <input type="checkbox" name="includeInternalLinks" checked readOnly className="hidden" />
                                    <input type="hidden" name="internalLinkDensity" value={internalLinkMode} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800" />

                    {/* Bottom Row: Options & Actions */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">

                        {/* Checkboxes Group */}
                        <div className="flex items-center gap-5">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    name="includeImages"
                                    defaultChecked
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                />
                                Images
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    name="includeVideos"
                                    defaultChecked
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                />
                                Videos
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    name="useGoogleSearchLinks"
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                />
                                Auto Links
                            </label>
                        </div>

                        {/* AI Provider & Submit */}
                        <div className="flex items-center gap-3">
                            <Select
                                name="aiProvider"
                                value={selectedProvider}
                                onValueChange={setSelectedProvider}
                            >
                                <SelectTrigger className="w-[140px] h-9 text-xs">
                                    <SelectValue placeholder="Provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Provider: Auto</SelectItem>
                                    <SelectItem value="gemini" disabled={!hasGeminiKey}>Provider: Gemini</SelectItem>
                                    <SelectItem value="groq" disabled={!hasGroqKey}>Provider: Groq</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                type="submit"
                                disabled={
                                    isPending ||
                                    disabled ||
                                    (selectedProvider === 'gemini' && !hasGeminiKey) ||
                                    (selectedProvider === 'groq' && !hasGroqKey) ||
                                    (selectedProvider === 'auto' && !hasGeminiKey && !hasGroqKey)
                                }
                                className="gradient-primary text-white border-0 px-6"
                            >
                                {isPending ? 'Generating...' : 'Generate Article'}
                            </Button>
                        </div>
                    </div>
                    {/* Provider Warnings (Compact) */}
                    {(selectedProvider === 'gemini' && !hasGeminiKey) && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            ⚠ Gemini API key required.
                        </div>
                    )}
                    {(selectedProvider === 'groq' && !hasGroqKey) && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            ⚠ Groq API key required.
                        </div>
                    )}
                </form>
            </CardContent>
        </Card >
    )
}
