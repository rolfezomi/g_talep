'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Clock,
  User,
  Loader2,
  Send,
  Paperclip,
  Trash2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  File,
  X,
  MessageSquare,
  History,
  Settings,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, formatTimeAgo, calculateDuration } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Profile, UserRole, TicketStatus, TicketPriority } from '@/types'

interface TicketWithRelations {
  id: string
  ticket_number: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  tags: string[]
  created_at: string
  updated_at: string
  resolved_at: string | null
  ai_confidence_score: number | null
  department_id: string
  created_by: string
  assigned_to: string | null
  department?: { id: string; name: string; color: string }
  creator?: { id: string; full_name: string; avatar_url: string | null }
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null
}

interface Comment {
  id: string
  ticket_id: string
  user_id: string
  comment: string
  is_internal: boolean
  created_at: string
  user?: { id: string; full_name: string; avatar_url: string | null; role: string }
}

interface Attachment {
  id: string
  ticket_id: string
  file_name: string
  file_url: string
  file_size: number
  uploaded_by: string
  created_at: string
  uploader?: { id: string; full_name: string; avatar_url: string | null }
}

interface HistoryItem {
  id: string
  ticket_id: string
  changed_by: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
  changer?: { full_name: string }
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

export default function TalepDetayPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [departmentUsers, setDepartmentUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments' | 'history'>('comments')

  const isAdmin = profile?.role === UserRole.ADMIN
  const canEdit = isAdmin ||
    ticket?.created_by === profile?.id ||
    ticket?.assigned_to === profile?.id ||
    profile?.department_id === ticket?.department_id

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Talep
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          department:departments(id, name, color),
          creator:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
          assignee:profiles!tickets_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single()

      if (ticketError || !ticketData) {
        router.push('/talepler')
        return
      }
      setTicket(ticketData)

      // Departman kullanıcıları (atama için)
      if (ticketData.department_id) {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .eq('department_id', ticketData.department_id)
        setDepartmentUsers(users || [])
      }

      // Yorumlar
      const { data: commentsData } = await supabase
        .from('ticket_comments')
        .select(`*, user:profiles(id, full_name, avatar_url, role)`)
        .eq('ticket_id', id)
        .order('created_at', { ascending: true })
      setComments(commentsData || [])

      // Dosyalar
      const { data: attachmentsData } = await supabase
        .from('ticket_attachments')
        .select(`*, uploader:profiles!ticket_attachments_uploaded_by_fkey(id, full_name, avatar_url)`)
        .eq('ticket_id', id)
        .order('created_at', { ascending: false })
      setAttachments(attachmentsData || [])

      // Geçmiş
      const { data: historyData } = await supabase
        .from('ticket_history')
        .select(`*, changer:profiles(full_name)`)
        .eq('ticket_id', id)
        .order('created_at', { ascending: false })
      setHistory(historyData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [id, router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateTicket = async (field: string, value: any) => {
    if (!ticket) return
    setUpdating(true)
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })

      if (response.ok) {
        const updatedTicket = await response.json()
        setTicket(updatedTicket)
        // Geçmişi yenile
        const { data: historyData } = await supabase
          .from('ticket_history')
          .select(`*, changer:profiles(full_name)`)
          .eq('ticket_id', id)
          .order('created_at', { ascending: false })
        setHistory(historyData || [])
      }
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      setUpdating(false)
    }
  }

