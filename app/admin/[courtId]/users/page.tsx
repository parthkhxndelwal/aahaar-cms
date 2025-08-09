"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { Search, UserPlus, Mail, Phone, Trash2 } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { useParams } from "next/navigation"

interface User {
  id: string
  fullName: string
  email?: string
  phone?: string
  role: "user" | "vendor" | "admin"
  status: "active" | "inactive" | "blocked"
  createdAt: string
  lastLoginAt?: string
  totalOrders: number
  totalSpent: number
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  blocked: "bg-red-100 text-red-800"
}

const roleColors = {
  user: "bg-blue-100 text-blue-800",
  vendor: "bg-purple-100 text-purple-800",
  admin: "bg-orange-100 text-orange-800"
}

// Animation variants - removed unused variants to match orders page pattern

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()
  const { token } = useAdminAuth()
  const routeParams = useParams()
  const courtId = routeParams.courtId as string

  // Debug logs
  console.log("AdminUsersPage rendered", { token, courtId, loading, users: users.length })

  useEffect(() => {
    if (token && courtId) {
      fetchUsers()
    } else {
      console.log("Missing token or courtId", { token: !!token, courtId })
    }
  }, [roleFilter, statusFilter, token, courtId])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log("Fetching users...", { courtId, token: !!token })
      
      if (!token) {
        console.log("No token available")
        setLoading(false)
        return
      }
      
      const params = new URLSearchParams()
      
      if (roleFilter !== "all") params.append("role", roleFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      const response = await fetch(`/api/courts/${courtId}/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const result = await response.json()
      console.log("API response:", result)
      
      if (result.success) {
        setUsers(result.data.users || [])
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      setDeletingUser(userId)
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      
      // Check if response is ok first
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type')
      let result
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        result = text ? JSON.parse(text) : { success: true }
      } else {
        // If no JSON content, assume success if status is ok
        result = { success: true }
      }
      
      if (result.success !== false) {
        setUsers(users.filter(user => user.id !== userId))
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } else {
        throw new Error(result.message || "Failed to delete user")
      }
    } catch (error: any) {
      console.error("Delete user error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setDeletingUser(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (user.phone && user.phone.includes(searchQuery))
    return matchesSearch
  })

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "active").length,
    newUsersThisMonth: users.filter(u => {
      const userDate = new Date(u.createdAt)
      const now = new Date()
      return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()
    }).length,
    totalSpent: users.reduce((sum, u) => sum + (Number(u.totalSpent) || 0), 0)
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-neutral-100">User Management</h1>
          <p className="text-neutral-400">Manage users and their access to the food court</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setRoleFilter("all")
            setStatusFilter("all")
            fetchUsers()
          }}>
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-[400px]"
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Spinner size={32} variant="white" />
              </div>
              <p className="text-neutral-400">Loading users data...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >

            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {[
                { title: "Total Users", value: stats.totalUsers, subtitle: "Registered users" },
                { title: "Active Users", value: stats.activeUsers, subtitle: "Currently active" },
                { title: "New This Month", value: stats.newUsersThisMonth, subtitle: "New registrations" },
                { title: "Total Spent", value: `₹${(stats.totalSpent || 0).toLocaleString()}`, subtitle: "By all users" }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Filter Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                        <SelectItem value="vendor">Vendors</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Users Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Users</CardTitle>
                      <CardDescription>
                        All registered users in your food court
                        {users.length > 0 && (
                          <span className="ml-2">
                            ({users.length} total users)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-neutral-500">
                            No users found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b border-neutral-800 hover:bg-neutral-900/50"
                            style={{ display: "table-row" }}
                          >
                            <TableCell className="font-medium">{user.fullName}</TableCell>
                            <TableCell>
                              <div>
                                {user.email && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </div>
                                )}
                                {user.phone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleColors[user.role]}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[user.status]}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.totalOrders || 0}</TableCell>
                            <TableCell>₹{(Number(user.totalSpent) || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {/* Delete button - only show for non-vendor users */}
                                {user.role !== "vendor" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={deletingUser === user.id}
                                        title="Delete user"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        {deletingUser === user.id ? (
                                          <Spinner size={16} variant="white" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete user "{user.fullName}"? This action cannot be undone and will permanently remove all user data.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteUser(user.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
