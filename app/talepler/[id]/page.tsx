import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, formatTimeAgo, calculateDuration } from '@/lib/utils'

export default async function TalepDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      department:departments(name, color),
      creator:profiles!tickets_created_by_fkey(full_name, avatar_url),
      assignee:profiles!tickets_assigned_to_fkey(full_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (!ticket) {
    notFound()
  }

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select(`
      *,
      user:profiles(full_name, avatar_url)
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const { data: history } = await supabase
    .from('ticket_history')
    .select(`
      *,
      changer:profiles(full_name)
    `)
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })

  const getStatusText = (status: string) => {
    const texts: any = {
      yeni: 'Yeni',
      devam_ediyor: 'Devam Ediyor',
      beklemede: 'Beklemede',
      cozuldu: 'Çözüldü',
      kapatildi: 'Kapatıldı',
    }
    return texts[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      yeni: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      devam_ediyor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      beklemede: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      cozuldu: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      kapatildi: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    }
    return colors[status] || colors.yeni
  }

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      acil: 'destructive',
      yuksek: 'warning',
      normal: 'secondary',
      dusuk: 'outline',
    }
    return variants[priority] || 'secondary'
  }

  const duration = calculateDuration((ticket as any).created_at, (ticket as any).resolved_at || undefined)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link href="/talepler">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Taleplere Dön
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-muted-foreground font-semibold">
                    {ticket.ticket_number}
                  </span>
                  <Badge variant={getPriorityBadge(ticket.priority)}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: ticket.department?.color + '20',
                      color: ticket.department?.color,
                      border: `1px solid ${ticket.department?.color}`,
                    }}
                  >
                    {ticket.department?.name}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusText(ticket.status)}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold">{ticket.title}</h1>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Açıklama</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Etiketler</h3>
                  <div className="flex gap-2 flex-wrap">
                    {ticket.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Yorumlar ({comments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{comment.user?.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                          {comment.is_internal && (
                            <Badge variant="outline" className="text-xs">
                              İç Not
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Henüz yorum yok</p>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {history && history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Geçmiş</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p>
                          <strong>{item.changer?.full_name}</strong>{' '}
                          <span className="text-muted-foreground">{item.field_name}</span> alanını{' '}
                          güncelledi
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detaylar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Oluşturan</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{ticket.creator?.full_name}</span>
                </div>
              </div>

              {ticket.assignee && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Atanan Kişi</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{ticket.assignee?.full_name}</span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Oluşturulma Tarihi</p>
                <p className="font-medium">{formatDateTime(ticket.created_at)}</p>
              </div>

              {ticket.updated_at !== ticket.created_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Son Güncellenme</p>
                  <p className="font-medium">{formatDateTime(ticket.updated_at)}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Geçen Süre</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{duration}</span>
                </div>
              </div>

              {ticket.ai_confidence_score && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">AI Güven Skoru</p>
                  <p className="font-medium">
                    {(ticket.ai_confidence_score * 100).toFixed(0)}%
                  </p>
                </div>
              )}

              {ticket.resolved_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Çözüm Tarihi</p>
                  <p className="font-medium">{formatDateTime(ticket.resolved_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
