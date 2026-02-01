// Mock data for The Board — kanban task view
// Will be replaced with real Forge API calls later

export type BoardColumn = 'queued' | 'working' | 'needs-you' | 'done'
export type Priority = 0 | 1 | 2

export interface Expert {
  id: string
  name: string
  initial: string
  color: string // bg color for avatar
  business: string
}

export interface BoardTask {
  id: string
  title: string
  description: string
  priority: Priority
  column: BoardColumn
  expert: Expert
  business: string
  labels: string[]
  createdAt: Date
  enteredColumnAt: Date
  approvalDetails?: string // for needs-you tasks
  workLog?: string // expert's work summary
}

// ── Experts ────────────────────────────────────────────

export const EXPERTS: Expert[] = [
  { id: 'sofia', name: 'Sofia Marketing', initial: 'S', color: '#ec4899', business: 'Adaptaphoria' },
  { id: 'marcus', name: 'Marcus Finance', initial: 'M', color: '#f59e0b', business: 'Adaptaphoria' },
  { id: 'elena', name: 'Elena Design', initial: 'E', color: '#8b5cf6', business: 'Adaptaphoria' },
  { id: 'kai', name: 'Kai Engineering', initial: 'K', color: '#06b6d4', business: 'Adaptaphoria' },
  { id: 'nina', name: 'Nina Operations', initial: 'N', color: '#22c55e', business: 'Adaptaphoria' },
  { id: 'alex', name: 'Alex Research', initial: 'A', color: '#f97316', business: 'Peptok' },
  { id: 'luna', name: 'Luna Content', initial: 'L', color: '#a855f7', business: 'Pronoia' },
  { id: 'ravi', name: 'Ravi Analytics', initial: 'R', color: '#14b8a6', business: 'HelloSpore' },
]

export const BUSINESSES = ['Adaptaphoria', 'Peptok', 'Pronoia', 'HelloSpore']

// ── Time helpers ───────────────────────────────────────

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000)
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

