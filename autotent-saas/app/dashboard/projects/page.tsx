import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default async function ProjectsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Action to create project
    async function createProject(formData: FormData) {
        'use server'
        const name = formData.get('name') as string
        const projectId = formData.get('projectId') as string
        const dataset = formData.get('dataset') as string
        const token = formData.get('token') as string

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        await supabase.from('projects').insert({
            user_id: user.id,
            name,
            sanity_project_id: projectId,
            sanity_dataset: dataset,
            sanity_token: token
        })

        redirect('/dashboard/projects')
    }

    async function deleteProject(formData: FormData) {
        'use server'
        const projectId = formData.get('projectId') as string

        const supabase = await createClient()
        await supabase.from('projects').delete().eq('id', projectId)

        redirect('/dashboard/projects')
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <DashboardSidebar userEmail={user.email} />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Projects
                        </span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your Sanity CMS projects
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Projects</p>
                                <p className="text-3xl font-bold">{projects?.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                                <span className="text-2xl">📁</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Projects</p>
                                <p className="text-3xl font-bold">{projects?.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                                <p className="text-3xl font-bold">+{projects?.length || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center">
                                <span className="text-2xl">📈</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add New Project */}
                <Card className="mb-8 border-gray-200 dark:border-gray-700">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-2xl">➕</span>
                            Add New Project
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form action={createProject} className="grid md:grid-cols-2 gap-4">
                            <Input name="name" placeholder="Project Name (e.g. My Tech Blog)" required />
                            <Input name="projectId" placeholder="Sanity Project ID" required />
                            <Input name="dataset" placeholder="Dataset (e.g. production)" required />
                            <Input name="token" type="password" placeholder="Sanity API Token" required />
                            <div className="md:col-span-2">
                                <Button type="submit" className="gradient-primary text-white border-0 hover:shadow-lg">
                                    Connect Project
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Projects Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects?.map((project) => (
                        <div
                            key={project.id}
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
                        >
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
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Project ID: {project.sanity_project_id}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Dataset: {project.sanity_dataset}
                                </p>
                                <div className="flex gap-2">
                                    <form action={deleteProject} className="flex-1">
                                        <input type="hidden" name="projectId" value={project.id} />
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full text-red-600 border-red-300 hover:bg-red-50"
                                        >
                                            Delete
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ))}

                    {(!projects || projects.length === 0) && (
                        <div className="md:col-span-3 text-center py-12">
                            <span className="text-6xl mb-4 block">📁</span>
                            <h3 className="text-xl font-bold mb-2">No projects yet</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Create your first project to start generating content
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
