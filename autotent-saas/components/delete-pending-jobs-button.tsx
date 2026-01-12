'use client'

import { useTransition } from 'react'

interface DeletePendingJobsButtonProps {
    action: () => Promise<void>
}

export default function DeletePendingJobsButton({ action }: DeletePendingJobsButtonProps) {
    const [isPending, startTransition] = useTransition()

    const handleClick = () => {
        if (confirm('Are you sure you want to delete all pending jobs? This action cannot be undone.')) {
            startTransition(async () => {
                await action()
            })
        }
    }

    return (
        <button
            onClick={handleClick}
            type="button"
            disabled={isPending}
            className="text-sm px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isPending ? '⏳ Deleting...' : '🗑️ Clear Pending Jobs'}
        </button>
    )
}
