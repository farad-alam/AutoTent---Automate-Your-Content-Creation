import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BulkSchedulePageClient from './page-client'

type PageProps = {
    params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function BulkSchedulePage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user } = {} } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch website
    const { data: website } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!website) {
        redirect('/dashboard')
    }

    // Fetch authors
    const { data: authors } = await supabase
        .from('sanity_authors')
        .select('*')
        .eq('project_id', id)
        .order('name')

    // Fetch categories
    const { data: categories } = await supabase
        .from('sanity_categories')
        .select('*')
        .eq('project_id', id)
        .order('title')

    // Check for API keys
    const hasGeminiKey = !!website.gemini_api_key_label
    const hasGroqKey = !!website.groq_api_key_label

    return (
        <BulkSchedulePageClient
            websiteId={id}
            websiteName={website.name}
            authors={authors || []}
            categories={categories || []}
            hasGeminiKey={hasGeminiKey}
            hasGroqKey={hasGroqKey}
        />
    )
}
