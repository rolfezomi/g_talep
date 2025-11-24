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
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowLoadingScreen(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Add a slight delay to show the loading screen
      await new Promise(resolve => setTimeout(resolve, 1500))

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Giriş yapılırken bir hata oluştu')
      setShowLoadingScreen(false)
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

      {/* Premium Loading Screen */}
      {showLoadingScreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />

          {/* Main loading content */}
          <div className="relative z-10 flex flex-col items-center space-y-8">
            {/* Logo with animated glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-50 animate-pulse" />
              <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Building2 className="h-16 w-16 text-cyan-400 animate-pulse" />
                    <Sparkles className="h-8 w-8 text-purple-400 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <h1 className="text-5xl font-black tracking-tight">
                      <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                        GLOHE
                      </span>
                    </h1>
                    <p className="text-sm text-slate-400 font-medium tracking-wider">
                      DIGITAL EXCELLENCE
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated spinner */}
            <div className="relative">
              {/* Outer ring */}
              <div className="w-24 h-24 rounded-full border-4 border-slate-800/50" />

              {/* Animated gradient ring */}
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-cyan-400 border-r-purple-400 border-b-pink-400 animate-spin" />

              {/* Inner glow */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />

              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse" />
            </div>

            {/* Loading text */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-white animate-pulse">
                Giriş Yapılıyor
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                Lütfen bekleyiniz...
              </p>

              {/* Animated dots */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-64 h-2 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full animate-shimmer w-full" />
            </div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full opacity-50 animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
