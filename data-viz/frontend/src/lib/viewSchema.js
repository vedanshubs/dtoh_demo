import { z } from 'zod'

// .nullish() accepts string | null | undefined — the model is allowed to emit null
// for optional fields, which .optional() alone would reject.

const KpiItem = z.object({
  label: z.string(),
  value: z.string(),
  sublabel: z.string().nullish(),
  status: z.enum(['good', 'warning', 'bad', 'neutral']).nullish().default('neutral'),
})

const ReferenceLine = z.object({
  value: z.number(),
  label: z.string(),
  color: z.enum(['red', 'amber', 'green', 'blue', 'gray']).nullish().default('red'),
})

const ColorRule = z.object({
  field: z.string(),
  threshold: z.number(),
  above_color: z.string().nullish().default('red'),
  below_color: z.string().nullish().default('green'),
})

const SegmentItem = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().nullish(),
})

const KpiStrip = z.object({
  type: z.literal('kpi_strip'),
  items: z.array(KpiItem).min(1),
})

const BarPanel = z.object({
  type: z.literal('bar'),
  title: z.string().nullish(),
  data: z.array(z.record(z.unknown())).min(1),
  x: z.string(),
  y: z.string(),
  y_label: z.string().nullish(),
  reference_lines: z.array(ReferenceLine).nullish(),
  color_rule: ColorRule.nullish(),
})

const StackedBarHorizontal = z.object({
  type: z.literal('stacked_bar_horizontal'),
  title: z.string().nullish(),
  unit: z.string().nullish().default('days'),
  segments: z.array(SegmentItem).min(1),
  reference_line: ReferenceLine.nullish(),
})

const DonutPanel = z.object({
  type: z.literal('donut'),
  title: z.string().nullish(),
  data: z.array(z.record(z.unknown())).min(1),
  name_key: z.string(),
  value_key: z.string(),
  center_label: z.string().nullish(),
})

const LinePanel = z.object({
  type: z.literal('line'),
  title: z.string().nullish(),
  data: z.array(z.record(z.unknown())).min(1),
  x: z.string(),
  y: z.string(),
  y_label: z.string().nullish(),
  reference_lines: z.array(ReferenceLine).nullish(),
  fill: z.boolean().nullish().default(true),
})

const FunnelPanel = z.object({
  type: z.literal('funnel'),
  title: z.string().nullish(),
  data: z.array(z.record(z.unknown())).min(1),
  name_key: z.string(),
  value_key: z.string(),
  highlight: z.string().nullish(),
})

const TablePanel = z.object({
  type: z.literal('table'),
  title: z.string().nullish(),
  data: z.array(z.record(z.unknown())).min(1),
  columns: z.array(z.string()).nullish(),
})

const Panel = z.discriminatedUnion('type', [
  KpiStrip, BarPanel, StackedBarHorizontal,
  DonutPanel, LinePanel, FunnelPanel, TablePanel,
])

export const ViewSchema = z.object({
  panels: z.array(Panel).min(1),
})

export const ReplySchema = z.object({
  summary: z.string(),
  view: ViewSchema.nullish(),
  suggestions: z.array(z.string()).default([]),
})

export function safeParseView(raw) {
  const result = ViewSchema.safeParse(raw)
  if (!result.success) {
    const errs = result.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`)
    console.warn('[ViewSchema] validation failed:', errs)
    return { ok: false, errors: errs, data: null }
  }
  return { ok: true, errors: [], data: result.data }
}
