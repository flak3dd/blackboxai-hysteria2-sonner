/**
 * Intelligence Notifications UI
 * 
 * Interface for managing intelligence notifications:
 * - List all notifications
 * - Mark as read/unread
 * - Filter by type
 * - View notification details
 * - Notification statistics
 */

"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Bell,
  Check,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react"

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  read: boolean
  relatedType?: string | null
  relatedId?: string | null
  createdAt: Date
}

export function IntelligenceNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/intelligence/notifications")
      if (!response.ok) throw new Error('Failed to load notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      
      // Load unread count
      const unreadResponse = await fetch("/api/admin/intelligence/notifications/unread-count")
      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json()
        setUnreadCount(unreadData.count || 0)
      }
    } catch (error) {
      toast.error('Failed to load notifications', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/intelligence/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })
      
      if (!response.ok) throw new Error('Failed to mark as read')
      
      loadNotifications()
    } catch (error) {
      toast.error('Failed to mark as read', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/intelligence/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' })
      })
      
      if (!response.ok) throw new Error('Failed to mark all as read')
      
      toast.success('All notifications marked as read')
      loadNotifications()
    } catch (error) {
      toast.error('Failed to mark all as read', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return
    
    try {
      const response = await fetch(`/api/admin/intelligence/notifications/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete notification')
      
      toast.success('Notification deleted successfully')
      loadNotifications()
    } catch (error) {
      toast.error('Failed to delete notification', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'info':
        return <Badge variant="secondary" className="bg-blue-500 text-white"><Info className="h-3 w-3 mr-1" />Info</Badge>
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
      case 'success':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const filteredNotifications = typeFilter === 'all' 
    ? notifications.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notifications.filter(n => 
        n.type === typeFilter &&
        (n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase()))
      )

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    info: notifications.filter(n => n.type === 'info').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    error: notifications.filter(n => n.type === 'error').length
  }

  useEffect(() => {
    loadNotifications()
  }, [typeFilter])

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Manage intelligence notifications and alerts
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button onClick={loadNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.unread}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.warning}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                className="pl-8"
              />
            </div>
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'info' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('info')}
            >
              Info
            </Button>
            <Button
              variant={typeFilter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('warning')}
            >
              Warning
            </Button>
            <Button
              variant={typeFilter === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('error')}
            >
              Error
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications ({filteredNotifications.length})</CardTitle>
          <CardDescription>
            View and manage intelligence notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No notifications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notification) => (
                  <TableRow key={notification.id} className={notification.read ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(notification.type)}
                        {getTypeBadge(notification.type)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{notification.title}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">{notification.message}</TableCell>
                    <TableCell>
                      {notification.read ? (
                        <Badge variant="outline"><Check className="h-3 w-3 mr-1" />Read</Badge>
                      ) : (
                        <Badge variant="default">Unread</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(notification.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
