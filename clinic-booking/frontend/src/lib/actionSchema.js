import { z } from 'zod'

// Mirrors clinic-booking/api-server/claude/action_schema.py

const QuickReplies = z.object({
  type: z.literal('quick_replies'),
  items: z.array(z.string()).min(1).max(8),
})

const LocationRequest = z.object({
  type: z.literal('location_request'),
  default_zip:    z.string().default(''),
  default_radius: z.number().default(10),
})

const BookingSummary = z.object({
  type: z.literal('booking_summary'),
  candidate:          z.string(),
  test_type:          z.string(),
  service_identifier: z.string(),
  reason:             z.string(),
  clinic:             z.string(),
  site_id:            z.string(),
  address:            z.string(),
  zip:                z.string(),
  preferred_date:     z.string(),
})

const BookingConfirmed = z.object({
  type: z.literal('booking_confirmed'),
  registration_id:    z.string(),
  candidate:          z.string(),
  test_type:          z.string(),
  reason:             z.string(),
  clinic:             z.string(),
  address:            z.string(),
  zip:                z.string(),
  preferred_date:     z.string(),
  appointment_window: z.string().nullish(),
})

const Action = z.discriminatedUnion('type', [QuickReplies, LocationRequest, BookingSummary, BookingConfirmed])

export const ReplyEnvelope = z.object({
  message: z.string().default(''),
  actions: z.array(Action).default([]),
})

export function safeParseActions(actions) {
  if (!Array.isArray(actions)) return []
  const out = []
  for (const a of actions) {
    const r = Action.safeParse(a)
    if (r.success) out.push(r.data)
    else console.warn('[ActionSchema] dropped invalid action:', a, r.error.issues[0])
  }
  return out
}

// Helpers for finding specific action types
export const findAction = (actions, type) => actions?.find(a => a?.type === type) ?? null
export const findActions = (actions, type) => actions?.filter(a => a?.type === type) ?? []
