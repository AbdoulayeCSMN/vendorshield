'use client';

import { useEffect, useRef, useState, useTransition, useCallback } from 'react';

import Link from 'next/link';

import {
  AlertTriangle, Brain, GitBranch, Info,
  Layers, Loader2, RefreshCw, ZoomIn, ZoomOut,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import {
  buildSupplyChainTiersAction,
  type SupplyChainGraph,
  type TierNode,
  type TierBuildResult,
} from '~/lib/vendorshield/actions/tier.actions';
import { CATEGORY_LABELS } from '~/lib/vendorshield/types';

// ─── Constantes visuelles ─────────────────────────────────────────────────────

const TIER_COLORS   = ['#6366f1', '#f97316', '#a855f7', '#ec4899'];          // par niveau
const TIER_LABELS   = ['', 'Tier 1 (direct)', 'Tier 2', 'Tier 3', 'Tier 4'];
const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f97316', high: '#ef4444', critical: '#7f1d1d', unknown: '#9ca3af',
};
const RING_RADII    = [0, 0, 140, 240, 320]; // rayon orbital par tier

function scoreColor(s: number | null) {
  if (s === null) return '#9ca3af';
  return s >= 70 ? '#22c55e' : s >= 40 ? '#f97316' : '#ef4444';
}

function riskTextClass(level: keyof typeof RISK_COLORS | null | undefined) {
  if (level === 'critical') return 'text-red-700';
  if (level === 'high') return 'text-red-600';
  if (level === 'medium') return 'text-orange-600';
  if (level === 'low') return 'text-green-600';
  return 'text-gray-500';
}

function countryFlag(code: string | null) {
  if (!code) return '';
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return '';
  return c.split('').map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('');
}

// ─── Types internes ───────────────────────────────────────────────────────────

interface LayoutNode extends TierNode {
  x: number; y: number; vx: number; vy: number; r: number;
}

interface TooltipState { x: number; y: number; node: TierNode }

// ─── Canvas renderer ─────────────────────────────────────────────────────────

function useNetworkCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  graph: SupplyChainGraph,
  onNodeClick: (node: TierNode) => void,
) {
  const animRef  = useRef<number>(0);
  const nodesRef = useRef<LayoutNode[]>([]);
  const zoomRef  = useRef(1);
  const panRef   = useRef({ x: 0, y: 0 });
  const dragRef  = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graph.nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth || 700;
    const H = canvas.offsetHeight || 480;
    canvas.width  = W;
    canvas.height = H;
    const CX = W / 2, CY = H / 2;

    // Positionner les nœuds en orbites concentriques
    const byTier = new Map<number, TierNode[]>();
    for (const n of graph.nodes) {
      if (!byTier.has(n.tier_level)) byTier.set(n.tier_level, []);
      byTier.get(n.tier_level)!.push(n);
    }

    const nodes: LayoutNode[] = [];
    for (const [tier, tNodes] of byTier) {
      const r = RING_RADII[tier] ?? 300;
      tNodes.forEach((n, i) => {
        const angle = (i / tNodes.length) * Math.PI * 2 - Math.PI / 2;
        const jitter = tier === 1 ? 0 : (Math.random() - 0.5) * 30;
        nodes.push({
          ...n,
          x: CX + (r + jitter) * Math.cos(angle),
          y: CY + (r + jitter) * Math.sin(angle),
          vx: 0, vy: 0,
          r: tier === 1 ? 22 : tier === 2 ? 14 : 10,
        });
      });
    }
    nodesRef.current = nodes;

    // Index id→node pour les liens
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Résoudre les liens
    const edges: { from: LayoutNode; to: LayoutNode; type: string }[] = [];
    for (const link of graph.links) {
      const fromId = link.from_supplier_id ?? link.from_tier_id;
      const from   = fromId ? nodeMap.get(fromId) : null;
      const to     = nodeMap.get(link.to_tier_id);
      if (from && to) edges.push({ from, to, type: link.link_type });
    }

    const simulate = () => {
      for (const n of nodes) {
        if (n.tier_level === 1) continue; // Tier 1 fixé au centre

        // Répulsion inter-nœuds du même tier
        for (const m of nodes) {
          if (n === m || m.tier_level !== n.tier_level) continue;
          const dx = n.x - m.x, dy = n.y - m.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = Math.min(600 / (d * d), 2);
          n.vx += (dx / d) * f; n.vy += (dy / d) * f;
        }

        // Attraction vers l'orbite cible
        const dx = n.x - CX, dy = n.y - CY;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = RING_RADII[n.tier_level] ?? 250;
        const diff = d - target;
        n.vx -= (dx / d) * diff * 0.03;
        n.vy -= (dy / d) * diff * 0.03;

        n.vx *= 0.88; n.vy *= 0.88;
        n.x = Math.max(n.r + 5, Math.min(W - n.r - 5, n.x + n.vx));
        n.y = Math.max(n.r + 5, Math.min(H - n.r - 5, n.y + n.vy));
      }
    };

    const draw = () => {
      simulate();
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = dark ? '#111827' : '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      // Orbites
      for (let tier = 2; tier <= 4; tier++) {
        const r = RING_RADII[tier];
        if (!byTier.has(tier)) continue;
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Arêtes
      for (const e of edges) {
        ctx.beginPath();
        ctx.moveTo(e.from.x, e.from.y);
        ctx.lineTo(e.to.x, e.to.y);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = e.type === 'supplies' ? 1 : 0.5;
        ctx.stroke();
      }

      // Nœuds
      for (const n of nodes) {
        const fill  = n.tier_level === 1
          ? TIER_COLORS[0]
          : RISK_COLORS[n.estimated_risk_level ?? 'unknown'];
        const tc    = dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)';

        // Halo sole source
        if (n.is_estimated_sole_source) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Nœud
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle   = fill;
        ctx.globalAlpha = n.is_real ? 1 : 0.78;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Bordure tier
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.strokeStyle = TIER_COLORS[n.tier_level - 1] ?? '#fff';
        ctx.lineWidth = n.tier_level === 1 ? 3 : 1.5;
        ctx.stroke();

        // Score au centre (Tier 1 seulement)
        if (n.tier_level === 1 && n.estimated_score !== null) {
          ctx.fillStyle = '#fff';
          ctx.font      = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(n.estimated_score), n.x, n.y);
        }

        // Label sous le nœud
        if (n.r >= 12) {
          ctx.fillStyle = tc;
          ctx.font = n.tier_level === 1 ? 'bold 9px sans-serif' : '7.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = n.name.length > 14 ? n.name.slice(0, 14) + '…' : n.name;
          ctx.fillText(label, n.x, n.y + n.r + 2);
        }

        // Indicateur IA (Tier 2+)
        if (!n.is_real) {
          ctx.fillStyle = '#a78bfa';
          ctx.font = '7px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText('IA', n.x + n.r - 4, n.y - n.r - 1);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Événements souris
    const getNodeAt = (ex: number, ey: number) => {
      const sx = (ex - panRef.current.x) / zoomRef.current;
      const sy = (ey - panRef.current.y) / zoomRef.current;
      return nodes.find(n => Math.hypot(n.x - sx, n.y - sy) < n.r + 8);
    };

    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.active) {
        panRef.current.x += e.clientX - dragRef.current.lastX;
        panRef.current.y += e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      const rect = canvas.getBoundingClientRect();
      const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (node) onNodeClick(node);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(3, Math.max(0.3, zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup',   onMouseUp);
    canvas.addEventListener('wheel',     onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup',   onMouseUp);
      canvas.removeEventListener('wheel',     onWheel);
    };
  }, [graph, canvasRef, onNodeClick]);

  return {
    zoomIn:  () => { zoomRef.current = Math.min(3, zoomRef.current * 1.2); },
    zoomOut: () => { zoomRef.current = Math.max(0.3, zoomRef.current * 0.8); },
    reset:   () => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; },
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface TierNetworkGraphProps {
  supplierId:   string;
  supplierName: string;
  initialGraph: SupplyChainGraph;
}

export function TierNetworkGraph({ supplierId, supplierName, initialGraph }: TierNetworkGraphProps) {
  const canvasRef              = useRef<HTMLCanvasElement>(null);
  const [graph, setGraph]      = useState(initialGraph);
  const [selectedNode, setSelectedNode] = useState<TierNode | null>(null);
  const [buildResult, setBuildResult]   = useState<TierBuildResult | null>(null);
  const [isPending, startTransition]    = useTransition();

  const handleNodeClick = useCallback((node: TierNode) => setSelectedNode(node), []);
  const { zoomIn, zoomOut, reset } = useNetworkCanvas(canvasRef, graph, handleNodeClick);

  const tier2Count = graph.nodes.filter(n => n.tier_level === 2).length;
  const tier3Count = graph.nodes.filter(n => n.tier_level === 3).length;

  const handleBuild = () => {
    setBuildResult(null);
    startTransition(async () => {
      const r = await buildSupplyChainTiersAction(supplierId);
      setBuildResult(r);
      if (r.success) {
        // Recharger le graph depuis la DB serait idéal — ici on force un rechargement de page
        setTimeout(() => window.location.reload(), 800);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-violet-50 dark:bg-violet-950">
            <GitBranch className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Supply Chain Graph — {supplierName}
            </h2>
            <p className="text-xs text-gray-500">
              {tier2Count} Tier 2 · {tier3Count} Tier 3
              {tier2Count === 0 && ' · Aucun tier enrichi'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleBuild}
          disabled={isPending}
          className="gap-1.5 shrink-0"
          variant={tier2Count === 0 ? 'default' : 'outline'}
        >
          {isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Enrichissement...</>
            : tier2Count === 0
              ? <><Brain className="h-3.5 w-3.5"/>Générer les tiers IA</>
              : <><RefreshCw className="h-3.5 w-3.5"/>Régénérer</>
          }
        </Button>
      </div>

      {/* Résultat build */}
      {buildResult && !isPending && (
        <div className={`rounded-lg border p-3 text-xs ${
          buildResult.success
            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {buildResult.success
            ? `✓ ${buildResult.tier2_count} nœuds Tier 2 · ${buildResult.tier3_count} nœuds Tier 3 générés${buildResult.mock_mode ? ' (simulation)' : ''}`
            : buildResult.error}
        </div>
      )}

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 h-[440px]">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Contrôles zoom */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={zoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={zoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={reset}>
            <Layers className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-2 left-2 text-[9px] text-gray-400 bg-white/70 dark:bg-gray-900/70 rounded px-1.5 py-1">
          Clic = détail · Scroll = zoom · Glisser = déplacer
        </div>

        {/* État vide */}
        {tier2Count === 0 && !isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <GitBranch className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500">Aucun tier enrichi</p>
            <p className="text-xs text-gray-400 mt-1">
              Cliquez sur "Générer les tiers IA" pour cartographier la supply chain
            </p>
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
        {TIER_LABELS.slice(1, 4).map((label, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-orange-500' : 'bg-violet-500'}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-500" />
          Sole source
        </span>
        <span className="flex items-center gap-1">
          <span className="text-violet-400 font-bold">IA</span>
          = inféré (pas réel)
        </span>
      </div>

      {/* Panneau nœud sélectionné */}
      {selectedNode && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm">
                  {selectedNode.is_real ? selectedNode.name : `${selectedNode.name} (inféré IA)`}
                </CardTitle>
                <CardDescription className="text-xs">
                  {TIER_LABELS[selectedNode.tier_level]} · {selectedNode.country_code ? `${selectedNode.country_code}` : ''}{selectedNode.country_name ? ` ${selectedNode.country_name}` : ''}
                </CardDescription>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {selectedNode.inferred_role && (
              <p className="text-gray-600 dark:text-gray-400 italic">{selectedNode.inferred_role}</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2">
                <p className="text-gray-400 text-[9px] uppercase">Risque estimé</p>
                <p className={`font-semibold mt-0.5 ${riskTextClass(selectedNode.estimated_risk_level)}`}>
                  {selectedNode.estimated_risk_level ?? 'Inconnu'}
                  {selectedNode.estimated_score !== null ? ` (${selectedNode.estimated_score}/100)` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2">
                <p className="text-gray-400 text-[9px] uppercase">Impact supply chain</p>
                <p className="font-semibold mt-0.5 capitalize">{selectedNode.supply_chain_impact ?? '—'}</p>
              </div>
            </div>
            {selectedNode.is_estimated_sole_source && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <p>Sole source estimé — aucun fournisseur alternatif probable</p>
              </div>
            )}
            {selectedNode.ai_rationale && (
              <p className="text-gray-500 italic text-[10px] border-l-2 border-violet-200 pl-2">
                {selectedNode.ai_rationale}
              </p>
            )}
            {selectedNode.confidence !== null && !selectedNode.is_real && (
              <p className="text-gray-400 text-[9px]">Confiance IA : {selectedNode.confidence}%</p>
            )}
            {selectedNode.is_real && (
              <Link href={`/home/suppliers/${selectedNode.id}`}
                className="text-primary text-xs hover:underline block">
                Voir la fiche fournisseur →
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
