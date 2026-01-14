'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ArticleGeneratorFormProps = {
    websiteName: string
    createJob: (formData: FormData) => Promise<void>
}

export default function ArticleGeneratorForm({ websiteName, createJob }: ArticleGeneratorFormProps) {
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
                <form onSubmit={handleSubmit} className="flex gap-4">
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
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="gradient-primary text-white border-0 px-8"
                    >
                        {isPending ? 'Generating...' : 'Generate'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