  const submitComment = async () => {
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      const response = await fetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment, is_internal: isInternalComment })
      })

      if (response.ok) {
        const comment = await response.json()
        setComments([...comments, comment])
        setNewComment('')
        setIsInternalComment(false)
      }
    } catch (error) {
      console.error('Comment error:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  const uploadFile = async () => {
    if (!selectedFile) return
    setUploadingFile(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, selectedFile)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName)

      const response = await fetch(`/api/tickets/${id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size
        })
      })

      if (response.ok) {
        const attachment = await response.json()
        setAttachments([attachment, ...attachments])
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploadingFile(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediginize emin misiniz?')) return
    try {
      const response = await fetch(`/api/tickets/${id}/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Delete comment error:', error)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Bu dosyayi silmek istediginize emin misiniz?')) return
    try {
      const response = await fetch(`/api/tickets/${id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAttachments(attachments.filter(a => a.id !== attachmentId))
      }
    } catch (error) {
      console.error('Delete attachment error:', error)
    }
  }

  const deleteTicket = async () => {
    if (!confirm('Bu talebi kalici olarak silmek istediginize emin misiniz? Bu islem geri alinamaz.')) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/talepler')
      }
    } catch (error) {
      console.error('Delete ticket error:', error)
    } finally {
      setDeleting(false)
    }
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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
      acil: 'destructive',
      yuksek: 'warning',
      normal: 'secondary',
      dusuk: 'outline',
    }
    return variants[priority] || 'secondary'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isImageFile = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)
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
          <p className="text-muted-foreground">Talep yukleniyor...</p>
        </motion.div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Talep Bulunamadi</h2>
          <p className="text-muted-foreground mb-4">Bu talebe erisim izniniz yok veya talep mevcut degil.</p>
          <Link href="/talepler">
            <Button>Taleplere Don</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const duration = calculateDuration(ticket.created_at, ticket.resolved_at || undefined)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <Link href="/talepler">
          <Button variant="ghost" className="gap-2 hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4" />
            Taleplere Don
          </Button>
        </Link>
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={deleteTicket}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Talebi Sil
          </Button>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-primary font-bold">
                      {ticket.ticket_number}
                    </span>
                    <Badge variant={getPriorityBadge(ticket.priority)} className="uppercase">
                      {ticket.priority}
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
                    <Badge className={`${getStatusColor(ticket.status)} border`}>
                      {getStatusText(ticket.status)}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold">{ticket.title}</h1>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">Aciklama</h3>
                  <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>

                {ticket.tags && ticket.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">Etiketler</h3>
                    <div className="flex gap-2 flex-wrap">
                      {ticket.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex gap-1">
                  <Button
                    variant={activeTab === 'comments' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setActiveTab('comments')}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Yorumlar ({comments.length})
                  </Button>
                  <Button
                    variant={activeTab === 'attachments' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setActiveTab('attachments')}
                  >
                    <Paperclip className="h-4 w-4" />
                    Dosyalar ({attachments.length})
                  </Button>
                  <Button
                    variant={activeTab === 'history' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setActiveTab('history')}
                  >
                    <History className="h-4 w-4" />
                    Gecmis ({history.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {/* Comments Tab */}
                  {activeTab === 'comments' && (
                    <motion.div
                      key="comments"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      {/* Comment List */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <motion.div
                              key={comment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-lg border ${comment.is_internal ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/30'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-semibold">{comment.user?.full_name}</span>
                                    {comment.user?.role === 'admin' && (
                                      <Badge variant="outline" className="text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Admin
                                      </Badge>
                                    )}
                                    {comment.is_internal && (
                                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                        Ic Not
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm">{comment.comment}</p>
                                </div>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteComment(comment.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Henuz yorum yok</p>
                          </div>
                        )}
                      </div>

                      {/* Add Comment Form */}
                      {canEdit && (
                        <div className="space-y-4 pt-4 border-t">
                          <Textarea
                            placeholder="Yorumunuzu yazin..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isInternalComment}
                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                className="rounded border-input"
                              />
                              <span className="text-muted-foreground">Ic not (sadece calisanlar gorebilir)</span>
                            </label>
                            <Button
                              onClick={submitComment}
                              disabled={!newComment.trim() || submittingComment}
                              className="gap-2"
                            >
                              {submittingComment ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Gonder
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Attachments Tab */}
                  {activeTab === 'attachments' && (
                    <motion.div
                      key="attachments"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      {/* Attachment List */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {attachments.length > 0 ? (
                          attachments.map((attachment) => (
                            <motion.div
                              key={attachment.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {isImageFile(attachment.file_name) ? (
                                  <ImageIcon className="h-6 w-6 text-primary" />
                                ) : (
                                  <File className="h-6 w-6 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary transition-colors truncate block"
                                >
                                  {attachment.file_name}
                                </a>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(attachment.file_size)} • {attachment.uploader?.full_name} • {formatTimeAgo(attachment.created_at)}
                                </p>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteAttachment(attachment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Henuz dosya eklenmemis</p>
                          </div>
                        )}
                      </div>

                      {/* Upload Form */}
                      {canEdit && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center gap-4">
                            <Input
                              type="file"
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              className="flex-1"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            />
                            <Button
                              onClick={uploadFile}
                              disabled={!selectedFile || uploadingFile}
                              className="gap-2"
                            >
                              {uploadingFile ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                              Yukle
                            </Button>
                          </div>
                          {selectedFile && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              {selectedFile.name} ({formatFileSize(selectedFile.size)})
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setSelectedFile(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* History Tab */}
                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 max-h-[500px] overflow-y-auto"
                    >
                      {history.length > 0 ? (
                        history.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 text-sm p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p>
                                <strong>{item.changer?.full_name}</strong>{' '}
                                <span className="text-primary">{item.field_name}</span> alanini guncelledi
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                {item.old_value && (
                                  <span className="line-through">{item.old_value}</span>
                                )}
                                {item.old_value && item.new_value && <span>→</span>}
                                {item.new_value && (
                                  <span className="text-foreground">{item.new_value}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTimeAgo(item.created_at)}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Henuz degisiklik gecmisi yok</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" />
                  Talep Yonetimi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Status */}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Durum</Label>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateTicket('status', e.target.value)}
                    disabled={!canEdit || updating}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="yeni">Yeni</option>
                    <option value="devam_ediyor">Devam Ediyor</option>
                    <option value="beklemede">Beklemede</option>
                    <option value="cozuldu">Cozuldu</option>
                    <option value="kapatildi">Kapatildi</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Oncelik</Label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => updateTicket('priority', e.target.value)}
                    disabled={!canEdit || updating}
                    className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="dusuk">Dusuk</option>
                    <option value="normal">Normal</option>
                    <option value="yuksek">Yuksek</option>
                    <option value="acil">Acil</option>
                  </select>
                </div>

                {/* Departman Bilgisi */}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Atanan Departman</Label>
                  <div
                    className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-muted/50 flex items-center gap-2"
                  >
                    {ticket.department && (
                      <>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ticket.department.color }}
                        />
                        <span className="font-medium">{ticket.department.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {updating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guncelleniyor...
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Details Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Detaylar</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Olusturan</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{ticket.creator?.full_name}</span>
                  </div>
                </div>


                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Olusturulma</span>
                    <span>{formatDateTime(ticket.created_at)}</span>
                  </div>
                  {ticket.updated_at !== ticket.created_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Son Guncelleme</span>
                      <span>{formatDateTime(ticket.updated_at)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gecen Sure</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {duration}
                    </span>
                  </div>
                  {ticket.ai_confidence_score && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Guven Skoru</span>
                      <Badge variant="outline">
                        {(ticket.ai_confidence_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  )}
                  {ticket.resolved_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cozum Tarihi</span>
                      <span>{formatDateTime(ticket.resolved_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
