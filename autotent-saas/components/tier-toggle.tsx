'use client'

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface TierToggleProps {
    initialTier?: 'free' | 'pro';
}

export default function TierToggle({ initialTier }: TierToggleProps) {
    const [tier, setTier] = useState<'free' | 'pro'>('free');

    // Load tier from localStorage on mount
    useEffect(() => {
        const savedTier = localStorage.getItem('userTier') as 'free' | 'pro' | null;
        if (savedTier) {
            setTier(savedTier);
        } else if (initialTier) {
            setTier(initialTier);
        }
    }, [initialTier]);

    function handleToggle(checked: boolean) {
        const newTier = checked ? 'pro' : 'free';
        setTier(newTier);
        localStorage.setItem('userTier', newTier);

        // Emit custom event so other components can react
        window.dispatchEvent(new CustomEvent('tierChanged', { detail: { tier: newTier } }));
    }

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Free</span>
                <Switch
                    checked={tier === 'pro'}
                    onCheckedChange={handleToggle}
                />
                <span className="text-sm font-medium">Pro</span>
            </div>
            {tier === 'pro' && (
                <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                    ⭐ Pro
                </Badge>
            )}
        </div>
    );
}
