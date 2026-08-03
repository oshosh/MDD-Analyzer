// src/app/(mdd)/_components/GoogleAuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, CheckCircle2, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'mdd_google_user_token'

export function getStoredUserToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setStoredUserToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, token)
  }
}

export function clearStoredUserToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

interface GoogleAuthButtonProps {
  onTokenChange?: (token: string | null) => void
}

export function GoogleAuthButton({ onTokenChange }: GoogleAuthButtonProps) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const existing = getStoredUserToken()
    setToken(existing)
    if (onTokenChange) onTokenChange(existing)
  }, [onTokenChange])

  // 카카오 로그인 방식처럼 원클릭 팝업 창 연동
  function handleGoogleLogin() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

    // 구글 OAuth2 팝업창 인증 URL 구성
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}` : ''
    const scope = 'https://www.googleapis.com/auth/generative-language'

    if (clientId) {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=${encodeURIComponent(scope)}`

      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'GoogleLoginPopup',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // 팝업 응답 감지 (해시 토큰 수신)
      const timer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer)
            return
          }
          if (popup.location.href.includes('access_token=')) {
            const hashParams = new URLSearchParams(popup.location.hash.substring(1))
            const accessToken = hashParams.get('access_token')
            if (accessToken) {
              setStoredUserToken(accessToken)
              setToken(accessToken)
              if (onTokenChange) onTokenChange(accessToken)
              popup.close()
              clearInterval(timer)
            }
          }
        } catch {
          // Cross-origin access pending
        }
      }, 500)
    } else {
      // Client ID 미설정 시 지저분한 browser prompt() 알림창을 완전히 제거
      alert('구글 OAuth Client ID(.env.local의 NEXT_PUBLIC_GOOGLE_CLIENT_ID)를 설정하시면 팝업 로그인이 작동합니다.')
    }
  }

  function handleLogout() {
    clearStoredUserToken()
    setToken(null)
    if (onTokenChange) onTokenChange(null)
  }

  if (token) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
          <CheckCircle2 className="h-3.5 w-3.5" /> 구글 로그인 완료
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3 w-3 mr-1" /> 로그아웃
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGoogleLogin}
      className="h-8 border-purple-500/30 text-purple-700 hover:bg-purple-500/10 dark:text-purple-400 font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
    >
      <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-500" />
      G 구글 계정으로 로그인 (Gemini AI 연동)
    </Button>
  )
}
