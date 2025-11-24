'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, Building2, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Giriş yapılırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      <Card className="relative w-full max-w-md backdrop-blur-xl bg-slate-900/70 border-slate-800/50 shadow-2xl shadow-purple-500/20">
        <CardHeader className="space-y-6 pb-8">
          {/* Company Logo/Brand */}
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <Building2 className="h-12 w-12 text-cyan-400" />
              <Sparkles className="h-5 w-5 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  GLOHE
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider">
                DIGITAL EXCELLENCE
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center text-white">
              Talep Yönetim Sistemi
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              Dijital Projeler Müdürlüğü
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-4 text-sm text-red-300 bg-red-950/50 border border-red-800/50 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-400" />
                E-posta Adresi
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@glohe.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock className="h-4 w-4 text-purple-400" />
                Şifre
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-purple-400/20"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-8">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/50 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </Button>

            <p className="text-sm text-center text-slate-400">
              Hesabınız yok mu?{' '}
              <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-colors">
                Kayıt Ol
              </Link>
            </p>
          </CardFooter>
        </form>

        {/* Professional Footer */}
        <div className="border-t border-slate-800/50 bg-slate-950/30 px-6 py-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <p className="text-xs font-medium">
                Glohe Dijital Projeler Müdürlüğü
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              <a
                href="mailto:ugur.onar@glohe.com"
                className="text-xs hover:text-cyan-400 transition-colors"
              >
                ugur.onar@glohe.com
              </a>
            </div>
            <p className="text-[10px] text-slate-600 font-medium tracking-wider">
              © 2025 GLOHE - All Rights Reserved
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
