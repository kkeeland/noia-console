import { createElement, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, FolderGit2, Scale, Heart, Lightbulb, Loader2, X, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { getEntities, getRelations, type Entity, type Relation } from '../lib/memory'

// --- Entity type config ---
const ENTITY_TYPES = [
  { key: 'all', label: 'All', icon: null, color: 'bg-[#1e1e2e] text-[#71717a] border-[#1e1e2e]' },
  { key: 'person', label: 'People', icon: Users, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'project', label: 'Projects', icon: FolderGit2, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'decision', label: 'Decisions', icon: Scale, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'preference', label: 'Preferences', icon: Heart, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { key: 'lesson', label: 'Lessons', icon: Lightbulb, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
] as const

const TYPE_COLORS: Record<string, string> = {
  person: '#3b82f6',
  project: '#a855f7',
  decision: '#f59e0b',
  preference: '#f43f5e',
  lesson: '#10b981',
}

function getTypeStyle(type: string): string {
  return ENTITY_TYPES.find(t => t.key === type)?.color || 'bg-[#1e1e2e] text-[#71717a] border-[#1e1e2e]'
}

function getTypeIcon(type: string) {
  return ENTITY_TYPES.find(t => t.key === type)?.icon || null
}

// --- Force-directed graph ---
interface GraphNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface GraphEdge {
  source: string
  target: string
  label: string
}

function ForceGraph({
  entities, relations, onSelect, selectedId,
}: {
  entities: Entity[]
  relations: Relation[]
  onSelect: (entity: Entity | null) => void
  selectedId: string | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<number>(0)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ nodeId: string | null; startX: number; startY: number; isPanning: boolean }>({
    nodeId: null, startX: 0, startY: 0, isPanning: false,
  })

  const edges: GraphEdge[] = useMemo(() =>
    relations.map(r => ({ source: r.from, target: r.to, label: r.type })),
    [relations]
  )

  // Initialize nodes from entities (runs when data changes)
  useEffect(() => {
    const w = 600
    const h = 400
    const newNodes: GraphNode[] = entities.slice(0, 40).map((e, i) => {
      const angle = (i / entities.length) * 2 * Math.PI
      const r = 120 + Math.random() * 60
      return {
        id: e.name,
        label: e.name.length > 14 ? e.name.slice(0, 12) + '…' : e.name,
        type: e.type,
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 8 + Math.min(6, (relations.filter(r => r.from === e.name || r.to === e.name).length) * 2),
      }
    })
    setNodes(newNodes) // eslint-disable-line react-hooks/set-state-in-effect
  }, [entities, relations])

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return

    let running = true
    let temperature = 1.0
    const w = 600, h = 400

    const tick = () => {
      if (!running || temperature < 0.01) return

      setNodes(prev => {
        const next = prev.map(n => ({ ...n }))
        const nodeMap = new Map(next.map(n => [n.id, n]))

        // Repulsion between all nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x
            const dy = next[j].y - next[i].y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const force = (800 / (dist * dist)) * temperature
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            next[i].vx -= fx
            next[i].vy -= fy
            next[j].vx += fx
            next[j].vy += fy
          }
        }

        // Attraction along edges
        for (const edge of edges) {
          const s = nodeMap.get(edge.source)
          const t = nodeMap.get(edge.target)
          if (!s || !t) continue
          const dx = t.x - s.x
          const dy = t.y - s.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = (dist - 100) * 0.02 * temperature
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          const sn = next.find(n => n.id === s.id)!
          const tn = next.find(n => n.id === t.id)!
          sn.vx += fx
          sn.vy += fy
          tn.vx -= fx
          tn.vy -= fy
        }

        // Center gravity
        for (const n of next) {
          n.vx += (w / 2 - n.x) * 0.005 * temperature
          n.vy += (h / 2 - n.y) * 0.005 * temperature
        }

        // Apply velocity with damping
        for (const n of next) {
          if (dragRef.current.nodeId === n.id) continue
          n.vx *= 0.85
          n.vy *= 0.85
          n.x += n.vx
          n.y += n.vy
          // Bounds
          n.x = Math.max(n.radius, Math.min(w - n.radius, n.x))
          n.y = Math.max(n.radius, Math.min(h - n.radius, n.y))
        }

        return next
      })

      temperature *= 0.995
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [nodes.length, edges])

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId?: string) => {
    if (nodeId) {
      dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY, isPanning: false }
    } else {
      dragRef.current = { nodeId: null, startX: e.clientX - pan.x, startY: e.clientY - pan.y, isPanning: true }
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.isPanning) {
      setPan({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY })
    } else if (dragRef.current.nodeId) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom
      setNodes(prev => prev.map(n =>
        n.id === dragRef.current.nodeId ? { ...n, x, y, vx: 0, vy: 0 } : n
      ))
    }
  }, [pan, zoom])

  const handleMouseUp = useCallback(() => {
    dragRef.current = { nodeId: null, startX: 0, startY: 0, isPanning: false }
  }, [])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  return (
    <div className="relative bg-[#12121a] rounded-xl border border-[#1e1e2e] overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.2))}
          className="p-1.5 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
          className="p-1.5 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className="p-1.5 rounded-lg bg-[#1e1e2e]/80 text-[#71717a] hover:text-[#e4e4e7] backdrop-blur-sm"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] text-[#71717a]">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type}
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 600 400"
        className="w-full h-[350px] cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const s = nodeMap.get(edge.source)
            const t = nodeMap.get(edge.target)
            if (!s || !t) return null
            const isHighlighted = selectedId === edge.source || selectedId === edge.target
            return (
              <g key={i}>
                <line
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isHighlighted ? '#8b5cf6' : '#1e1e2e'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.4}
                />
                {isHighlighted && (
                  <text
                    x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6}
                    textAnchor="middle"
                    className="fill-[#71717a] text-[8px]"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedId === node.id
            const color = TYPE_COLORS[node.type] || '#8b5cf6'
            const entity = entities.find(e => e.name === node.id)

            return (
              <g
                key={node.id}
                onMouseDown={e => { e.stopPropagation(); handleMouseDown(e, node.id) }}
                onClick={() => entity && onSelect(isSelected ? null : entity)}
                className="cursor-pointer"
              >
                {/* Glow */}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={node.radius + 6} fill={color} opacity={0.15} />
                )}
                {/* Node circle */}
                <circle
                  cx={node.x} cy={node.y} r={node.radius}
                  fill={isSelected ? color : `${color}33`}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Label */}
                <text
                  x={node.x} y={node.y + node.radius + 12}
                  textAnchor="middle"
                  className={`text-[9px] ${isSelected ? 'fill-[#e4e4e7] font-medium' : 'fill-[#71717a]'}`}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// --- Entity Card ---
function renderTypeIcon(type: string, className: string) {
  const Icon = getTypeIcon(type)
  if (!Icon) return null
  return createElement(Icon, { className })
}

function EntityCard({ entity, onClick, index }: { entity: Entity; onClick: () => void; index: number }) {
  const style = getTypeStyle(entity.type)
  const props = Object.entries(entity.properties).filter(([k]) => k !== 'fullText' && k !== 'context')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 
                 hover:border-[#8b5cf6]/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 p-2 rounded-lg border ${style}`}>
          {renderTypeIcon(entity.type, "w-4 h-4")}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[#e4e4e7] text-sm truncate group-hover:text-[#8b5cf6] transition-colors">
            {entity.name}
          </h4>
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 ${style}`}>
            {entity.type}
          </span>
        </div>
      </div>
      {props.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {props.slice(0, 3).map(([key, value]) => (
            <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e2e] text-[#71717a]">
              {key}: {String(value).slice(0, 30)}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 text-[10px] text-[#525252] flex items-center gap-2">
        <span className="truncate">{entity.source}</span>
        {entity.lastSeen && <span className="shrink-0">{entity.lastSeen.split(' ')[0]}</span>}
      </div>
    </motion.div>
  )
}

// --- Entity Detail ---
function EntityDetail({ entity, relations, onClose }: { entity: Entity; relations: Relation[]; onClose: () => void }) {
  const style = getTypeStyle(entity.type)
  const allProps = Object.entries(entity.properties)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-5 h-fit sticky top-0"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${style}`}>
            {renderTypeIcon(entity.type, "w-5 h-5")}
          </div>
          <div>
            <h3 className="font-semibold text-[#e4e4e7]">{entity.name}</h3>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border mt-1 ${style}`}>
              {entity.type}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {allProps.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wider">Properties</h4>
          <div className="flex flex-col gap-1.5">
            {allProps.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <span className="text-[#525252] shrink-0 font-mono text-xs">{key}:</span>
                <span className="text-[#a1a1aa] break-all text-xs">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wider">Source</h4>
        <p className="text-xs text-[#a1a1aa] font-mono">{entity.source}</p>
        <div className="flex gap-4 mt-1 text-[10px] text-[#525252]">
          <span>First: {entity.firstSeen}</span>
          <span>Last: {entity.lastSeen}</span>
        </div>
      </div>

      {relations.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wider">
            Relations ({relations.length})
          </h4>
          <div className="flex flex-col gap-1.5">
            {relations.map((rel, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#a1a1aa] bg-[#0a0a0f] rounded-lg px-2 py-1.5">
                <span className="text-[#e4e4e7] font-medium">{rel.from}</span>
                <ArrowRight className="w-3 h-3 text-[#525252]" />
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e2e] text-[#8b5cf6] text-[10px] font-medium">{rel.type}</span>
                <ArrowRight className="w-3 h-3 text-[#525252]" />
                <span className="text-[#e4e4e7] font-medium">{rel.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// --- View toggle ---
type ViewMode = 'graph' | 'grid'

export default function MemoryEntities() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return entities
    return entities.filter(e => e.type === activeFilter)
  }, [entities, activeFilter])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entities.length }
    for (const e of entities) {
      counts[e.type] = (counts[e.type] || 0) + 1
    }
    return counts
  }, [entities])

  const entityRelations = useMemo(() => {
    if (!selectedEntity) return []
    return relations.filter(r => r.from === selectedEntity.name || r.to === selectedEntity.name)
  }, [selectedEntity, relations])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs + view toggle */}
      <div className="flex items-center gap-2 p-6 pb-3 overflow-x-auto">
        {ENTITY_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveFilter(key); setSelectedEntity(null) }}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
              ${activeFilter === key ? 'bg-[#8b5cf6] text-white' : 'bg-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7]'}
            `}
          >
            {label}
            {(typeCounts[key] ?? 0) > 0 && (
              <span className="ml-1.5 opacity-70">({typeCounts[key]})</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 bg-[#1e1e2e] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              viewMode === 'graph' ? 'bg-[#8b5cf6] text-white' : 'text-[#71717a] hover:text-[#e4e4e7]'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-[#8b5cf6] text-white' : 'text-[#71717a] hover:text-[#e4e4e7]'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {viewMode === 'graph' ? (
              <ForceGraph
                entities={filtered}
                relations={relations}
                onSelect={setSelectedEntity}
                selectedId={selectedEntity?.name || null}
              />
            ) : (
              <div className={`grid gap-3 ${selectedEntity ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                <AnimatePresence>
                  {filtered.map((entity, i) => (
                    <EntityCard
                      key={`${entity.type}-${entity.name}`}
                      entity={entity}
                      index={i}
                      onClick={() => setSelectedEntity(entity)}
                    />
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-12 text-[#525252] text-sm">
                    No {activeFilter === 'all' ? '' : activeFilter} entities found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedEntity && (
              <div className="w-80 shrink-0">
                <EntityDetail
                  entity={selectedEntity}
                  relations={entityRelations}
                  onClose={() => setSelectedEntity(null)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
