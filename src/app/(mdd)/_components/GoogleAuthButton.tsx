// src/app/(mdd)/_components/GoogleAuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, CheckCircle2, Sparkles, Key } from 'lucide-react'

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

interface GoogleOAuthResponse {
  access_token?: string
}

interface GoogleOAuthTokenClient {
  requestAccessToken: () => void
}

interface WindowWithGoogle {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string
          scope: string
          callback: (response: GoogleOAuthResponse) => void
        }) => GoogleOAuthTokenClient
      }
    }
  }
}

export function GoogleAuthButton({ onTokenChange }: GoogleAuthButtonProps) {
  const [token, setToken] = useState<string | null>(null)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [customKey, setCustomKey] = useState('')

  useEffect(() => {
    const existing = getStoredUserToken()
    setToken(existing)
    if (onTokenChange) onTokenChange(existing)
  }, [onTokenChange])

  // 카카오/구글 표준 GIS Token Client 연동
  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as unknown as WindowWithGoogle) : null
    if (win && !win.google?.accounts?.oauth2) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  function handleGoogleLogin() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    const win = typeof window !== 'undefined' ? (window as unknown as WindowWithGoogle) : null

    if (win && win.google?.accounts?.oauth2) {
      const tokenClient = win.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: (response: GoogleOAuthResponse) => {
          if (response.access_token) {
            setStoredUserToken(response.access_token)
            setToken(response.access_token)
            if (onTokenChange) onTokenChange(response.access_token)
          }
        },
      })
      tokenClient.requestAccessToken()
    } else if (clientId) {
      alert('구글 로그인 모듈을 로딩 중입니다. 1~2초 후 다시 클릭해주세요.')
    } else {
      alert('구글 Client ID(.env.local의 NEXT_PUBLIC_GOOGLE_CLIENT_ID)를 등록하시면 구글 팝업 로그인이 활성화됩니다.')
    }
  }

  function handleSaveCustomKey() {
    if (!customKey.trim()) return
    const key = customKey.trim()
    setStoredUserToken(key)
    setToken(key)
    if (onTokenChange) onTokenChange(key)
    setShowKeyInput(false)
    setCustomKey('')
  }

  function handleLogout() {
    clearStoredUserToken()
    setToken(null)
    if (onTokenChange) onTokenChange(null)
  }

  if (token) {
    const isApiKey = token.startsWith('AIzaSy')
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isApiKey ? 'Gemini API Key 연동 완료' : '구글 OAuth 연동 완료'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3 w-3 mr-1" /> 해제 / 로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {showKeyInput ? (
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-purple-500/30">
          <input
            type="password"
            placeholder="Gemini API Key (AIzaSy...)"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            className="h-7 px-2 text-xs bg-transparent focus:outline-none w-48 font-mono"
          />
          <Button
            size="sm"
            onClick={handleSaveCustomKey}
            className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
          >
            저장
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyInput(false)}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            취소
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoogleLogin}
            className="h-8 border-purple-500/30 text-purple-700 hover:bg-purple-500/10 dark:text-purple-400 font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-500" />
            G 구글 로그인
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyInput(true)}
            className="h-8 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-medium"
          >
            <Key className="h-3.5 w-3.5 mr-1" />
            Gemini API Key 직접 입력
          </Button>
        </div>
      )}
    </div>
  )
}
