import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ticket, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Toplam talep sayısı
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })

  // Açık talepler
  const { count: openTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('status', ['yeni', 'devam_ediyor'])

  // Çözülmüş talepler
  const { count: resolvedTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cozuldu')

  // Bekleyen talepler
  const { count: pendingTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'beklemede')

  // Son talepler
  const { data: recentTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      department:departments(name, color),
      creator:profiles!tickets_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      title: 'Toplam Talep',
      value: totalTickets || 0,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Açık Talepler',
      value: openTickets || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: 'Çözülmüş',
      value: resolvedTickets || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Beklemede',
      value: pendingTickets || 0,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
  ]

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Talep yönetim sistemi genel görünümü</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Son Talepler</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTickets && recentTickets.length > 0 ? (
            <div className="space-y-4">
              {recentTickets.map((ticket: any) => (
                <Link
                  key={ticket.id}
                  href={`/talepler/${ticket.id}`}
                  className="block p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">
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
                      </div>
                      <h3 className="font-semibold">{ticket.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.creator?.full_name} tarafından oluşturuldu
                      </p>
                    </div>
                    <Badge variant="outline">{getStatusText(ticket.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Henüz talep bulunmamaktadır
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
