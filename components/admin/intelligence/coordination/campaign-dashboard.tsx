"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  TrendingUp,
  Target
} from "lucide-react"

type CampaignStatus = "planning" | "active" | "paused" | "completed" | "cancelled"
type CampaignRole = "lead" | "operator" | "observer" | "analyst"
type TaskStatus = "pending" | "in_progress" | "completed" | "failed"
type TaskPriority = "low" | "medium" | "high" | "critical"

interface Campaign {
  id: string
  name: string
  description: string | null
  status: CampaignStatus
  leadOperatorId: string | null
  targetCount: number
  startDate: number | null
  endDate: number | null
  createdAt: number
  updatedAt: number
}

interface CampaignAssignment {
  id: string
  campaignId: string
  operatorId: string
  role: CampaignRole
  assignedAt: number
  operator?: {
    id: string
    username: string
    role: string
  }
}

interface CampaignTask {
  id: string
  campaignId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string | null
  dueDate: number | null
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

interface CampaignStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  failedTasks: number
  totalAssignments: number
  progress: number
}

interface CampaignDashboardProps {
  className?: string
}

export function CampaignDashboard({ className }: CampaignDashboardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [assignments, setAssignments] = useState<CampaignAssignment[]>([])
  const [tasks, setTasks] = useState<CampaignTask[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    status: "planning" as CampaignStatus,
    targetCount: 0,
    startDate: "",
    endDate: "",
  })

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assignedTo: "",
    dueDate: "",
  })

  const [assignForm, setAssignForm] = useState({
    operatorId: "",
    role: "operator" as CampaignRole,
  })

  // Fetch campaigns
  useEffect(() => {
    fetchCampaigns()
  }, [])

  // Fetch campaign details when selected
  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignDetails(selectedCampaign.id)
    }
  }, [selectedCampaign])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/admin/intelligence/campaigns")
      const data = await response.json()
      if (data.success) {
        setCampaigns(data.campaigns)
      }
    } catch (error) {
      toast.error("Failed to fetch campaigns")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      const [assignmentsRes, tasksRes, statsRes] = await Promise.all([
        fetch(`/api/admin/intelligence/campaigns/${campaignId}/assignments`),
        fetch(`/api/admin/intelligence/campaigns/${campaignId}/tasks`),
        fetch(`/api/admin/intelligence/campaigns/${campaignId}/stats`),
      ])

      const [assignmentsData, tasksData, statsData] = await Promise.all([
        assignmentsRes.json(),
        tasksRes.json(),
        statsRes.json(),
      ])

      if (assignmentsData.success) setAssignments(assignmentsData.assignments)
      if (tasksData.success) setTasks(tasksData.tasks)
      if (statsData.success) setStats(statsData.stats)
    } catch (error) {
      toast.error("Failed to fetch campaign details")
    }
  }

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch("/api/admin/intelligence/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...campaignForm,
          startDate: campaignForm.startDate ? new Date(campaignForm.startDate).getTime() : null,
          endDate: campaignForm.endDate ? new Date(campaignForm.endDate).getTime() : null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Campaign created successfully")
        setShowCreateDialog(false)
        setCampaignForm({ name: "", description: "", status: "planning", targetCount: 0, startDate: "", endDate: "" })
        fetchCampaigns()
      } else {
        toast.error(data.error || "Failed to create campaign")
      }
    } catch (error) {
      toast.error("Failed to create campaign")
    }
  }

  const handleUpdateCampaign = async (campaignId: string, updates: Partial<Campaign>) => {
    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Campaign updated successfully")
        fetchCampaigns()
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(data.campaign)
        }
      } else {
        toast.error(data.error || "Failed to update campaign")
      }
    } catch (error) {
      toast.error("Failed to update campaign")
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return

    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${campaignId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Campaign deleted successfully")
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null)
        }
        fetchCampaigns()
      } else {
        toast.error(data.error || "Failed to delete campaign")
      }
    } catch (error) {
      toast.error("Failed to delete campaign")
    }
  }

  const handleCreateTask = async () => {
    if (!selectedCampaign) return

    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${selectedCampaign.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).getTime() : null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Task created successfully")
        setShowTaskDialog(false)
        setTaskForm({ title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" })
        fetchCampaignDetails(selectedCampaign.id)
      } else {
        toast.error(data.error || "Failed to create task")
      }
    } catch (error) {
      toast.error("Failed to create task")
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<CampaignTask>) => {
    if (!selectedCampaign) return

    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${selectedCampaign.id}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Task updated successfully")
        fetchCampaignDetails(selectedCampaign.id)
      } else {
        toast.error(data.error || "Failed to update task")
      }
    } catch (error) {
      toast.error("Failed to update task")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedCampaign) return
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${selectedCampaign.id}/tasks/${taskId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Task deleted successfully")
        fetchCampaignDetails(selectedCampaign.id)
      } else {
        toast.error(data.error || "Failed to delete task")
      }
    } catch (error) {
      toast.error("Failed to delete task")
    }
  }

  const handleAssignOperator = async () => {
    if (!selectedCampaign) return

    try {
      const response = await fetch(`/api/admin/intelligence/campaigns/${selectedCampaign.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Operator assigned successfully")
        setShowAssignDialog(false)
        setAssignForm({ operatorId: "", role: "operator" })
        fetchCampaignDetails(selectedCampaign.id)
      } else {
        toast.error(data.error || "Failed to assign operator")
      }
    } catch (error) {
      toast.error("Failed to assign operator")
    }
  }

  const handleRemoveOperator = async (operatorId: string) => {
    if (!selectedCampaign) return
    if (!confirm("Are you sure you want to remove this operator?")) return

    try {
      const response = await fetch(
        `/api/admin/intelligence/campaigns/${selectedCampaign.id}/assign?operatorId=${operatorId}`,
        { method: "DELETE" }
      )

      const data = await response.json()
      if (data.success) {
        toast.success("Operator removed successfully")
        fetchCampaignDetails(selectedCampaign.id)
      } else {
        toast.error(data.error || "Failed to remove operator")
      }
    } catch (error) {
      toast.error("Failed to remove operator")
    }
  }

  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<CampaignStatus, "default" | "secondary" | "destructive" | "outline"> = {
      planning: "secondary",
      active: "default",
      paused: "outline",
      completed: "default",
      cancelled: "destructive",
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const getTaskStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "default",
      completed: "default",
      failed: "destructive",
    }
    return <Badge variant={variants[status]}>{status.replace("_", " ")}</Badge>
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, string> = {
      low: "bg-gray-500",
      medium: "bg-blue-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    }
    return <Badge className={`${colors[priority]} text-white`}>{priority}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Campaign Management</h2>
          <p className="text-sm text-muted-foreground">Coordinate team operations and manage campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>Set up a new campaign for team coordination</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Enter campaign description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={campaignForm.status}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, status: value as CampaignStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="targetCount">Target Count</Label>
                  <Input
                    id="targetCount"
                    type="number"
                    value={campaignForm.targetCount}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>Create Campaign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>{campaigns.length} campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCampaign?.id === campaign.id ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(campaign.status)}
                        <span className="text-xs text-muted-foreground">
                          {campaign.targetCount} targets
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No campaigns yet. Create your first campaign to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Details */}
        <Card className="lg:col-span-2">
          {selectedCampaign ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedCampaign.name}</CardTitle>
                    <CardDescription>{selectedCampaign.description || "No description"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedCampaign.status}
                      onValueChange={(value) => handleUpdateCampaign(selectedCampaign.id, { status: value as CampaignStatus })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Progress</span>
                          </div>
                          <div className="text-2xl font-bold mt-2">{stats.progress.toFixed(0)}%</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Completed</span>
                          </div>
                          <div className="text-2xl font-bold mt-2">{stats.completedTasks}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">In Progress</span>
                          </div>
                          <div className="text-2xl font-bold mt-2">{stats.inProgressTasks}</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-muted-foreground">Team</span>
                          </div>
                          <div className="text-2xl font-bold mt-2">{stats.totalAssignments}</div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <div className="text-sm mt-1">
                          {selectedCampaign.startDate
                            ? new Date(selectedCampaign.startDate).toLocaleDateString()
                            : "Not set"}
                        </div>
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <div className="text-sm mt-1">
                          {selectedCampaign.endDate
                            ? new Date(selectedCampaign.endDate).toLocaleDateString()
                            : "Not set"}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="team" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Team Members</h3>
                      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Operator
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Operator</DialogTitle>
                            <DialogDescription>Add a team member to this campaign</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="operatorId">Operator ID</Label>
                              <Input
                                id="operatorId"
                                value={assignForm.operatorId}
                                onChange={(e) => setAssignForm({ ...assignForm, operatorId: e.target.value })}
                                placeholder="Enter operator ID"
                              />
                            </div>
                            <div>
                              <Label htmlFor="role">Role</Label>
                              <Select
                                value={assignForm.role}
                                onValueChange={(value) => setAssignForm({ ...assignForm, role: value as CampaignRole })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lead">Lead</SelectItem>
                                  <SelectItem value="operator">Operator</SelectItem>
                                  <SelectItem value="observer">Observer</SelectItem>
                                  <SelectItem value="analyst">Analyst</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAssignOperator}>Assign</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{assignment.operator?.username || assignment.operatorId}</div>
                            <Badge variant="outline" className="mt-1">
                              {assignment.role}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOperator(assignment.operatorId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {assignments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No team members assigned yet.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Tasks</h3>
                      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Task</DialogTitle>
                            <DialogDescription>Add a new task to this campaign</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="taskTitle">Title</Label>
                              <Input
                                id="taskTitle"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                placeholder="Enter task title"
                              />
                            </div>
                            <div>
                              <Label htmlFor="taskDescription">Description</Label>
                              <Textarea
                                id="taskDescription"
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                placeholder="Enter task description"
                                rows={3}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                  value={taskForm.priority}
                                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as TaskPriority })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="assignedTo">Assigned To</Label>
                                <Input
                                  id="assignedTo"
                                  value={taskForm.assignedTo}
                                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                  placeholder="Operator ID"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="dueDate">Due Date</Label>
                              <Input
                                id="dueDate"
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateTask}>Create Task</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{task.title}</h4>
                                {getPriorityBadge(task.priority)}
                                {getTaskStatusBadge(task.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              {task.assignedTo && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Assigned to: {task.assignedTo}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={task.status}
                                onValueChange={(value) => handleUpdateTask(task.id, { status: value as TaskStatus })}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks yet. Create your first task to get started.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Timeline visualization coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a campaign to view details
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}