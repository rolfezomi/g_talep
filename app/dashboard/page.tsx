'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  ArrowUpRight,
  Plus,
  Loader2,
  BarChart3,
  Activity,
  Building2,
  Settings,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatTimeAgo } from '@/lib/utils'
import { Profile, UserRole } from '@/types'

interface DepartmentStat {
  id: string
  name: string
  color: string
  count: number
}

interface TicketWithRelations {
  id: string
  ticket_number: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  department?: { name: string; color: string }
  creator?: { full_name: string }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
}

const counterVariants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }
  }
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    pending: 0,
    myTickets: 0,
    assignedToMe: 0
  })
  const [recentTickets, setRecentTickets] = useState<TicketWithRelations[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Tum istatistikler - RLS filtreliyor
      const { count: total } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })

      const { count: open } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['yeni', 'devam_ediyor'])

      const { count: resolved } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cozuldu')

      const { count: pending } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'beklemede')

      const { count: myTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)

      const { count: assignedToMe } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)

      setStats({
        total: total || 0,
        open: open || 0,
        resolved: resolved || 0,
        pending: pending || 0,
        myTickets: myTickets || 0,
        assignedToMe: assignedToMe || 0
      })

      // Son talepler
      const { data: tickets } = await supabase
        .from('tickets')
        .select(`
          id, ticket_number, title, description, status, priority, created_at,
          department:departments(name, color),
          creator:profiles!tickets_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentTickets(tickets || [])

      // Departman istatistikleri - SADECE ADMIN ICIN
      if (profileData?.role === 'admin') {
        const { data: departments } = await supabase
          .from('departments')
          .select('id, name, color')

        if (departments) {
          const deptStats: DepartmentStat[] = []
          for (const dept of departments) {
            const { count } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id)
              .in('status', ['yeni', 'devam_ediyor', 'beklemede'])

            deptStats.push({
              id: dept.id,
              name: dept.name,
              color: dept.color,
              count: count || 0
            })
          }
          setDepartmentStats(deptStats.sort((a, b) => b.count - a.count))
        }
      }

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
      acil: 'destructive',
      yuksek: 'warning',
      normal: 'secondary',
      dusuk: 'outline',
    }
    return variants[priority] || 'secondary'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      yeni: 'Yeni',
      devam_ediyor: 'Devam Ediyor',
      beklemede: 'Beklemede',
      cozuldu: 'Cozuldu',
      kapatildi: 'Kapatildi',
    }
    return texts[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      yeni: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      devam_ediyor: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      beklemede: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      cozuldu: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      kapatildi: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    }
    return colors[status] || colors.yeni
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Dashboard yukleniyor...</p>
        </motion.div>
      </div>
    )
  }

  const mainStats = [
    {
      title: 'Toplam Talep',
      value: stats.total,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Acik Talepler',
      value: stats.open,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Cozulmus',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Beklemede',
      value: stats.pending,
      icon: AlertCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Hos geldiniz, {profile?.full_name}
            {profile?.role === UserRole.ADMIN && (
              <Badge variant="outline" className="ml-2">Admin</Badge>
            )}
          </p>
        </div>
        <Link href="/talepler/yeni">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
            <Plus className="h-5 w-5" />
            Yeni Talep
          </Button>
        </Link>
      </motion.div>

      {/* Admin Panel - SADECE ADMIN ICIN */}
      {profile?.role === UserRole.ADMIN && (
        <motion.div variants={itemVariants}>
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Admin Paneli
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/admin/departmanlar">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5">
                    <Building2 className="h-6 w-6 text-primary" />
                    <span>Departmanlar</span>
                  </Button>
                </Link>
                <Link href="/admin/kullanicilar">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5">
                    <Users className="h-6 w-6 text-primary" />
                    <span>Kullanicilar</span>
                  </Button>
                </Link>
                <Link href="/talepler">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5">
                    <Ticket className="h-6 w-6 text-primary" />
                    <span>Tum Talepler</span>
                  </Button>
                </Link>
                <Link href="/ayarlar">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5">
                    <Settings className="h-6 w-6 text-primary" />
                    <span>Ayarlar</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid - SADECE ADMIN ICIN */}
      {profile?.role === UserRole.ADMIN && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className={`relative overflow-hidden border ${stat.borderColor} hover:shadow-xl transition-all duration-300`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bgColor} rounded-full -translate-y-16 translate-x-16 opacity-50`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    variants={counterVariants}
                    className="text-4xl font-bold"
                  >
                    {stat.value}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Personal Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Benim Taleplerim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{stats.myTickets}</p>
                <p className="text-sm text-muted-foreground">Olusturdugum talepler</p>
              </div>
              <Link href="/talepler">
                <Button variant="outline" size="sm" className="gap-1">
                  Goruntule
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Departmanimdaki Talepler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-emerald-600">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Departmana gelen talepler</p>
              </div>
              <Link href="/talepler">
                <Button variant="outline" size="sm" className="gap-1">
                  Goruntule
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Son Talepler
              </CardTitle>
              <Link href="/talepler">
                <Button variant="ghost" size="sm" className="gap-1">
                  Tumunu Gor
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentTickets.length > 0 ? (
                <div className="space-y-3">
                  {recentTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={`/talepler/${ticket.id}`}
                        className="block p-4 rounded-xl border hover:border-primary/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-mono text-primary font-bold">
                                {ticket.ticket_number}
                              </span>
                              <Badge variant={getPriorityBadge(ticket.priority)} className="uppercase text-xs">
                                {ticket.priority}
                              </Badge>
                              {ticket.department && (
                                <Badge
                                  className="border text-xs"
                                  style={{
                                    backgroundColor: ticket.department.color + '15',
                                    color: ticket.department.color,
                                    borderColor: ticket.department.color + '40',
                                  }}
                                >
                                  {ticket.department.name}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                              {ticket.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{ticket.creator?.full_name}</span>
                              <span>{formatTimeAgo(ticket.created_at)}</span>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(ticket.status)} border shrink-0`}>
                            {getStatusText(ticket.status)}
                          </Badge>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Henuz talep bulunmamaktadir</p>
                  <Link href="/talepler/yeni">
                    <Button variant="outline" size="sm" className="mt-4">
                      Ilk Talebi Olustur
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Stats - SADECE ADMIN ICIN */}
        {profile?.role === UserRole.ADMIN && (
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Departman Dagilimi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {departmentStats.length > 0 ? (
                  <div className="space-y-4">
                    {departmentStats.map((dept, index) => (
                      <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: dept.color }}
                            />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                          <span className="text-muted-foreground">{dept.count} acik</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((dept.count / (stats.open || 1)) * 100, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: dept.color }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Veri bulunamadi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
