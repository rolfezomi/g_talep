'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function YeniTalepPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'dusuk' | 'normal' | 'yuksek' | 'acil'>('normal')
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('*')
    if (data) setDepartments(data)
  }

  const handleAISuggestion = async () => {
    if (!title || !description) {
      setError('Lütfen başlık ve açıklama girin')
      return
    }

    setAiLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, departments }),
      })

      if (!response.ok) throw new Error('AI analizi başarısız oldu')

      const data = await response.json()
      setAiSuggestion(data)
      setSelectedDepartment(data.department_id)
      setPriority(data.suggested_priority)
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Oturum bulunamadı')

      const { error: insertError } = await supabase.from('tickets').insert({
        title,
        description,
        created_by: user.id,
        department_id: selectedDepartment || departments[0].id,
        priority,
        tags: aiSuggestion?.suggested_tags || [],
        ai_confidence_score: aiSuggestion?.confidence_score || null,
      })

      if (insertError) throw insertError

      router.push('/talepler')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Talep oluşturulurken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const priorityOptions = [
    { value: 'dusuk', label: 'Düşük', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'yuksek', label: 'Yüksek', color: 'bg-orange-100 text-orange-800' },
    { value: 'acil', label: 'Acil', color: 'bg-red-100 text-red-800' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/talepler">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-2">Yeni Talep Oluştur</h1>
        <p className="text-muted-foreground">AI destekli akıllı talep oluşturma</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Talep Bilgileri</CardTitle>
            <CardDescription>
              Talebin başlığını ve detaylarını girin. AI size en uygun departmanı önerecektir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Başlık *
              </label>
              <Input
                id="title"
                placeholder="Örn: Yeni hammadde tedarikçisi bulunması"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Açıklama *
              </label>
              <Textarea
                id="description"
                placeholder="Talebin detaylarını açıklayın..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={loading}
                rows={6}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleAISuggestion}
              disabled={aiLoading || loading || !title || !description}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI Analiz Ediyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI ile Departman Öner
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {aiSuggestion && (
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Önerisi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Önerilen Departman:</span>
                <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {aiSuggestion.department_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Güven Skoru:</span>
                <p className="text-lg font-semibold">
                  {(aiSuggestion.confidence_score * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Açıklama:</span>
                <p className="text-sm">{aiSuggestion.reasoning}</p>
              </div>
              {aiSuggestion.suggested_tags && aiSuggestion.suggested_tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Önerilen Etiketler:</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {aiSuggestion.suggested_tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Departman Seçimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDepartment(dept.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedDepartment === dept.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                  disabled={loading}
                >
                  <div
                    className="w-3 h-3 rounded-full mb-2"
                    style={{ backgroundColor: dept.color }}
                  />
                  <div className="font-semibold">{dept.name}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Öncelik Seviyesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    priority === option.value
                      ? 'border-purple-600 ring-2 ring-purple-200'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  disabled={loading}
                >
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${option.color}`}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" size="lg" className="flex-1" disabled={loading || !selectedDepartment}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Oluşturuluyor...
              </>
            ) : (
              'Talep Oluştur'
            )}
          </Button>
          <Link href="/talepler" className="flex-1">
            <Button type="button" variant="outline" size="lg" className="w-full" disabled={loading}>
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
