import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { formatTimeAgo } from '@/lib/utils'

export default async function TaleplerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      department:departments(name, color),
      creator:profiles!tickets_created_by_fkey(full_name, avatar_url),
      assignee:profiles!tickets_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      acil: 'destructive',
      yuksek: 'warning',
      normal: 'secondary',
      dusuk: 'outline',
    }
    return variants[priority] || 'secondary'
  }

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Talepler</h1>
          <p className="text-muted-foreground">Tüm talepleri görüntüleyin ve yönetin</p>
        </div>
        <Link href="/talepler/yeni">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Yeni Talep
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/talepler/${ticket.id}`}>
              <Card className="p-6 hover:shadow-lg hover:border-primary transition-all cursor-pointer">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
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
                        {ticket.tags && ticket.tags.length > 0 && (
                          <>
                            {ticket.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold">{ticket.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Oluşturan: <strong>{ticket.creator?.full_name}</strong>
                        </span>
                        {ticket.assignee && (
                          <span>
                            Atanan: <strong>{ticket.assignee?.full_name}</strong>
                          </span>
                        )}
                        <span>{formatTimeAgo(ticket.created_at)}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusText(ticket.status)}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Henüz talep bulunmamaktadır</p>
            <Link href="/talepler/yeni">
              <Button>İlk Talebi Oluştur</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  )
}
