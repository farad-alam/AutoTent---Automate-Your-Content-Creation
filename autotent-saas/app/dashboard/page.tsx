import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { inngest } from '@/inngest/client'
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
        const projectId = formData.get('projectId') as string
        const dataset = formData.get('dataset') as string
        const token = formData.get('token') as string

        const supabase = await createClient()
        await supabase.from('projects').insert({
            user_id: user!.id,
            name,
            sanity_project_id: projectId,
            sanity_dataset: dataset,
            sanity_token: token
        })
        redirect('/dashboard') // Refresh
    }

    async function createJob(formData: FormData) {
        'use server'
        const keyword = formData.get('keyword') as string
        const projectId = formData.get('project_id') as string

        if (!projectId) return

        const supabase = await createClient()
        const { data: job, error } = await supabase.from('jobs').insert({
            user_id: user!.id,
            project_id: projectId,
            keyword,
            status: 'pending'
        }).select().single()

        if (error) console.error(error)

        if (job) {
            // Trigger Inngest
            await inngest.send({
                name: "job/created",
                data: {
                    jobId: job.id,
                    projectId: projectId,
                    keyword: keyword
                }
            })
        }

        redirect('/dashboard')
    }

    // Fetch Data
    const { data: projects } = await supabase.from('projects').select('*').eq('user_id', user.id)
    const { data: jobs } = await supabase.from('jobs').select('*, projects(name)').eq('user_id', user.id).order('created_at', { ascending: false })

    // Calculate stats
    const totalProjects = projects?.length || 0
    const totalJobs = jobs?.length || 0
    const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
    const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

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
                        title="Total Projects"
                        value={totalProjects}
                        icon="📁"
                        gradient="primary"
                        trend={{ value: "12%", isPositive: true }}
                    />
                    <StatCard
                        title="Total Jobs"
                        value={totalJobs}
                        icon="⚡"
                        gradient="info"
                        trend={{ value: "8%", isPositive: true }}
                    />
                    <StatCard
                        title="Completed"
                        value={completedJobs}
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

                {/* Projects Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Your Projects
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projects?.map((project) => (
                            <div
                                key={project.id}
                                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
                            >
                                {/* Gradient Border Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                <div className="absolute inset-[1px] bg-white dark:bg-gray-800 rounded-2xl" />

                                <div className="relative p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
                                            <span className="text-2xl">📝</span>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                                            Connected
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {project.sanity_project_id}
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <span>Dataset: {project.sanity_dataset}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Project Card */}
                        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-2xl">➕</span>
                                    Add New Project
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form action={createProject} className="space-y-4">
                                    <Input name="name" placeholder="Project Name (e.g. My Tech Blog)" required className="border-gray-300 dark:border-gray-700" />
                                    <Input name="projectId" placeholder="Sanity Project ID" required className="border-gray-300 dark:border-gray-700" />
                                    <Input name="dataset" placeholder="Sanity Dataset (e.g. production)" required className="border-gray-300 dark:border-gray-700" />
                                    <Input name="token" type="password" placeholder="Sanity API Token" required className="border-gray-300 dark:border-gray-700" />
                                    <Button type="submit" className="w-full gradient-primary text-white border-0 hover:shadow-lg">
                                        Connect Sanity
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Jobs Section */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Content Generation Jobs
                    </h2>

                    {/* Create Job Form */}
                    <Card className="mb-6 border-gray-200 dark:border-gray-700">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-2xl">🚀</span>
                                Generate New Content
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={createJob} className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Select Project
                                    </label>
                                    <select
                                        name="project_id"
                                        className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 transition-all"
                                        required
                                    >
                                        <option value="">Select a project...</option>
                                        {projects?.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Primary Keyword
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            name="keyword"
                                            placeholder="e.g. Top 10 Running Shoes 2024"
                                            required
                                            className="flex-1 border-gray-300 dark:border-gray-700"
                                        />
                                        <Button type="submit" className="gradient-primary text-white border-0 hover:shadow-lg px-8">
                                            Generate
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Jobs Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Keyword
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Project
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Result
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {jobs?.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {job.keyword}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {job.projects?.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                                    job.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                                        job.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                }`}>
                                                {job.status === 'completed' && '✓ '}
                                                {job.status === 'processing' && '⟳ '}
                                                {job.status === 'failed' && '✗ '}
                                                {job.status === 'pending' && '⏳ '}
                                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {job.result_url ? (
                                                <a
                                                    href={job.result_url}
                                                    target="_blank"
                                                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium hover:underline"
                                                >
                                                    View in Studio →
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {(!jobs || jobs.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="text-gray-400 dark:text-gray-600">
                                                <span className="text-4xl mb-2 block">📝</span>
                                                <p className="text-lg font-medium mb-1">No jobs yet</p>
                                                <p className="text-sm">Start generating content by creating your first job above!</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    )
}
