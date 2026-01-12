import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import DashboardSidebar from '@/components/dashboard-sidebar'
import StatCard from '@/components/stat-card'

export default async function Dashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()


    if (!user) {
        redirect('/login')
    }

    // Actions
    async function createProject(formData: FormData) {
        'use server'
        const name = formData.get('name') as string
        const url = formData.get('url') as string
        // Sanity fields are now optional/added later

        const supabase = await createClient()
        await supabase.from('projects').insert({
            user_id: user!.id,
            name,
            url,
            // sanity_* fields will be null initially
        })
        redirect('/dashboard') // Refresh
    }

    // Fetch Data
    const { data: projects } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

    // Calculate stats
    const totalProjects = projects?.length || 0
    // Fetch article counts for stats
    const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const { count: completedJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed')

    const successRate = (totalJobs && totalJobs > 0) ? Math.round(((completedJobs || 0) / totalJobs) * 100) : 0

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Dashboard
                        </span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Welcome back! Here's your content generation overview.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="My Websites"
                        value={totalProjects}
                        icon="🌐"
                        gradient="primary"
                        trend={{ value: "+1", isPositive: true }}
                    />
                    <StatCard
                        title="Total Articles"
                        value={totalJobs || 0}
                        icon="⚡"
                        gradient="info"
                        trend={{ value: "8%", isPositive: true }}
                    />
                    <StatCard
                        title="Published Articles"
                        value={completedJobs || 0}
                        icon="✅"
                        gradient="success"
                        trend={{ value: "15%", isPositive: true }}
                    />
                    <StatCard
                        title="Success Rate"
                        value={`${successRate}%`}
                        icon="🎯"
                        gradient="warning"
                        trend={{ value: "5%", isPositive: true }}
                    />
                </div>

                {/* Websites List Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            My Websites
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projects?.map((project) => (
                            <Link
                                href={`/dashboard/websites/${project.id}`}
                                key={project.id}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all block"
                            >
                                {/* Gradient Border Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                <div className="absolute inset-[1px] bg-white dark:bg-gray-800 rounded-2xl" />

                                <div className="relative p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
                                            <span className="text-2xl">🌐</span>
                                        </div>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${project.sanity_project_id
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                            {project.sanity_project_id ? 'CMS Connected' : 'Setup Required'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 truncate">
                                        {project.url || 'No URL configured'}
                                    </p>
                                    <div className="flex items-center text-xs text-purple-600 font-medium">
                                        <span>Manage Website →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* Add New Website Card */}
                        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-2xl">➕</span>
                                    Add New Website
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form action={createProject} className="space-y-4">
                                    <Input name="name" placeholder="Website Name (e.g. My Tech Blog)" required className="border-gray-300 dark:border-gray-700" />
                                    <Input name="url" placeholder="Website URL (e.g. https://example.com)" className="border-gray-300 dark:border-gray-700" />
                                    <Button type="submit" className="w-full gradient-primary text-white border-0 hover:shadow-lg">
                                        Create Website
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>
        </div>
    )
}
