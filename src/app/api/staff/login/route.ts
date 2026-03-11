import { NextRequest, NextResponse } from 'next/server'

const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'Cat123'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  if (password !== STAFF_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Simple signed token: base64(timestamp + secret)
  const token = Buffer.from(`staff:${Date.now()}:${STAFF_PASSWORD}`).toString('base64')

  return NextResponse.json({ access_token: token })
}
