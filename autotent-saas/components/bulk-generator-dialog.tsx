'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AVAILABLE_MODELS } from '@/lib/gemini'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBulkJobs, BulkJobData } from '@/app/actions/bulk-actions'
import { useRouter } from 'next/navigation'

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

interface BulkGeneratorDialogProps {
    websiteId: string
    websiteName: string
    authors: Author[]
    categories: Category[]
    hasGeminiKey?: boolean
    hasGroqKey?: boolean
}

interface ScheduleItem {
    keyword: string
    date: Date | undefined
    hour: string
    minute: string
    period: 'AM' | 'PM'
    categoryId: string
    intent: string
    model: string
}

export default function BulkGeneratorDialog({
    websiteId,
    websiteName,
    authors,
    categories,
    hasGeminiKey = false,
    hasGroqKey = false
}: BulkGeneratorDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)
    const [isPending, setIsPending] = useState(false)
    const [userTier, setUserTier] = useState<'free' | 'pro'>('free')

    // Step 1 State
    const [keywordsInput, setKeywordsInput] = useState('')
    const [selectedAuthor, setSelectedAuthor] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [selectedIntent, setSelectedIntent] = useState('informational')
    const [selectedModel, setSelectedModel] = useState('auto')
    const [selectedProvider, setSelectedProvider] = useState('auto')
    const [includeImages, setIncludeImages] = useState(true)
    const [includeVideos, setIncludeVideos] = useState(true)
    const [useGoogleSearchLinks, setUseGoogleSearchLinks] = useState(false)
    const [includeInternalLinks, setIncludeInternalLinks] = useState(false)
    const [internalLinkDensity, setInternalLinkDensity] = useState('medium')

    // Step 2 State
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
    const [autoStartDate, setAutoStartDate] = useState<Date>()
    const [postsPerDay, setPostsPerDay] = useState('1')
    const [timeGapMinutes, setTimeGapMinutes] = useState('30')
    const [startHour, setStartHour] = useState('8')
    const [startMinute, setStartMinute] = useState('00')
    const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM')

    // Load tier from localStorage
    useEffect(() => {
        const savedTier = localStorage.getItem('userTier') as 'free' | 'pro' | null
        if (savedTier) {
            setUserTier(savedTier)
        }

        const handleTierChange = (e: CustomEvent) => {
            setUserTier(e.detail.tier)
        }

        window.addEventListener('tierChanged', handleTierChange as EventListener)
        return () => window.removeEventListener('tierChanged', handleTierChange as EventListener)
    }, [])

    const handleStep1Next = () => {
        const keywords = keywordsInput
            .split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0)

        if (keywords.length === 0) {
            alert('Please enter at least one keyword')
            return
        }

        // Initialize schedule items with default times and global settings
        const items: ScheduleItem[] = keywords.map(keyword => ({
            keyword,
            date: undefined,
            hour: '12',
            minute: '00',
            period: 'PM',
            categoryId: selectedCategory,
            intent: selectedIntent,
            model: selectedModel
        }))

        setScheduleItems(items)
        setStep(2)
    }

    const handleAutoDistribute = () => {
        if (!autoStartDate) {
            alert('Please select a start date')
            return
        }

        const postsPerDayNum = parseInt(postsPerDay)
        if (postsPerDayNum < 1) {
            alert('Posts per day must be at least 1')
            return
        }

        const timeGapMins = parseInt(timeGapMinutes)
        if (timeGapMins < 1) {
            alert('Time gap must be at least 1 minute')
            return
        }

        const updatedItems = scheduleItems.map((item, index) => {
            const dayOffset = Math.floor(index / postsPerDayNum)
            const postIndexInDay = index % postsPerDayNum

            const scheduleDate = new Date(autoStartDate)
            scheduleDate.setDate(scheduleDate.getDate() + dayOffset)

            // Calculate time based on custom start time and time gap
            let baseHour = parseInt(startHour)
            if (startPeriod === 'PM' && baseHour !== 12) baseHour += 12
            if (startPeriod === 'AM' && baseHour === 12) baseHour = 0

            const baseMinutesFromMidnight = baseHour * 60 + parseInt(startMinute)
            const totalMinutesFromMidnight = baseMinutesFromMidnight + (postIndexInDay * timeGapMins)

            const totalHours = Math.floor(totalMinutesFromMidnight / 60) % 24
            const minutes = totalMinutesFromMidnight % 60

            let hour = totalHours % 12
            if (hour === 0) hour = 12
            const period: 'AM' | 'PM' = totalHours >= 12 ? 'PM' : 'AM'

            return {
                ...item,
                date: scheduleDate,
                hour: hour.toString(),
                minute: minutes.toString().padStart(2, '0'),
                period
            }
        })

        setScheduleItems(updatedItems)
    }

    const updateScheduleItem = (index: number, updates: Partial<ScheduleItem>) => {
        setScheduleItems(prev => {
            const newItems = [...prev]
            newItems[index] = { ...newItems[index], ...updates }
            return newItems
        })
    }

    const removeScheduleItem = (index: number) => {
        setScheduleItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        // Validate all items have dates
        const invalidItems = scheduleItems.filter(item => !item.date)
        if (invalidItems.length > 0) {
            alert(`Please set dates for all keywords (${invalidItems.length} missing)`)
            return
        }

        setIsPending(true)

        try {
            const jobs: BulkJobData[] = scheduleItems.map(item => {
                let h = parseInt(item.hour)
                if (item.period === 'PM' && h !== 12) h += 12
                if (item.period === 'AM' && h === 12) h = 0

                const scheduledDateTime = new Date(item.date!)
                scheduledDateTime.setHours(h, parseInt(item.minute), 0, 0)

                return {
                    keyword: item.keyword,
                    scheduledFor: scheduledDateTime.toISOString(),
                    authorId: selectedAuthor || null,
                    categoryId: item.categoryId || null,
                    preferredModel: item.model === 'auto' ? null : item.model,
                    intent: item.intent,
                    aiProvider: selectedProvider,
                    includeImages,
                    includeVideos,
                    useGoogleSearchLinks,
                    includeInternalLinks,
                    internalLinkDensity,
                    topicClusterId: null // Not supported in this dialog version yet
                }
            })

            await createBulkJobs(websiteId, jobs)

            // Success - close dialog and refresh
            setOpen(false)
            router.refresh()
        } catch (error: any) {
            console.error('Bulk schedule error:', error)
            alert(`Failed to schedule posts: ${error.message}`)
        } finally {
            setIsPending(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setStep(1)
        setKeywordsInput('')
        setScheduleItems([])
    }

    if (!open) {
        return (
            <Button
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={() => setOpen(true)}
            >
                📋 Bulk Schedule
            </Button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-[800px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className="text-lg font-semibold">Bulk Schedule for {websiteName}</h3>
                        <p className="text-sm text-gray-500">Step {step} of 2</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="keywords">Keywords (one per line)</Label>
                                <textarea
                                    id="keywords"
                                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Best Coffee Machines&#10;How to Make Coffee&#10;Coffee Grinder Reviews"
                                    value={keywordsInput}
                                    onChange={(e) => setKeywordsInput(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {keywordsInput.split('\n').filter(k => k.trim()).length} keywords
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Author</Label>
                                    <select
                                        value={selectedAuthor}
                                        onChange={(e) => setSelectedAuthor(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select Author (Optional)</option>
                                        {authors.map(author => (
                                            <option key={author.id} value={author.sanity_id}>{author.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select Category (Optional)</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.sanity_id}>{category.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Intent</Label>
                                    <select
                                        value={selectedIntent}
                                        onChange={(e) => setSelectedIntent(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="informational">Informational</option>
                                        <option value="howto">How-To Guide</option>
                                        <option value="commercial">Single Product Review</option>
                                        <option value="comparison">Comparison (X vs Y)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>AI Model</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Auto" />
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
                                </div>
                            </div>

                            <div className="flex gap-4 flex-wrap">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeImages}
                                        onChange={(e) => setIncludeImages(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                    />
                                    Include Images
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeVideos}
                                        onChange={(e) => setIncludeVideos(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                    />
                                    Include Videos
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useGoogleSearchLinks}
                                        onChange={(e) => setUseGoogleSearchLinks(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                    />
                                    Auto Links (Brave Search)
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeInternalLinks}
                                        onChange={(e) => setIncludeInternalLinks(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                    />
                                    Internal Links
                                </label>
                            </div>

                            {includeInternalLinks && (
                                <div className="space-y-2 pl-6">
                                    <Label className="text-xs">Link Density</Label>
                                    <select
                                        value={internalLinkDensity}
                                        onChange={(e) => setInternalLinkDensity(e.target.value)}
                                        className="h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="low">Low (2-3 links)</option>
                                        <option value="medium">Medium (3-5 links)</option>
                                        <option value="high">High (5-7 links)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Auto-schedule controls */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-sm">Auto-Schedule Settings</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Start Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !autoStartDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {autoStartDate ? format(autoStartDate, "PPP") : "Pick date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={autoStartDate}
                                                    onSelect={setAutoStartDate}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Posts/Day</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={postsPerDay}
                                            onChange={(e) => setPostsPerDay(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Time Gap (mins)</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={timeGapMinutes}
                                            onChange={(e) => setTimeGapMinutes(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Start Time</Label>
                                        <div className="flex gap-1">
                                            <Select value={startHour} onValueChange={setStartHour}>
                                                <SelectTrigger className="w-[50px] h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                        <SelectItem key={h} value={h.toString()}>{h.toString().padStart(2, '0')}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <span className="flex items-center text-gray-400">:</span>
                                            <Select value={startMinute} onValueChange={setStartMinute}>
                                                <SelectTrigger className="w-[50px] h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                                        <SelectItem key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={startPeriod} onValueChange={(val: 'AM' | 'PM') => setStartPeriod(val)}>
                                                <SelectTrigger className="w-[55px] h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="AM">AM</SelectItem>
                                                    <SelectItem value="PM">PM</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">&nbsp;</Label>
                                        <Button onClick={handleAutoDistribute} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                            Apply Auto-Schedule
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule items list */}
                            <div className="space-y-2">
                                <Label>Scheduled Posts ({scheduleItems.length})</Label>
                                <div className="max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg divide-y">
                                    {scheduleItems.map((item, index) => (
                                        <div key={index} className="p-3 space-y-2">
                                            <div className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -m-3 p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.keyword}</p>
                                                </div>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn(
                                                                "text-xs",
                                                                !item.date && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                                            {item.date ? format(item.date, "MMM dd") : "Set date"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={item.date}
                                                            onSelect={(date) => updateScheduleItem(index, { date })}
                                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <div className="flex gap-1">
                                                    <Select value={item.hour} onValueChange={(val) => updateScheduleItem(index, { hour: val })}>
                                                        <SelectTrigger className="w-[60px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                                                <SelectItem key={h} value={h.toString()}>
                                                                    {h.toString().padStart(2, '0')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <span className="text-gray-400 text-xs self-center">:</span>
                                                    <Select value={item.minute} onValueChange={(val) => updateScheduleItem(index, { minute: val })}>
                                                        <SelectTrigger className="w-[60px] h-8 text-xs">
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
                                                    <Select value={item.period} onValueChange={(val: 'AM' | 'PM') => updateScheduleItem(index, { period: val })}>
                                                        <SelectTrigger className="w-[60px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AM">AM</SelectItem>
                                                            <SelectItem value="PM">PM</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => removeScheduleItem(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 pl-3">
                                                <div>
                                                    <Label className="text-[10px] text-gray-500">Category</Label>
                                                    <select
                                                        value={item.categoryId}
                                                        onChange={(e) => updateScheduleItem(index, { categoryId: e.target.value })}
                                                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    >
                                                        <option value="">None</option>
                                                        {categories.map(category => (
                                                            <option key={category.id} value={category.sanity_id}>{category.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-gray-500">Intent</Label>
                                                    <select
                                                        value={item.intent}
                                                        onChange={(e) => updateScheduleItem(index, { intent: e.target.value })}
                                                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    >
                                                        <option value="informational">Info</option>
                                                        <option value="howto">How-To</option>
                                                        <option value="commercial">Review</option>
                                                        <option value="comparison">Compare</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-gray-500">AI Model</Label>
                                                    <Select value={item.model} onValueChange={(val) => updateScheduleItem(index, { model: val })}>
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="auto">Auto</SelectItem>
                                                            {AVAILABLE_MODELS.free.map(model => (
                                                                <SelectItem key={model.id} value={model.id}>
                                                                    {model.name}
                                                                </SelectItem>
                                                            ))}
                                                            {userTier === 'pro' && AVAILABLE_MODELS.pro.map(model => (
                                                                <SelectItem key={model.id} value={model.id}>
                                                                    ⭐ {model.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-3">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleStep1Next} className="bg-purple-600 hover:bg-purple-700 text-white">
                                Next: Configure Schedule →
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)}>
                                ← Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isPending || scheduleItems.length === 0}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isPending ? 'Scheduling...' : `Schedule ${scheduleItems.length} Posts`}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
