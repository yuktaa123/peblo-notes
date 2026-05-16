import { NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'
import { createClient } from '@/lib/supabase/server'

export class UnauthorizedError extends Error {
  status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends Error {
  status = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  status = 400
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new UnauthorizedError()
  return user
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ValidationError(result.error.message)
  }
  return result.data
}

export function handleApiError(error: unknown): NextResponse {
  if (
    error instanceof UnauthorizedError ||
    error instanceof NotFoundError ||
    error instanceof ValidationError
  ) {
    console.error(`[${error.name}]`, error.message)
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[UnhandledApiError]', error)
  const message = error instanceof Error ? error.message : 'Internal server error'
  return NextResponse.json({ error: message }, { status: 500 })
}
