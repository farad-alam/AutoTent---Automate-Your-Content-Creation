'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    authors?: Author[]
    categories?: Category[]
}

export default function ArticleGeneratorForm({ websiteName, createJob, authors = [], categories = [] }: ArticleGeneratorFormProps) {
    const [isPending, setIsPending] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
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
                        <Input
                            type="datetime-local"
                            name="scheduledFor"
                            className="w-auto"
                            min={new Date().toISOString().slice(0, 16)}
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
                            name="categoryId"
                            className="flex-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300"
                        >
                            <option value="">Select Category (Optional)</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.sanity_id}>{category.title}</option>
                            ))}
                        </select>

                        <Button
                            type="submit"
                            disabled={isPending}
                            className="gradient-primary text-white border-0 px-8"
                        >
                            {isPending ? 'Generating...' : 'Generate'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
