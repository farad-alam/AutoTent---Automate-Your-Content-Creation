'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { AVAILABLE_MODELS, AIModel } from '@/lib/gemini'
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Edit2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface EditJobDialogProps {
    job: any
    websiteId: string
    authors: any[]
    categories: any[]
    updateJob: (jobId: string, formData: FormData) => Promise<void>
}

export default function EditJobDialog({
    job,
    websiteId,
    authors,
    categories,
    updateJob
}: EditJobDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [userTier, setUserTier] = useState<'free' | 'pro'>('free')

    // Load tier from localStorage on mount
    useEffect(() => {
        const savedTier = localStorage.getItem('userTier') as 'free' | 'pro' | null;
        if (savedTier) {
            setUserTier(savedTier);
        }

        const handleTierChange = (e: CustomEvent) => {
            setUserTier(e.detail.tier);
        };

        window.addEventListener('tierChanged', handleTierChange as EventListener);
        return () => window.removeEventListener('tierChanged', handleTierChange as EventListener);
    }, []);

    // Initial Date/Time Parsing
    const initialDate = job.scheduled_for ? new Date(job.scheduled_for) : new Date()
    const initialHour = job.scheduled_for ? ((new Date(job.scheduled_for).getHours() % 12) || 12).toString() : "12"
    const initialMinute = job.scheduled_for ? new Date(job.scheduled_for).getMinutes().toString().padStart(2, '0') : "00"
    const initialPeriod = job.scheduled_for ? (new Date(job.scheduled_for).getHours() >= 12 ? "PM" : "AM") : "PM"

    const [date, setDate] = useState<Date | undefined>(initialDate)
    const [hour, setHour] = useState(initialHour)
    const [minute, setMinute] = useState(initialMinute)
    const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod)
    const [selectedModel, setSelectedModel] = useState<string>(job.preferred_model || 'auto')

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
            const formData = new FormData(event.currentTarget)
            await updateJob(job.id, formData)
            setOpen(false)
        } catch (error) {
            console.error(error)
            alert("Failed to update job. Check console for details.")
        } finally {
            setIsPending(false)
        }
    }

    const allModels = [...AVAILABLE_MODELS.free, ...AVAILABLE_MODELS.pro]

    if (!open) {
        return (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setOpen(true)}>
                <Edit2 className="h-4 w-4" />
            </Button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-[500px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-semibold">Edit Scheduled Post</h3>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <form id="edit-job-form" onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="keyword">Topic / Keyword</Label>
                            <Input
                                id="keyword"
                                name="keyword"
                                defaultValue={job.keyword}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Author</Label>
                            <select
                                name="authorId"
                                defaultValue={job.sanity_author_id || ""}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Author (Optional)</option>
                                {authors.map(author => (
                                    <option key={author.id} value={author.sanity_id}>{author.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <select
                                name="categoryId"
                                defaultValue={job.sanity_category_id || ""}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Category (Optional)</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.sanity_id}>{category.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Intent</Label>
                            <select
                                name="intent"
                                defaultValue={job.intent || "informational"}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="informational">Informational</option>
                                <option value="howto">How-To Guide</option>
                                <option value="commercial">Single Product Review</option>
                                <option value="comparison">Comparison (X vs Y)</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label>AI Model</Label>
                            <Select name="preferredModel" value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select AI Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">
                                        <span className="flex items-center gap-2">
                                            <span>✨</span>
                                            <span>Auto (Recommended)</span>
                                        </span>
                                    </SelectItem>
                                    {allModels.map((model: AIModel) => (
                                        <SelectItem key={model.id} value={model.id} disabled={userTier === 'free' && model.tier === 'pro'}>
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-2">
                                                    <span>- {model.name}</span>
                                                    {model.tier === 'pro' && (
                                                        <span className="ml-1 text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 rounded-full font-bold">PRO</span>
                                                    )}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {userTier === 'free' && selectedModel !== 'auto' && allModels.find(m => m.id === selectedModel)?.tier === 'pro' && (
                                <p className="text-xs text-red-500">Upgrade to Pro to use this model.</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Schedule Date</Label>
                            <div className="flex gap-4">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[240px] justify-start text-left font-normal pl-3",
                                                !date && "text-muted-foreground"
                                            )}
                                            type="button"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Schedule Time</Label>
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
                        </div>

                        {/* Hidden Input for Scheduled Time */}
                        <input
                            type="hidden"
                            name="scheduledFor"
                            value={date ? (() => {
                                let h = parseInt(hour)
                                if (period === 'PM' && h !== 12) h += 12
                                if (period === 'AM' && h === 12) h = 0
                                const d = new Date(date)
                                d.setHours(h, parseInt(minute), 0, 0)
                                return d.toISOString()
                            })() : ''}
                        />
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="edit-job-form" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
