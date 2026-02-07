"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Plus, Trash2, FolderTree, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TopicCluster {
    id: string
    name: string
    pillar_job_id: string | null
    _count?: {
        jobs: number
    }
}

interface Job {
    id: string
    keyword: string
    title: string | null
    status: string
}

export function TopicClusterManager({ projectId }: { projectId: string }) {
    const [clusters, setClusters] = useState<TopicCluster[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newClusterName, setNewClusterName] = useState("")
    const [selectedPillarId, setSelectedPillarId] = useState<string>("none")
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchClusters()
        fetchJobs()
    }, [projectId])

    const fetchClusters = async () => {
        try {
            // Use the specific foreign key for the "jobs belong to cluster" relationship
            // likely: jobs_topic_cluster_id_fkey or similar. 
            // The error message suggested: jobs!jobs_topic_cluster_id_fkey
            const { data, error } = await supabase
                .from('topic_clusters')
                .select('*, jobs!jobs_topic_cluster_id_fkey(count)')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (error) throw error

            const formattedClusters = data.map((c: any) => ({
                ...c,
                _count: { jobs: c.jobs?.[0]?.count || 0 }
            }))

            setClusters(formattedClusters)
        } catch (error) {
            console.error('Error fetching clusters:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchJobs = async () => {
        try {
            console.log('Fetching jobs for project:', projectId)
            // Fetch executed jobs to use as pillars
            const { data, error } = await supabase
                .from('jobs')
                // Reverting to select('*') because explicit column selection was failing with 400 Bad Request
                // This seems to be the most robust way to fetch jobs for now.
                .select('*')
                .eq('project_id', projectId)
                // We'll filter in memory if needed, or just show all for now to avoid 400s
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Supabase error fetching jobs:', JSON.stringify(error, null, 2))
                throw error
            }
            console.log('Jobs fetched:', data?.length, data)
            setJobs(data || [])
        } catch (error: any) {
            console.error('Error fetching jobs:', error.message || error)
        }
    }

    const createCluster = async () => {
        if (!newClusterName.trim()) return

        try {
            const { error } = await supabase
                .from('topic_clusters')
                .insert({
                    project_id: projectId,
                    name: newClusterName,
                    pillar_job_id: selectedPillarId === "none" ? null : selectedPillarId
                })

            if (error) throw error

            toast({
                title: "Success",
                description: "Topic cluster created successfully",
            })

            setIsCreateOpen(false)
            setNewClusterName("")
            setSelectedPillarId("none")
            fetchClusters()
        } catch (error) {
            console.error('Error creating cluster:', error)
            toast({
                title: "Error",
                description: "Failed to create topic cluster",
                variant: "destructive"
            })
        }
    }

    const deleteCluster = async (id: string) => {
        try {
            const { error } = await supabase
                .from('topic_clusters')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({
                title: "Success",
                description: "Topic cluster deleted",
            })

            fetchClusters()
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete cluster",
                variant: "destructive"
            })
        }
    }

    const updatePillar = async (clusterId: string, pillarId: string) => {
        try {
            const { error } = await supabase
                .from('topic_clusters')
                .update({ pillar_job_id: pillarId === "none" ? null : pillarId })
                .eq('id', clusterId)

            if (error) throw error

            toast({
                title: "Success",
                description: "Pillar page updated",
            })

            fetchClusters()
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update pillar",
                variant: "destructive"
            })
        }
    }

    if (loading && clusters.length === 0) {
        return <div className="p-4 text-center text-sm text-gray-500">Loading clusters...</div>
    }

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <FolderTree className="h-5 w-5 text-indigo-500" />
                        Topic Clusters
                    </CardTitle>
                    <CardDescription>
                        Organize content into Authority Hubs for better SEO
                    </CardDescription>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> New Cluster
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Topic Cluster</DialogTitle>
                            <DialogDescription>
                                Group related articles to build tropical authority.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cluster Name</label>
                                <Input
                                    placeholder="e.g. Healthy Eating Guide"
                                    value={newClusterName}
                                    onChange={(e) => setNewClusterName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pillar Page (The Hub)</label>
                                <Select value={selectedPillarId} onValueChange={setSelectedPillarId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a pillar page (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- No Pillar Selected --</SelectItem>
                                        {jobs.map((job) => (
                                            <SelectItem key={job.id} value={job.id}>
                                                {job.title || job.keyword}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    Select an existing article to serve as the main Hub for this topic.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={createCluster}>Create Cluster</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {clusters.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 border-2 border-dashed rounded-lg">
                        <p>No topic clusters yet.</p>
                        <p className="text-xs mt-1">Create one to start grouping your content.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {clusters.map((cluster) => {
                            const pillarJob = jobs.find(j => j.id === cluster.pillar_job_id);
                            return (
                                <div key={cluster.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-2">
                                            {cluster.name}
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                {cluster._count?.jobs || 0} articles
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">HUB:</span>
                                            <Select
                                                value={cluster.pillar_job_id || "none"}
                                                onValueChange={(val) => updatePillar(cluster.id, val)}
                                            >
                                                <SelectTrigger className="h-7 w-[200px] text-xs border-slate-200 bg-white">
                                                    <SelectValue placeholder="Select Hub" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Hub Assigned</SelectItem>
                                                    {jobs.map((job) => (
                                                        <SelectItem key={job.id} value={job.id}>
                                                            <span className="truncate max-w-[180px] block" title={job.title || job.keyword}>
                                                                {job.title || job.keyword}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => deleteCluster(cluster.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
