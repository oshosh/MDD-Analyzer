// src/app/(mdd)/_components/GoogleAuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, CheckCircle2 } from 'lucide-react'

// 브라우저 localStorage 키 (DB 0개)
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

  // 구글 OAuth 원클릭 인증 (Google Identity Services)
  function handleGoogleLogin() {
    // 구글 GIS Client 모듈 동적 구성
    const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'DEMO_GOOGLE_CLIENT_ID'
    
    // OAuth 2.0 Implicit Grant / Token Client 호출
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id,
        scope: 'https://www.googleapis.com/auth/generative-language',
        callback: (response: any) => {
          if (response.access_token) {
            setStoredUserToken(response.access_token)
            setToken(response.access_token)
            if (onTokenChange) onTokenChange(response.access_token)
          }
        },
      })
      client.requestAccessToken()
    } else {
      // 대안: 구글 OAuth 토큰 간편 등록 프롬프트
      const userPromptToken = prompt(
        'Google OAuth 인증 토큰(또는 본인의 구글 Access Token)을 입력하시면 개인 구글 쿼터로 Gemini LLM을 직접 호출합니다.\n(DB에 절대 저장되지 않고 브라우저에만 유지됩니다):'
      )
      if (userPromptToken && userPromptToken.trim()) {
        const cleanToken = userPromptToken.trim()
        setStoredUserToken(cleanToken)
        setToken(cleanToken)
        if (onTokenChange) onTokenChange(cleanToken)
      }
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
          <CheckCircle2 className="h-3.5 w-3.5" /> Google OAuth 인증됨
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
      className="h-8 border-purple-500/30 text-purple-700 hover:bg-purple-500/10 dark:text-purple-400 font-bold text-xs"
    >
      <LogIn className="h-3.5 w-3.5 mr-1 text-purple-500" />
      Google OAuth 로그인 (내 쿼터로 Gemini AI 연동)
    </Button>
  )
}