export function timeInColumn(enteredAt: Date): string {
  const diff = Date.now() - enteredAt.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

// ── Mock Tasks ─────────────────────────────────────────

export const MOCK_TASKS: BoardTask[] = [
  // QUEUED (5 tasks)
  {
    id: 'task-001',
    title: 'Draft Q3 social media campaign calendar',
    description: 'Create a comprehensive social media calendar for Q3 covering Instagram, TikTok, and LinkedIn. Focus on product launches and seasonal themes.',
    priority: 1,
    column: 'queued',
    expert: EXPERTS[0], // Sofia
    business: 'Adaptaphoria',
    labels: ['marketing', 'social'],
    createdAt: daysAgo(2),
    enteredColumnAt: daysAgo(2),
    workLog: 'Not started yet.',
  },
  {
    id: 'task-002',
    title: 'Analyze competitor pricing strategies',
    description: 'Deep dive into competitor pricing for nootropic beverages. Compare unit economics, subscription models, and promotional strategies.',
    priority: 2,
    column: 'queued',
    expert: EXPERTS[1], // Marcus
    business: 'Adaptaphoria',
    labels: ['finance', 'research'],
    createdAt: daysAgo(1),
    enteredColumnAt: daysAgo(1),
    workLog: 'Not started yet.',
  },
  {
    id: 'task-003',
    title: 'Set up analytics dashboard for article performance',
    description: 'Build a dashboard tracking page views, time on page, and conversion rates for all Peptok articles.',
    priority: 2,
    column: 'queued',
    expert: EXPERTS[7], // Ravi
    business: 'Peptok',
    labels: ['analytics', 'infrastructure'],
    createdAt: hoursAgo(12),
    enteredColumnAt: hoursAgo(12),
    workLog: 'Not started yet.',
  },
  {
    id: 'task-004',
    title: 'Research peptide bioavailability studies for BPC-157 article',
    description: 'Compile recent peer-reviewed studies on BPC-157 bioavailability via different routes of administration.',
    priority: 1,
    column: 'queued',
    expert: EXPERTS[5], // Alex
    business: 'Peptok',
    labels: ['research', 'content'],
    createdAt: hoursAgo(6),
    enteredColumnAt: hoursAgo(6),
    workLog: 'Not started yet.',
  },
  {
    id: 'task-005',
    title: 'Write weekly newsletter for Pronoia subscribers',
    description: 'Draft this week\'s Pronoia newsletter covering AI developments, personal essays, and project updates.',
    priority: 2,
    column: 'queued',
    expert: EXPERTS[6], // Luna
    business: 'Pronoia',
    labels: ['content', 'newsletter'],
    createdAt: hoursAgo(3),
    enteredColumnAt: hoursAgo(3),
    workLog: 'Not started yet.',
  },

  // WORKING (6 tasks)
  {
    id: 'task-006',
    title: 'Design new product label for Adaptaphoria Focus blend',
    description: 'Create a premium label design for the new Focus blend. Must align with brand guidelines and FDA labeling requirements.',
    priority: 0,
    column: 'working',
    expert: EXPERTS[2], // Elena
    business: 'Adaptaphoria',
    labels: ['design', 'product'],
    createdAt: daysAgo(3),
    enteredColumnAt: hoursAgo(18),
    workLog: 'Working on initial concepts. Have 3 variations ready — exploring a minimal geometric approach. Color palette locked: deep indigo + electric blue gradient.',
  },
  {
    id: 'task-007',
    title: 'Implement Stripe subscription billing integration',
    description: 'Add subscription billing support with Stripe. Handle plan creation, upgrades, downgrades, and cancellation flows.',
    priority: 0,
    column: 'working',
    expert: EXPERTS[3], // Kai
    business: 'Adaptaphoria',
    labels: ['engineering', 'payments'],
    createdAt: daysAgo(4),
    enteredColumnAt: daysAgo(2),
    workLog: 'Stripe webhooks hooked up. Customer portal working. Testing upgrade/downgrade flows now. Need to handle proration edge cases.',
  },
  {
    id: 'task-008',
    title: 'Optimize warehouse fulfillment workflow',
    description: 'Streamline the pick-pack-ship process. Reduce average fulfillment time from 48h to 24h.',
    priority: 1,
    column: 'working',
    expert: EXPERTS[4], // Nina
    business: 'Adaptaphoria',
    labels: ['operations', 'logistics'],
    createdAt: daysAgo(5),
    enteredColumnAt: daysAgo(1),
    workLog: 'Mapped current workflow. Identified 3 bottlenecks: label printing queue, staging area congestion, carrier pickup scheduling. Working on solutions.',
  },
  {
    id: 'task-009',
    title: 'Build vendor comparison calculator for Peptok',
    description: 'Interactive calculator that lets users compare peptide vendors on price per mg, purity, and shipping.',
    priority: 1,
    column: 'working',
    expert: EXPERTS[3], // Kai
    business: 'Peptok',
    labels: ['engineering', 'feature'],
    createdAt: daysAgo(2),
    enteredColumnAt: hoursAgo(8),
    workLog: 'Component scaffolding done. Working on the comparison algorithm and data model. UI mockup approved.',
  },
  {
    id: 'task-010',
    title: 'Create Instagram Reels content batch — 5 videos',
    description: 'Produce 5 short-form videos showcasing Adaptaphoria products, behind-the-scenes, and customer testimonials.',
    priority: 1,
    column: 'working',
    expert: EXPERTS[0], // Sofia
    business: 'Adaptaphoria',
    labels: ['marketing', 'video'],
    createdAt: daysAgo(3),
    enteredColumnAt: daysAgo(1),
    workLog: 'Scripts written for all 5. 2 videos filmed and edited. Working on the remaining 3. Scheduled for upload next week.',
  },
  {
    id: 'task-011',
    title: 'Migrate blog posts to new CMS structure',
    description: 'Move all existing Pronoia blog posts from markdown to the new MDX format with metadata enrichment.',
    priority: 2,
    column: 'working',
    expert: EXPERTS[6], // Luna
    business: 'Pronoia',
    labels: ['content', 'migration'],
    createdAt: daysAgo(6),
    enteredColumnAt: daysAgo(3),
    workLog: '18/32 posts migrated. Enriching metadata for SEO. Some posts need image optimization before migration.',
  },

  // NEEDS YOU (4 tasks)
  {
    id: 'task-012',
    title: 'APPROVE: $12,500 ad spend budget for July campaign',
    description: 'Sofia has prepared the July ad campaign. Budget breakdown: $5,000 Meta, $4,000 Google, $2,000 TikTok, $1,500 influencer partnerships. ROI projection: 3.2x based on June performance.',
    priority: 0,
    column: 'needs-you',
    expert: EXPERTS[0], // Sofia
    business: 'Adaptaphoria',
    labels: ['marketing', 'budget'],
    createdAt: daysAgo(1),
    enteredColumnAt: hoursAgo(4),
    approvalDetails: 'Monthly ad spend allocation needs owner approval. Sofia has provided ROI projections and channel breakdown.',
    workLog: 'Campaign strategy deck complete. Creative assets ready. Targeting parameters set based on June learnings. Just need budget sign-off to launch.',
  },
  {
    id: 'task-013',
    title: 'REVIEW: New product formulation — Adaptaphoria Calm',
    description: 'Elena has finalized the label design and Marcus has completed the cost analysis for the new Calm blend. Need your sign-off on the formula, pricing, and go-to-market date.',
    priority: 0,
    column: 'needs-you',
    expert: EXPERTS[2], // Elena
    business: 'Adaptaphoria',
    labels: ['product', 'launch'],
    createdAt: daysAgo(2),
    enteredColumnAt: hoursAgo(6),
    approvalDetails: 'New product launch requires owner approval on formula, pricing strategy ($34.99 suggested), and launch date (Aug 15).',
    workLog: 'Label design v3 attached. Cost analysis shows 62% margin at $34.99. Formulation uses L-theanine, GABA, and ashwagandha KSM-66.',
  },
  {
    id: 'task-014',
    title: 'APPROVE: Partnership deal with wellness influencer (180K followers)',
    description: 'Nina negotiated a 3-month partnership with @WellnessWithJade. Terms: $3,000/month + 10% affiliate commission. She averages 4.2% engagement rate.',
    priority: 1,
    column: 'needs-you',
    expert: EXPERTS[4], // Nina
    business: 'Adaptaphoria',
    labels: ['partnerships', 'influencer'],
    createdAt: hoursAgo(8),
    enteredColumnAt: hoursAgo(2),
    approvalDetails: 'Influencer partnership contract ready for signature. Nina recommends approval based on audience overlap analysis.',
    workLog: 'Vetted the influencer thoroughly. Audience demographics: 78% female, 22-35 age range, 65% US-based. Perfect for our target. Contract terms are favorable.',
  },
  {
    id: 'task-015',
    title: 'REVIEW: Peptok article on Semaglutide research',
    description: 'Alex has completed a comprehensive article on semaglutide research findings. Needs editorial review before publishing — sensitive topic that requires careful framing.',
    priority: 1,
    column: 'needs-you',
    expert: EXPERTS[5], // Alex
    business: 'Peptok',
    labels: ['content', 'review'],
    createdAt: hoursAgo(5),
    enteredColumnAt: hoursAgo(1),
    approvalDetails: 'Article covers off-label use research. Needs careful review for medical disclaimer compliance and balanced framing.',
    workLog: 'Article complete at 2,800 words. Includes 12 citations from peer-reviewed journals. Ran through compliance checklist. Flagging for human review due to sensitive topic.',
  },

  // DONE (4 tasks)
  {
    id: 'task-016',
    title: 'Set up email automation for abandoned cart recovery',
    description: 'Configure 3-email sequence for cart abandonment. Email 1: 1hr reminder, Email 2: 24hr with 10% discount, Email 3: 72hr last chance.',
    priority: 1,
    column: 'done',
    expert: EXPERTS[0], // Sofia
    business: 'Adaptaphoria',
    labels: ['marketing', 'email'],
    createdAt: daysAgo(7),
    enteredColumnAt: hoursAgo(6),
    workLog: 'All 3 emails designed, tested, and live. A/B testing subject lines. Early data: 12% recovery rate on Email 1.',
  },
  {
    id: 'task-017',
    title: 'Generate monthly P&L report for June',
    description: 'Compile revenue, COGS, operating expenses, and net profit for June. Compare against budget and May actuals.',
    priority: 1,
    column: 'done',
    expert: EXPERTS[1], // Marcus
    business: 'Adaptaphoria',
    labels: ['finance', 'reporting'],
    createdAt: daysAgo(5),
    enteredColumnAt: daysAgo(1),
    workLog: 'Report complete. Revenue: $47.2K (+18% MoM). Net margin: 23%. Key driver: subscription growth (+32%). Report uploaded to shared drive.',
  },
  {
    id: 'task-018',
    title: 'Fix mobile responsive issues on Pronoia blog',
    description: 'Several blog post pages have layout issues on mobile. Fix typography scaling, image overflow, and navigation menu.',
    priority: 2,
    column: 'done',
    expert: EXPERTS[3], // Kai
    business: 'Pronoia',
    labels: ['engineering', 'bugfix'],
    createdAt: daysAgo(4),
    enteredColumnAt: daysAgo(2),
    workLog: 'Fixed all 7 reported issues. Tested on iPhone 14, Pixel 7, and iPad. Pushed to production. No regressions in Lighthouse scores.',
  },
  {
    id: 'task-019',
    title: 'Onboard new supplier for adaptogen ingredients',
    description: 'Complete supplier vetting, negotiate terms, and set up procurement workflow for new ashwagandha and rhodiola supplier.',
    priority: 2,
    column: 'done',
    expert: EXPERTS[4], // Nina
    business: 'Adaptaphoria',
    labels: ['operations', 'procurement'],
    createdAt: daysAgo(10),
    enteredColumnAt: daysAgo(3),
    workLog: 'Supplier vetted and approved. COA verified. Terms: Net 30, 15% volume discount at 500kg+. First order placed.',
  },
]

// ── Priority config ────────────────────────────────────

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dotColor: string }> = {
  0: { label: 'P0', color: '#ef4444', dotColor: 'bg-red-500' },
  1: { label: 'P1', color: '#f59e0b', dotColor: 'bg-amber-500' },
  2: { label: 'P2', color: '#22c55e', dotColor: 'bg-green-500' },
}

// ── Column config ──────────────────────────────────────

export interface ColumnConfig {
  key: BoardColumn
  label: string
  headerColor: string
  borderColor?: string
  urgent?: boolean
}

export const COLUMNS: ColumnConfig[] = [
  { key: 'queued', label: 'Queued', headerColor: '#6b7280' },
  { key: 'working', label: 'Working', headerColor: '#3b82f6' },
  { key: 'needs-you', label: 'Needs You', headerColor: '#ef4444', borderColor: '#ef4444', urgent: true },
  { key: 'done', label: 'Done', headerColor: '#22c55e' },
]
