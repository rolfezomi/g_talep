'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Moon, Sun, User, Save, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function AyarlarPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name)
    }
  }

  const saveProfile = async () => {
    setLoading(true)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Profile update failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Dashboard'a Dön
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-2">Ayarlar</h1>
        <p className="text-muted-foreground">Hesap ve uygulama ayarlarınızı yönetin</p>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Değişiklikler başarıyla kaydedildi</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-white" />
              ) : (
                <Sun className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle>Görünüm</CardTitle>
              <CardDescription>Uygulamanın görünümünü özelleştirin</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-purple-500 transition-colors">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="text-base font-semibold">
                Karanlık Mod
              </Label>
              <p className="text-sm text-muted-foreground">
                Aydınlık ve karanlık tema arasında geçiş yapın
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Theme Preview */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-purple-600 ring-2 ring-purple-200'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="bg-white rounded-lg p-4 mb-2 shadow-sm">
                <div className="h-2 w-16 bg-purple-600 rounded mb-2"></div>
                <div className="h-1 w-full bg-gray-200 rounded mb-1"></div>
                <div className="h-1 w-3/4 bg-gray-200 rounded"></div>
              </div>
              <p className="text-sm font-medium">Aydınlık</p>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-purple-600 ring-2 ring-purple-200'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="bg-gray-900 rounded-lg p-4 mb-2 shadow-sm">
                <div className="h-2 w-16 bg-purple-500 rounded mb-2"></div>
                <div className="h-1 w-full bg-gray-700 rounded mb-1"></div>
                <div className="h-1 w-3/4 bg-gray-700 rounded"></div>
              </div>
              <p className="text-sm font-medium">Karanlık</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adınız ve soyadınız"
            />
          </div>

          <Button
            onClick={saveProfile}
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Değişiklikleri Kaydet
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
