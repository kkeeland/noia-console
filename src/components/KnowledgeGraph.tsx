import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import {
  Search, X, ArrowRight, Loader2, Filter, Maximize2,
  Users, FolderGit2, Scale, Heart, Lightbulb, ZoomIn, ZoomOut,
} from 'lucide-react'
import { getEntities, getRelations, type Entity, type Relation } from '../lib/memory'

// --- Type config ---
const NODE_COLORS: Record<string, string> = {
  person: '#3b82f6',
  project: '#22c55e',
  decision: '#eab308',
  preference: '#f43f5e',
  lesson: '#8b5cf6',
}

const NODE_ICONS: Record<string, React.ElementType> = {
  person: Users,
  project: FolderGit2,
  decision: Scale,
  preference: Heart,
  lesson: Lightbulb,
}

const TYPE_LABELS: Record<string, string> = {
  person: 'People',
  project: 'Projects',
  decision: 'Decisions',
  preference: 'Preferences',
  lesson: 'Lessons',
}

function getColor(type: string): string {
  return NODE_COLORS[type] || '#71717a'
}

// --- Graph data types ---
interface GraphNode {
  id: string
  name: string
  type: string
  entity: Entity
  val: number // node size
  color: string
  // Mutated by d3-force at runtime
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphLink {
  source: string
  target: string
  label: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

// --- Main component ---
export default function KnowledgeGraph() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined)

