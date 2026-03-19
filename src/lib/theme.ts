'use client'

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type Theme = 'light' | 'dark'

export const themeAtom = atomWithStorage<Theme>('mdd-theme', 'light')
