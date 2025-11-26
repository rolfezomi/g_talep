'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Users,
  X,
  Check,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { UserRole } from '@/types'

interface Department {
  id: string
  name: string
  description: string | null
  color: string
  manager_id: string | null
  created_at: string
  manager?: { id: string; full_name: string } | null
}

interface Profile {
  id: string
  full_name: string
  role: string
  department_id: string | null
}

const COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#eab308',
  '#6b7280', '#ef4444', '#ec4899', '#14b8a6', '#f59e0b'
]

export default function DepartmanlarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    manager_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Admin kontrolü
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== UserRole.ADMIN) {
        router.push('/dashboard')
        return
      }

      // Departmanları getir
      const response = await fetch('/api/admin/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }

      // Kullanıcıları getir (manager seçimi için)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id')
        .order('full_name')

      setUsers(usersData || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#3b82f6', manager_id: '' })
    setEditingDepartment(null)
    setShowForm(false)
    setError(null)
  }

  const openEditForm = (dept: Department) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      color: dept.color,
      manager_id: dept.manager_id || ''
    })
    setEditingDepartment(dept)
    setShowForm(true)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const url = editingDepartment
        ? `/api/admin/departments/${editingDepartment.id}`
        : '/api/admin/departments'

      const response = await fetch(url, {
        method: editingDepartment ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Bir hata olustu')
        return
      }

      setSuccess(editingDepartment ? 'Departman guncellendi' : 'Departman eklendi')
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err?.message || 'Bir hata olustu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu departmani silmek istediginize emin misiniz?')) return

    setDeleting(id)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Silme islemi basarisiz')
        return
      }

      setSuccess('Departman silindi')
      loadData()
    } catch (err: any) {
      setError(err?.message || 'Bir hata olustu')
    } finally {
      setDeleting(null)
    }
  }

  const getUserCountByDepartment = (deptId: string) => {
    return users.filter(u => u.department_id === deptId).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Departman Yonetimi</h1>
            <p className="text-muted-foreground">Departmanlari ekle, duzenle veya sil</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Departman
        </Button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            {error}
            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center gap-2"
          >
            <Check className="h-5 w-5" />
            {success}
            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setSuccess(null)}>
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => resetForm()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-lg shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingDepartment ? 'Departman Duzenle' : 'Yeni Departman'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <Label htmlFor="name">Departman Adi *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ornek: Bilgi Teknolojileri"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Aciklama</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Departman hakkinda kisa aciklama"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Renk</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="manager">Departman Yoneticisi</Label>
                  <select
                    id="manager"
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Secilmedi</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} {user.role === 'admin' && '(Admin)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Iptal
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingDepartment ? (
                      'Guncelle'
                    ) : (
                      'Ekle'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Departments Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: dept.color + '20' }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: dept.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        {getUserCountByDepartment(dept.id)} kullanici
                      </div>
                    </div>
                  </div>
                  <Badge
                    className="border"
                    style={{
                      backgroundColor: dept.color + '15',
                      color: dept.color,
                      borderColor: dept.color + '40'
                    }}
                  >
                    Aktif
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dept.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {dept.description}
                  </p>
                )}
                {dept.manager && (
                  <p className="text-sm mb-4">
                    <span className="text-muted-foreground">Yonetici:</span>{' '}
                    <span className="font-medium">{dept.manager.full_name}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditForm(dept)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Duzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(dept.id)}
                    disabled={deleting === dept.id}
                  >
                    {deleting === dept.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Henuz departman eklenmemis</p>
          </div>
        )}
      </div>
    </div>
  )
}
