'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface DeleteJobButtonProps {
    jobId: string
    action: (formData: FormData) => Promise<void>
}

export default function DeleteJobButton({ jobId, action }: DeleteJobButtonProps) {
    const [isPending, setIsPending] = useState(false)

    const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!confirm('Are you sure you want to delete this scheduled job?')) {
            return
        }

        setIsPending(true)
        try {
            const formData = new FormData(e.currentTarget)
            await action(formData)
        } catch (error) {
            console.error('Failed to delete job:', error)
            alert('Failed to delete job. Please try again.')
            setIsPending(false)
        }
    }

    return (
        <form onSubmit={handleDelete}>
            <input type="hidden" name="jobId" value={jobId} />
            <button
                type="submit"
                disabled={isPending}
                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete job"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </form>
    )
}
