import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'SPAC refresh endpoint is active',
    refreshed_at: new Date().toISOString(),
  })
}
