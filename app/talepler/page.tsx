'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, Loader2, Inbox, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatTimeAgo } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Profile, Ticket, UserRole } from '@/types'

interface TicketWithRelations extends Ticket {
  department?: { name: string; color: string }
  creator?: { full_name: string; avatar_url: string | null }
  assignee?: { full_name: string } | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

export default function TaleplerPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketWithRelations[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterTickets()
  }, [tickets, searchQuery, statusFilter])

  const loadData = async () => {
    try {
      // Önce kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Profil bilgilerini al
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Talepleri al - RLS zaten filtreliyor ama UI'da da kontrol edelim
      let query = supabase
        .from('tickets')
        .select(`
          *,
          department:departments(name, color),
          creator:profiles!tickets_created_by_fkey(full_name, avatar_url),
          assignee:profiles!tickets_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      const { data: ticketsData } = await query
      setTickets(ticketsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTickets = () => {
    let filtered = [...tickets]

    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        ticket =>
          ticket.title.toLowerCase().includes(query) ||
          ticket.ticket_number.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query)
      )
    }

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    setFilteredTickets(filtered)
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

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      acil: 'Acil',
      yuksek: 'Yuksek',
      normal: 'Normal',
      dusuk: 'Dusuk',
    }
    return texts[priority] || priority
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
      yeni: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      devam_ediyor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      beklemede: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      cozuldu: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      kapatildi: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    }
    return colors[status] || colors.yeni
  }

  const statusOptions = [
    { value: 'all', label: 'Tum Durumlar' },
    { value: 'yeni', label: 'Yeni' },
    { value: 'devam_ediyor', label: 'Devam Ediyor' },
    { value: 'beklemede', label: 'Beklemede' },
    { value: 'cozuldu', label: 'Cozuldu' },
    { value: 'kapatildi', label: 'Kapatildi' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Talepler yukleniyor...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={headerVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Talepler
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.role === UserRole.ADMIN
              ? 'Tum talepleri goruntuleyip yonetebilirsiniz'
              : 'Departmaniniza ait talepleri goruntuleyip yonetebilirsiniz'}
          </p>
        </div>
        <Link href="/talepler/yeni">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
            <Plus className="h-5 w-5" />
            Yeni Talep
          </Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Talep ara... (baslik, numara veya aciklama)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>Toplam: <strong className="text-foreground">{tickets.length}</strong> talep</span>
            {searchQuery || statusFilter !== 'all' ? (
              <span>Filtrelenen: <strong className="text-foreground">{filteredTickets.length}</strong> talep</span>
            ) : null}
          </div>
        </Card>
      </motion.div>

      {/* Ticket List */}
      <motion.div variants={containerVariants} className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                layout
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/talepler/${ticket.id}`}>
                  <Card className="p-6 hover:shadow-xl hover:border-primary/50 hover:scale-[1.01] transition-all duration-300 cursor-pointer group">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Badges Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono text-primary font-bold">
                              {ticket.ticket_number}
                            </span>
                            <Badge variant={getPriorityBadge(ticket.priority)} className="uppercase text-xs">
                              {getPriorityText(ticket.priority)}
                            </Badge>
                            {ticket.department && (
                              <Badge
                                className="border"
                                style={{
                                  backgroundColor: ticket.department.color + '15',
                                  color: ticket.department.color,
                                  borderColor: ticket.department.color + '40',
                                }}
                              >
                                {ticket.department.name}
                              </Badge>
                            )}
                            {ticket.tags && ticket.tags.length > 0 && (
                              <>
                                {ticket.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {ticket.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{ticket.tags.length - 2}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-1">
                            {ticket.title}
                          </h3>

                          {/* Description */}
                          <p className="text-muted-foreground line-clamp-2 text-sm">
                            {ticket.description}
                          </p>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-primary/60" />
                              {ticket.creator?.full_name}
                            </span>
                            {ticket.assignee && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                                {ticket.assignee.full_name}
                              </span>
                            )}
                            <span className="text-muted-foreground/60">
                              {formatTimeAgo(ticket.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Status & Arrow */}
                        <div className="flex flex-col items-end gap-3">
                          <Badge className={`${getStatusColor(ticket.status)} border`}>
                            {getStatusText(ticket.status)}
                          </Badge>
                          <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full"
            >
              <Card className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <Inbox className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Talep Bulunamadi</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Arama kriterlerinize uygun talep bulunamadi'
                    : 'Henuz talep bulunmamaktadir'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Link href="/talepler/yeni">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Ilk Talebi Olustur
                    </Button>
                  </Link>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
