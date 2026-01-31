'use server'

import { createClient } from '@/lib/supabase-server';
import { getAvailableModels, isModelAllowedForTier } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

export async function updateUserTier(tier: 'free' | 'pro') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('users')
        .update({ tier })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating tier:', error);
        return { success: false, error: error.message };
    }

    // Revalidate the page to reflect changes
    revalidatePath('/dashboard');

    return { success: true, tier };
}

export async function updatePreferredModel(modelId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    // Get user's tier to validate model access
    const { data: userData } = await supabase
        .from('users')
        .select('tier')
        .eq('id', user.id)
        .single();

    const tier = userData?.tier || 'free';

    // Validate model if one is selected
    if (modelId && !isModelAllowedForTier(modelId, tier)) {
        return {
            success: false,
            error: `Model "${modelId}" requires Pro tier. Upgrade to access premium models.`
        };
    }

    const { error } = await supabase
        .from('users')
        .update({ preferred_model: modelId })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating preferred model:', error);
        return { success: false, error: error.message };
    }

    return { success: true, modelId };
}

export async function getUserTierAndModel() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { tier: 'free' as const, preferredModel: null };
    }

    const { data } = await supabase
        .from('users')
        .select('tier, preferred_model')
        .eq('id', user.id)
        .single();

    return {
        tier: (data?.tier as 'free' | 'pro') || 'free',
        preferredModel: data?.preferred_model || null
    };
}
