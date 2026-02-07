'use client'

import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Job = {
    id: string
    keyword: string
    status: string
    scheduled_for?: string | null
    created_at: string
}

type ArticleCalendarViewProps = {
    jobs: Job[]
}

export default function ArticleCalendarView({ jobs }: ArticleCalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const resetToToday = () => setCurrentMonth(new Date())

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const getJobsForDate = (date: Date) => {
        return jobs.filter(job => {
            const jobDate = job.scheduled_for ? new Date(job.scheduled_for) : new Date(job.created_at)
            return isSameDay(jobDate, date)
        })
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white w-40">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={resetToToday} className="h-8 text-xs px-3">
                            Today
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {daysOfWeek.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 dark:bg-gray-800 gap-[1px]">
                {calendarDays.map((day, dayIdx) => {
                    const dayJobs = getJobsForDate(day)
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[120px] bg-white dark:bg-gray-950 p-2 flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50",
                                !isCurrentMonth && "bg-gray-50/50 dark:bg-gray-900/20 text-gray-400"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className={cn(
                                        "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                        isToday(day)
                                            ? "bg-purple-600 text-white"
                                            : "text-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                                {dayJobs.length > 0 && (
                                    <span className="text-xs text-gray-400 font-medium">
                                        {dayJobs.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                {dayJobs.map(job => (
                                    <div
                                        key={job.id}
                                        className={cn(
                                            "text-[10px] px-1.5 py-1 rounded truncate border w-full text-left font-medium",
                                            job.status === 'completed' && "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
                                            job.status === 'scheduled' && "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
                                            job.status === 'failed' && "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
                                            (job.status === 'pending' || job.status === 'processing') && "bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
                                        )}
                                        title={`${job.keyword} (${job.status})`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                job.status === 'completed' ? "bg-green-500" :
                                                    job.status === 'scheduled' ? "bg-blue-500" :
                                                        job.status === 'failed' ? "bg-red-500" :
                                                            "bg-yellow-500"
                                            )} />
                                            <span className="truncate">{job.keyword}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
