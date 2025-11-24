'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Users, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Department {
  id: string
  name: string
  color: string
}

interface User {
  id: string
  full_name: string
  role: 'admin' | 'department_manager' | 'user'
  department_id: string | null
  created_at: string
  email?: string
  department?: Department
}

export default function AdminKullanicilarPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
    try {
      // Check if user is admin
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadUsers()
      await loadDepartments()
    } catch (err: any) {
      setError('Yetki kontrolü başarısız oldu')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Fetch users with their departments
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          department_id,
          created_at,
          departments (
            id,
            name,
            color
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setError('Kullanıcılar yüklenemedi')
        return
      }

      // Fetch emails via API route (since auth.admin requires service role)
      const response = await fetch('/api/admin/get-user-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: data.map(u => u.id) })
      })

      let emailMap: Record<string, string> = {}
      if (response.ok) {
        const emailData = await response.json()
        emailMap = emailData.emails || {}
      }

      const usersWithEmails = data.map(user => ({
        ...user,
        email: emailMap[user.id] || 'Email yüklenemedi',
        department: user.departments as Department
      }))

      setUsers(usersWithEmails)
    } catch (err) {
      console.error('Error in loadUsers:', err)
      setError('Kullanıcılar yüklenirken hata oluştu')
    }
  }

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (data) setDepartments(data)
  }

  const updateUserDepartment = async (userId: string, departmentId: string) => {
    setUpdating(userId)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: departmentId })
        .eq('id', userId)

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      // Update local state immediately
      const selectedDept = departments.find(d => d.id === departmentId)
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, department_id: departmentId, department: selectedDept }
            : user
        )
      )

      setSuccess('Departman başarıyla güncellendi')

      // Reload to ensure consistency
      setTimeout(() => {
        loadUsers()
        setSuccess('')
      }, 2000)
    } catch (err: any) {
      console.error('Failed to update department:', err)
      setError(err.message || 'Güncelleme başarısız oldu')
      await loadUsers()
    } finally {
      setUpdating(null)
    }
  }

  const updateUserRole = async (userId: string, role: 'admin' | 'department_manager' | 'user') => {
    setUpdating(userId)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      // Update local state immediately for instant feedback
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role } : user
        )
      )

      setSuccess(`Rol başarıyla güncellendi`)

      // Reload to ensure consistency
      setTimeout(() => {
        loadUsers()
        setSuccess('')
      }, 2000)
    } catch (err: any) {
      console.error('Failed to update role:', err)
      setError(err.message || 'Güncelleme başarısız oldu')
      // Reload on error to show correct state
      await loadUsers()
    } finally {
      setUpdating(null)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
      department_manager: { label: 'Departman Yöneticisi', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' },
      user: { label: 'Kullanıcı', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' }
    }
    const variant = variants[role] || variants.user
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Dashboard'a Dön
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">Kullanıcıların departmanlarını ve rollerini yönetin</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Kullanıcı</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Adminler</p>
                <p className="text-3xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departman Yöneticileri</p>
                <p className="text-3xl font-bold">{users.filter(u => u.role === 'department_manager').length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Kullanıcılar</CardTitle>
          <CardDescription>
            Kullanıcıların departmanlarını ve rollerini buradan değiştirebilirsiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* User Info */}
                    <div className="md:col-span-2">
                      <p className="font-semibold text-lg">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => updateUserRole(user.id, value as any)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Kullanıcı</SelectItem>
                          <SelectItem value="department_manager">Departman Yöneticisi</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Departman</label>
                      <Select
                        value={user.department_id || ''}
                        onValueChange={(value) => updateUserDepartment(user.id, value)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Departman seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: dept.color }}
                                />
                                {dept.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center">
                      {updating === user.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
