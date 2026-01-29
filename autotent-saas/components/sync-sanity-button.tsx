'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { syncExistingPosts } from '@/app/actions/sync-actions';

export default function SyncSanityButton({ projectId }: { projectId: string }) {
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSync() {
        setSyncing(true);
        setMessage('');

        try {
            const result = await syncExistingPosts(projectId);

            if (result.success) {
                if (!result.count || result.count === 0) {
                    setMessage('✅ All posts already synced');
                } else {
                    setMessage(`✅ Synced ${result.count} posts successfully`);
                }
            } else {
                setMessage(`❌ Error: ${result.error}`);
            }
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div className="space-y-2">
            <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                size="sm"
            >
                {syncing ? 'Syncing...' : '🔄 Sync Existing Posts'}
            </Button>
            {message && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {message}
                </p>
            )}
        </div>
    );
}