  // Load data
  useEffect(() => {
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([getEntities(), getRelations()])
      .then(([ents, rels]) => {
        setEntities(ents)
        setRelations(rels)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width: Math.floor(width), height: Math.floor(height) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Build graph data with filters
  const graphData: GraphData = useMemo(() => {
    const query = searchQuery.toLowerCase()
    const nodeSet = new Set<string>()

    // Filter entities
    let filtered = entities
    if (activeFilters.size > 0) {
      filtered = filtered.filter(e => activeFilters.has(e.type))
    }
    if (query) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.type.toLowerCase().includes(query)
      )
    }

    const nodes: GraphNode[] = filtered.map(e => {
      nodeSet.add(e.name)
      const connectionCount = relations.filter(
        r => r.from === e.name || r.to === e.name
      ).length
      return {
        id: e.name,
        name: e.name.length > 20 ? e.name.slice(0, 18) + '…' : e.name,
        type: e.type,
        entity: e,
        val: 2 + Math.min(8, connectionCount * 1.5),
        color: getColor(e.type),
      }
    })

    // Only include links where both endpoints exist
    const links: GraphLink[] = relations
      .filter(r => nodeSet.has(r.from) && nodeSet.has(r.to))
      .map(r => ({
        source: r.from,
        target: r.to,
        label: r.type.replace(/_/g, ' '),
      }))

    return { nodes, links }
  }, [entities, relations, searchQuery, activeFilters])

  // Type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entities) {
      counts[e.type] = (counts[e.type] || 0) + 1
    }
    return counts
  }, [entities])

  // Connected node IDs for hover highlight
  const connectedIds = useMemo(() => {
    if (!hoveredNode && !selectedNode) return null
    const targetId = (hoveredNode || selectedNode)?.id
    if (!targetId) return null
    const ids = new Set<string>([targetId])
    for (const link of graphData.links) {
      const src = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source
      const tgt = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target
      if (src === targetId) ids.add(tgt)
      if (tgt === targetId) ids.add(src)
    }
    return ids
  }, [hoveredNode, selectedNode, graphData.links])

  // Node relations for detail panel
  const nodeRelations = useMemo(() => {
    if (!selectedNode) return []
    return relations.filter(
      r => r.from === selectedNode.id || r.to === selectedNode.id
    )
  }, [selectedNode, relations])

  // Toggle filter
  const toggleFilter = useCallback((type: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  // Center graph
  const centerGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 40)
    }
  }, [])

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.3, 300)
    }
  }, [])

  const zoomOut = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.3, 300)
    }
  }, [])

  // Custom node renderer
  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = connectedIds ? connectedIds.has(node.id) : true
    const isSelected = selectedNode?.id === node.id
    const baseRadius = node.val
    const radius = isSelected ? baseRadius + 2 : baseRadius
    const alpha = isHighlighted ? 1 : 0.15
    const x = node.x ?? 0
    const y = node.y ?? 0

    // Glow for selected
    if (isSelected) {
      ctx.beginPath()
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI)
      ctx.fillStyle = node.color + '33'
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isSelected
      ? node.color
      : `${node.color}${Math.round(alpha * 0.3 * 255).toString(16).padStart(2, '0')}`
    ctx.fill()
    ctx.strokeStyle = node.color + (isHighlighted ? 'cc' : '33')
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.stroke()

    // Label (only when zoomed in enough or selected)
    if (globalScale > 0.7 || isSelected) {
      const fontSize = Math.max(10 / globalScale, 2.5)
      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isHighlighted
        ? (isSelected ? '#e4e4e7' : '#a1a1aa')
        : '#52525244'
      ctx.fillText(node.name, x, y + radius + 2)
    }
  }, [connectedIds, selectedNode])

  // Custom link renderer
  const paintLink = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source as unknown as GraphNode
    const tgt = link.target as unknown as GraphNode
    if (!src.x || !tgt.x) return

    const isHighlighted = connectedIds
      ? connectedIds.has(src.id) && connectedIds.has(tgt.id)
      : true

    ctx.beginPath()
    ctx.moveTo(src.x, src.y ?? 0)
    ctx.lineTo(tgt.x, tgt.y ?? 0)
    ctx.strokeStyle = isHighlighted ? '#8b5cf688' : '#1e1e2e44'
    ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 0.5 / globalScale
    ctx.stroke()

    // Edge label when highlighted and zoomed in
    if (isHighlighted && globalScale > 1.2) {
      const midX = (src.x + tgt.x) / 2
      const midY = ((src.y ?? 0) + (tgt.y ?? 0)) / 2
      const fontSize = Math.max(8 / globalScale, 2)
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#8b5cf6aa'
      ctx.fillText(link.label, midX, midY - 3 / globalScale)
    }
  }, [connectedIds])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="w-5 h-5 text-[#8b5cf6] animate-spin" />
        <span className="text-sm text-[#71717a]">Loading knowledge graph…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e2e]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#525252]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entities…"
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#12121a] border border-[#1e1e2e] text-sm text-[#e4e4e7] placeholder-[#525252] focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#e4e4e7]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#525252] mr-1" />
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const count = typeCounts[type] || 0
            if (count === 0) return null
            const active = activeFilters.has(type)
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                  ${active
                    ? 'text-white'
                    : 'bg-[#1e1e2e] text-[#71717a] hover:text-[#a1a1aa]'
                  }
                `}
                style={active ? { backgroundColor: getColor(type) + '33', color: getColor(type) } : undefined}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getColor(type), opacity: active ? 1 : 0.5 }}
                />
                {label}
                <span className="opacity-60">{count}</span>
              </button>
            )
          })}
          {activeFilters.size > 0 && (
            <button
              onClick={() => setActiveFilters(new Set())}
              className="text-[10px] text-[#525252] hover:text-[#e4e4e7] px-1.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Graph stats */}
        <div className="ml-auto text-[11px] text-[#525252] flex items-center gap-3">
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.links.length} edges</span>
        </div>
      </div>

      {/* Graph + Detail panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-[#0a0a0f]"
        >
          {dimensions.width > 0 && (
            <ForceGraph2D
              ref={graphRef as React.MutableRefObject<ForceGraphMethods | undefined>}
              graphData={graphData}
              width={dimensions.width - (selectedNode ? 320 : 0)}
              height={dimensions.height}
              nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
              linkCanvasObject={paintLink as (link: object, ctx: CanvasRenderingContext2D, globalScale: number) => void}
              onNodeClick={(node) => {
                const n = node as GraphNode
                setSelectedNode(prev => prev?.id === n.id ? null : n)
              }}
              onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
              onBackgroundClick={() => setSelectedNode(null)}
              nodeRelSize={6}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={0.8}
              backgroundColor="#0a0a0f"
              cooldownTicks={100}
              warmupTicks={50}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
          )}

          {/* Zoom controls overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
            <button
              onClick={zoomIn}
              className="p-2 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-2 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={centerGraph}
              className="p-2 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm transition-colors"
              title="Fit to view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 z-10 bg-[#12121a]/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#1e1e2e]">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-[10px] text-[#71717a]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {type}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-[#1e1e2e] bg-[#12121a] overflow-hidden shrink-0"
            >
              <div className="w-80 h-full overflow-y-auto p-5">
                <NodeDetail
                  node={selectedNode}
                  relations={nodeRelations}
                  onClose={() => setSelectedNode(null)}
                  onNavigate={(name) => {
                    const node = graphData.nodes.find(n => n.id === name)
                    if (node) {
                      setSelectedNode(node)
                      if (graphRef.current) {
                        graphRef.current.centerAt(node.x, node.y, 400)
                        graphRef.current.zoom(2, 400)
                      }
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// --- Node Detail Panel ---
function NodeDetail({
  node,
  relations,
  onClose,
  onNavigate,
}: {
  node: GraphNode
  relations: Relation[]
  onClose: () => void
  onNavigate: (name: string) => void
}) {
  const entity = node.entity
  const Icon = NODE_ICONS[entity.type]
  const color = getColor(entity.type)
  const allProps = Object.entries(entity.properties)
    .filter(([k]) => k !== 'fullText' && k !== 'context')

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg border"
            style={{
              backgroundColor: color + '15',
              borderColor: color + '30',
              color: color,
            }}
          >
            {Icon && <Icon className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-[#e4e4e7] text-sm">{entity.name}</h3>
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-medium border mt-1"
              style={{
                backgroundColor: color + '15',
                borderColor: color + '30',
                color: color,
              }}
            >
              {entity.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Properties */}
      {allProps.length > 0 && (
        <div>
          <h4 className="text-[10px] font-medium text-[#525252] mb-2 uppercase tracking-wider">
            Properties
          </h4>
          <div className="flex flex-col gap-1.5">
            {allProps.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-[#525252] shrink-0 font-mono text-[11px]">{key}:</span>
                <span className="text-[#a1a1aa] break-all text-[11px]">{String(value).slice(0, 100)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source */}
      <div>
        <h4 className="text-[10px] font-medium text-[#525252] mb-2 uppercase tracking-wider">
          Source
        </h4>
        <p className="text-[11px] text-[#a1a1aa] font-mono">{entity.source}</p>
        <div className="flex gap-4 mt-1 text-[10px] text-[#525252]">
          {entity.firstSeen && <span>First: {entity.firstSeen.split(' ')[0]}</span>}
          {entity.lastSeen && <span>Last: {entity.lastSeen.split(' ')[0]}</span>}
        </div>
      </div>

      {/* Relations */}
      {relations.length > 0 && (
        <div>
          <h4 className="text-[10px] font-medium text-[#525252] mb-2 uppercase tracking-wider">
            Relations ({relations.length})
          </h4>
          <div className="flex flex-col gap-1.5">
            {relations.map((rel, i) => {
              const isOutgoing = rel.from === node.id
              const otherName = isOutgoing ? rel.to : rel.from
              return (
                <button
                  key={i}
                  onClick={() => onNavigate(otherName)}
                  className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa] bg-[#0a0a0f] rounded-lg px-2.5 py-2 hover:bg-[#1e1e2e] transition-colors text-left w-full group"
                >
                  {isOutgoing ? (
                    <>
                      <span className="text-[#71717a]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#8b5cf6] text-[10px] font-medium shrink-0">
                        {rel.type.replace(/_/g, ' ')}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#525252] shrink-0" />
                      <span className="text-[#e4e4e7] font-medium truncate group-hover:text-[#8b5cf6] transition-colors">
                        {otherName}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#e4e4e7] font-medium truncate group-hover:text-[#8b5cf6] transition-colors">
                        {otherName}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#525252] shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#8b5cf6] text-[10px] font-medium shrink-0">
                        {rel.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#71717a]">→</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
