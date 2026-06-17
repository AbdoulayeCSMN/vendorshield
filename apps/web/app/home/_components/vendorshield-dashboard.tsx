'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowUpRight, Bell, Building2, CheckCircle,
  Globe, Shield, ShieldAlert, Sparkles, X,
} from 'lucide-react';
import {
  Cell, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
  CartesianGrid,
} from 'recharts';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import type { AccountRiskDashboard } from '~/lib/vendorshield/types';
import type { AlertWithSupplier } from '~/lib/vendorshield/alerts.server';
import type { RecentAnalysis } from '~/lib/vendorshield/ai.server';
import type {
  CountryExposure, DimensionScore, RiskDistributionItem,
  TopRiskySupplier, SupplierNode,
} from '~/lib/vendorshield/analytics.server';
import { CATEGORY_LABELS, CRITICALITY_LABELS, formatEur } from '~/lib/vendorshield/types';
import { WorldMapReal } from './world-map-real';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const scoreColor = (s: number | null) =>
  !s ? '#9ca3af' : s >= 70 ? '#22c55e' : s >= 40 ? '#f97316' : '#ef4444';
const scoreTextClass = (s: number | null) =>
  !s ? 'text-gray-400' : s >= 70 ? 'text-green-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';
const scoreAccentClass = (s: number | null) =>
  !s ? 'accent-gray-400' : s >= 70 ? 'accent-green-500' : s >= 40 ? 'accent-orange-500' : 'accent-red-500';
const riskTextClass = (level: keyof typeof RISK_COLORS) => {
  if (level === 'critical') return 'text-red-600';
  if (level === 'high') return 'text-orange-600';
  if (level === 'medium') return 'text-amber-600';
  return 'text-green-600';
};
const riskLabel = (s: number | null) =>
  !s ? 'N/A' : s >= 70 ? 'Risque faible' : s >= 40 ? 'Risque modéré' : s >= 20 ? 'Risque élevé' : 'Risque critique';
function countryFlag(code: string) {
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return '🏳';
  return c.split('').map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('');
}
const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a',
};

// ─── Positions pays sur la carte SVG (x, y dans viewBox 500×280) ─────────────
const COUNTRY_POSITIONS: Record<string, [number, number]> = {
  FR:[200,155],DE:[215,148],GB:[185,145],IT:[220,165],ES:[185,168],PT:[176,168],
  NL:[205,142],BE:[202,147],CH:[210,155],PL:[228,145],RU:[285,130],UA:[248,148],
  TR:[255,165],EG:[248,185],MA:[190,182],TN:[212,178],SN:[183,200],NG:[218,207],
  ZA:[235,235],ET:[258,205],KE:[258,215],CN:[340,165],JP:[368,158],KR:[360,162],
  IN:[305,185],VN:[340,190],TH:[335,195],ID:[345,215],MY:[338,210],PK:[295,175],
  BD:[315,182],LK:[308,200],US:[85,162],CA:[85,140],MX:[90,185],BR:[135,220],
  AR:[125,245],CO:[110,207],PE:[108,220],CL:[115,238],AU:[370,240],NZ:[400,258],
  SG:[342,212],HK:[352,180],IL:[258,170],SA:[270,185],AE:[280,185],
  MM:[330,183],PH:[355,197],KZ:[290,148],BY:[240,140],
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  kpis: AccountRiskDashboard | null;
  riskDistribution: RiskDistributionItem[];
  dimensionScores: DimensionScore[];
  topSuppliers: TopRiskySupplier[];
  recentAlerts: AlertWithSupplier[];
  countryExposure: CountryExposure[];
  networkSuppliers: SupplierNode[];
  recentAnalyses: RecentAnalysis[];
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color, href }: {
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; color: string; href?: string;
}) {
  const inner = (
    <div className={`rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm ${href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Carte mondiale ───────────────────────────────────────────────────────────
function WorldMap({ countries, selected, onSelect }: {
  countries: CountryExposure[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const countryMap = useMemo(() => new Map(countries.map(c => [c.country_code, c])), [countries]);

  // Trier par score pour l'affichage liste
  const sorted = useMemo(() =>
    [...countries].sort((a, b) => (a.avg_score ?? 999) - (b.avg_score ?? 999)),
    [countries]
  );

  return (
    <div className="space-y-3">
      {/* SVG carte schématique */}
      <div className="relative w-full select-none pb-[48%]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 520 250">
          {/* Fond */}
          <rect x="0" y="0" width="520" height="250" fill="currentColor" fillOpacity="0.02" rx="8"/>

          {/* Zones continentales — plus visibles */}
          {/* Europe */}
          <path d="M170 110 Q185 100 210 105 Q225 108 230 120 Q225 135 210 140 Q190 145 175 135 Z"
            fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
          <text x="200" y="148" fontSize="7" fill="currentColor" fillOpacity="0.3" textAnchor="middle">EUROPE</text>

          {/* Afrique */}
          <path d="M195 155 Q215 150 230 160 Q240 175 238 200 Q232 225 220 230 Q208 232 200 220 Q190 205 190 185 Z"
            fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
          <text x="215" y="238" fontSize="7" fill="currentColor" fillOpacity="0.3" textAnchor="middle">AFRIQUE</text>

          {/* Asie */}
          <path d="M255 100 Q320 95 380 105 Q400 115 395 140 Q385 160 360 165 Q320 168 280 158 Q255 148 250 130 Z"
            fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
          <text x="322" y="175" fontSize="7" fill="currentColor" fillOpacity="0.3" textAnchor="middle">ASIE</text>

          {/* Amériques */}
          <path d="M60 100 Q95 95 115 108 Q125 125 120 160 Q115 195 110 215 Q100 230 90 225 Q75 218 68 195 Q60 168 58 140 Z"
            fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
          <text x="90" y="238" fontSize="7" fill="currentColor" fillOpacity="0.3" textAnchor="middle">AMÉRIQUES</text>

          {/* Océanie */}
          <path d="M380 195 Q400 190 415 200 Q420 215 408 222 Q395 225 383 215 Z"
            fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1"/>
          <text x="400" y="230" fontSize="6" fill="currentColor" fillOpacity="0.3" textAnchor="middle">OCÉANIE</text>

          {/* Bulles pays — sans <title> (cause hydration) */}
          {Object.entries(COUNTRY_POSITIONS).map(([code, [x, y]]) => {
            const data = countryMap.get(code);
            const fill = data ? scoreColor(data.avg_score) : 'currentColor';
            const fillOpacity = data ? (hovered === code ? 1 : 0.8) : 0.07;
            const r = data ? Math.min(13, Math.max(5, 3 + data.count * 2.8)) : 3;
            const isSelected = selected === code;
            return (
              <g key={code}
                className={data ? 'cursor-pointer' : 'cursor-default'}
                onClick={() => data && onSelect(isSelected ? null : code)}
                onMouseEnter={() => data && setHovered(code)}
                onMouseLeave={() => setHovered(null)}>
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 6}
                    fill={fill} fillOpacity="0.18"
                    stroke={fill} strokeWidth="1.5" strokeOpacity="0.4"/>
                )}
                <circle cx={x} cy={y} r={r}
                  fill={fill} fillOpacity={fillOpacity}
                  stroke={isSelected ? '#fff' : data ? fill : 'none'}
                  strokeWidth={isSelected ? 2 : data ? 0.5 : 0}
                  strokeOpacity={isSelected ? 1 : 0.4}/>
              </g>
            );
          })}

          {/* Légende */}
          {[['#22c55e','Faible'],['#f97316','Modéré'],['#ef4444','Élevé']].map(([c,l],i) => (
            <g key={l} transform={`translate(${20 + i * 90},238)`}>
              <circle cx="5" cy="5" r="5" fill={c} fillOpacity="0.85"/>
              <text x="14" y="9" fontSize="8.5" fill="currentColor" fillOpacity="0.55">{l}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip pays survolé */}
      {hovered && countryMap.get(hovered) && (() => {
        const d = countryMap.get(hovered)!;
        return (
          <div className="text-xs text-center py-1 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="font-medium">{countryFlag(hovered)} {d.country_name}</span>
            <span className="ml-2 text-gray-400">
              {d.count} fournisseur{d.count > 1 ? 's' : ''} •
              Score moyen : <span className={scoreTextClass(d.avg_score)}>{d.avg_score ?? 'N/A'}/100</span>
            </span>
          </div>
        );
      })()}

      {/* Liste top pays risqués */}
      {sorted.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {sorted.slice(0, 6).map(c => (
            <button key={c.country_code}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                selected === c.country_code
                  ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => onSelect(selected === c.country_code ? null : c.country_code)}>
              <span className="text-lg shrink-0">{countryFlag(c.country_code)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{c.country_name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">{c.count} fournisseur{c.count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <progress
                    className={`h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${scoreAccentClass(c.avg_score)}`}
                    value={c.avg_score ?? 0}
                    max={100}
                  />
                  <span className={`text-[10px] font-semibold w-7 text-right tabular-nums ${scoreTextClass(c.avg_score)}`}>
                    {c.avg_score ?? '—'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Matrice Criticité × Dépendance ──────────────────────────────────────────
const CRIT_VALUES: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const CRIT_LABELS = ['','Faible','Moyen','Élevé','Critique'];

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: {payload: SupplierNode}[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0]?.payload;
  if (!s) return null;
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-3 text-xs max-w-48">
      <p className="font-semibold mb-1 text-gray-900 dark:text-white">{s.name}</p>
      <p className="text-gray-500">{CATEGORY_LABELS[s.category as keyof typeof CATEGORY_LABELS] ?? s.category}</p>
      <p className="mt-1">Score : <span className={`font-medium ${scoreTextClass(s.global_score)}`}>{s.global_score ?? '—'}/100</span></p>
      <p>Dépense : <span className="font-medium">{s.annual_spend_eur ? formatEur(s.annual_spend_eur) : '—'}</span></p>
      {s.is_sole_source && <p className="text-amber-600 font-medium mt-1">⚠ Sole source</p>}
      {s.open_alerts > 0 && <p className="text-red-600">{s.open_alerts} alerte{s.open_alerts > 1 ? 's' : ''}</p>}
    </div>
  );
}

function CriticalityMatrix({ suppliers }: { suppliers: SupplierNode[] }) {
  const data = suppliers.filter(s => s.global_score !== null).map(s => ({
    ...s,
    x: CRIT_VALUES[s.criticality] ?? 2,
    y: Math.round((s.annual_spend_eur ?? 0) / 1000),
    z: Math.max(20, 140 - (s.global_score ?? 50)),
  }));
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top:8, right:20, bottom:28, left:44 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1}/>
          <XAxis type="number" dataKey="x" domain={[0.5,4.5]} tickLine={false} axisLine={false}
            tick={{fontSize:10}} tickFormatter={v => CRIT_LABELS[Math.round(v)] ?? ''}
            label={{value:'Criticité',position:'insideBottom',offset:-10,fontSize:10}}/>
          <YAxis type="number" dataKey="y" tickLine={false} axisLine={false} tick={{fontSize:9}}
            tickFormatter={v => v>=1000?`${(v/1000).toFixed(0)}M€`:`${v}k€`}
            label={{value:'Dépense',angle:-90,position:'insideLeft',fontSize:10,offset:14}}/>
          <ZAxis type="number" dataKey="z" range={[40,320]}/>
          <Tooltip content={<MatrixTooltip/>}/>
          <Scatter data={data}>
            {data.map((e,i) => (
              <Cell key={i} fill={scoreColor(e.global_score)} fillOpacity={0.82}
                stroke={e.is_sole_source?'#f59e0b':'transparent'} strokeWidth={e.is_sole_source?2.5:0}/>
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Radar dimensions ──────────────────────────────────────────────────────────
function DimensionRadar({ suppliers }: { suppliers: SupplierNode[] }) {
  const avg = (key: 'financial_score'|'operational_score'|'geopolitical_score'|'esg_score') => {
    const vals = suppliers
      .map(s => s[key])
      .filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  };
  const data = [
    {subject:'Financier',    A:avg('financial_score')},
    {subject:'Opérationnel', A:avg('operational_score')},
    {subject:'Géopolitique', A:avg('geopolitical_score')},
    {subject:'ESG',          A:avg('esg_score')},
  ];
  const globalAvg = Math.round(data.reduce((s,d)=>s+d.A,0)/4);
  const fill = scoreColor(globalAvg);
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="currentColor" strokeOpacity={0.15}/>
          <PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:'currentColor',fillOpacity:0.65}}/>
          <Radar dataKey="A" stroke={fill} fill={fill} fillOpacity={0.22} strokeWidth={2}/>
          <Tooltip formatter={(v:number)=>[`${v}/100`,'Score moyen']}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Réseau canvas D3-like ────────────────────────────────────────────────────
function SupplierNetwork({ suppliers }: { suppliers: SupplierNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const stateRef  = useRef<{nodes:{id:string;x:number;y:number;vx:number;vy:number;r:number;score:number|null;name:string;is_sole_source:boolean;open_alerts:number}[]; ready:boolean}>({nodes:[],ready:false});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || 480, H = canvas.offsetHeight || 300;
    canvas.width = W; canvas.height = H;

    const shown = suppliers.slice(0, 45);
    const nodes = shown.map((s, i) => {
      const angle = (i / shown.length) * Math.PI * 2;
      const dist  = 70 + Math.random() * 70;
      return {
        id: s.id,
        x: W/2 + Math.cos(angle)*dist,
        y: H/2 + Math.sin(angle)*dist,
        vx: 0, vy: 0,
        r: Math.max(5, Math.min(13, 3 + (s.annual_spend_eur ?? 0)/600000)),
        score: s.global_score,
        name: s.name,
        is_sole_source: s.is_sole_source,
        open_alerts: s.open_alerts,
      };
    });
    stateRef.current = { nodes, ready: true };

    const simulate = () => {
      const { nodes } = stateRef.current;
      const cx = W/2, cy = H/2;
      for (const n of nodes) {
        for (const m of nodes) {
          if (n===m) continue;
          const dx=n.x-m.x, dy=n.y-m.y;
          const d=Math.sqrt(dx*dx+dy*dy)||1;
          const f=Math.min(350/(d*d),2.5);
          n.vx+=(dx/d)*f; n.vy+=(dy/d)*f;
        }
        const dx=cx-n.x, dy=cy-n.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;
        const target=90+n.r*2;
        const diff=d-target;
        n.vx+=(dx/d)*diff*0.009; n.vy+=(dy/d)*diff*0.009;
        n.vx*=0.84; n.vy*=0.84;
        n.x=Math.max(n.r+4,Math.min(W-n.r-4,n.x+n.vx));
        n.y=Math.max(n.r+4,Math.min(H-n.r-4,n.y+n.vy));
      }
    };

    const draw = () => {
      if (!stateRef.current.ready) return;
      const { nodes } = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      simulate();
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = dark?'#111827':'#ffffff';
      ctx.fillRect(0,0,W,H);

      // Liens
      const cx=W/2, cy=H/2;
      for (const n of nodes) {
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(n.x,n.y);
        ctx.strokeStyle=n.is_sole_source?'rgba(245,158,11,0.4)':dark?'rgba(255,255,255,0.09)':'rgba(0,0,0,0.07)';
        ctx.lineWidth=n.is_sole_source?1.8:0.8; ctx.stroke();
      }
      // Centre
      ctx.beginPath(); ctx.arc(cx,cy,17,0,Math.PI*2);
      ctx.fillStyle='#6366f1'; ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='bold 7.5px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('MON',cx,cy-4); ctx.fillText('ENT.',cx,cy+4);
      // Nœuds
      for (const n of nodes) {
        ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=scoreColor(n.score); ctx.globalAlpha=0.82; ctx.fill(); ctx.globalAlpha=1;
        if (n.is_sole_source) {
          ctx.beginPath(); ctx.arc(n.x,n.y,n.r+2,0,Math.PI*2);
          ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2; ctx.stroke();
        }
        if (n.open_alerts>0) {
          ctx.beginPath(); ctx.arc(n.x+n.r-1,n.y-n.r+1,4.5,0,Math.PI*2);
          ctx.fillStyle='#dc2626'; ctx.globalAlpha=1; ctx.fill();
          ctx.fillStyle='#fff'; ctx.font='bold 5.5px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(String(Math.min(n.open_alerts,9)),n.x+n.r-1,n.y-n.r+1);
        }
        if (n.r>=10) {
          const tc = dark?'rgba(255,255,255,0.65)':'rgba(0,0,0,0.65)';
          ctx.fillStyle=tc; ctx.font='6.5px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top';
          ctx.fillText(n.name.length>12?n.name.slice(0,12)+'…':n.name, n.x, n.y+n.r+2);
        }
      }
      animRef.current=requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [suppliers]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 h-[300px]">
      <canvas ref={canvasRef} className="w-full h-full"/>
      {suppliers.length===0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-400">Aucun fournisseur à afficher</p>
        </div>
      )}
      <div className="absolute bottom-2 right-3 flex gap-2.5 text-[9px] text-gray-400 pointer-events-none">
          {[['#22c55e','Faible'],['#f97316','Modéré'],['#ef4444','Élevé']].map(([c,l])=>(
          <span key={l} className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${c === '#22c55e' ? 'bg-green-500' : c === '#f97316' ? 'bg-orange-500' : 'bg-red-500'}`} />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-amber-500"/>SS
        </span>
      </div>
    </div>
  );
}

// ─── Mini score bar ────────────────────────────────────────────────────────────
function MiniScoreBar({ score }: { score: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <progress
        className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${scoreAccentClass(score)}`}
        value={score ?? 0}
        max={100}
      />
      <span className={`text-xs font-semibold w-7 text-right tabular-nums ${scoreTextClass(score)}`}>
        {score??'—'}
      </span>
    </div>
  );
}

function relativeTime(d: string) {
  const m = Math.floor((Date.now()-new Date(d).getTime())/60000);
  return m<1?'à l\'instant':m<60?`il y a ${m}min`:m<1440?`il y a ${Math.floor(m/60)}h`:`il y a ${Math.floor(m/1440)}j`;
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export function VendorShieldDashboard({
  kpis, riskDistribution, topSuppliers,
  recentAlerts, countryExposure, networkSuppliers, recentAnalyses,
}: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const selectedData  = selectedCountry ? countryExposure.find(c=>c.country_code===selectedCountry) : null;
  const filtered      = selectedCountry ? networkSuppliers.filter(s=>s.country_code===selectedCountry) : networkSuppliers;
  const totalRisk     = riskDistribution.reduce((s,r)=>s+r.count,0);

  return (
    <div className="space-y-5">

      {/* Bandeau pays sélectionné */}
      {selectedCountry && selectedData && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-4 py-2.5">
          <span className="text-xl">{countryFlag(selectedCountry)}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">{selectedData.country_name}</span>
            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
              {selectedData.count} fournisseur{selectedData.count>1?'s':''} ·
              Score moyen : {selectedData.avg_score??'—'}/100 ·
              {selectedData.total_spend>0 ? ` Dépense : ${formatEur(selectedData.total_spend)}` : ''}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={()=>setSelectedCountry(null)} className="h-7 w-7 p-0 shrink-0">
            <X className="h-3.5 w-3.5"/>
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Fournisseurs actifs"
          value={selectedCountry ? filtered.length : (kpis?.active_suppliers??'—')}
          subtitle={selectedCountry ? `sur ${kpis?.active_suppliers??0} total` : `${kpis?.total_suppliers??0} au total`}
          icon={<Building2 className="h-5 w-5 text-blue-600"/>} color="bg-blue-50 dark:bg-blue-950" href="/home/suppliers"/>
        <KpiCard title="Score risque moyen"
          value={selectedCountry&&selectedData?.avg_score ? `${selectedData.avg_score}/100` : kpis?.avg_global_score?`${kpis.avg_global_score}/100`:'—'}
          subtitle={selectedCountry&&selectedData?.avg_score ? riskLabel(selectedData.avg_score) : kpis?.avg_global_score?riskLabel(kpis.avg_global_score):'Non évalué'}
          icon={<Shield className="h-5 w-5 text-orange-600"/>} color="bg-orange-50 dark:bg-orange-950" href="/home/analytics"/>
        <KpiCard title="Alertes ouvertes"
          value={selectedCountry ? filtered.reduce((s,x)=>s+x.open_alerts,0) : (kpis?.open_alerts_total??0)}
          subtitle={selectedCountry?'dans ce pays':`dont ${kpis?.critical_alerts_total??0} critiques`}
          icon={<Bell className="h-5 w-5 text-red-600"/>} color="bg-red-50 dark:bg-red-950" href="/home/alerts"/>
        <KpiCard title={selectedCountry?'Sole sources':'Fournisseurs critiques'}
          value={selectedCountry ? filtered.filter(s=>s.is_sole_source).length : (kpis?.critical_risk_count??0)+(kpis?.high_risk_count??0)}
          subtitle={selectedCountry?'sole source dans ce pays':`${kpis?.critical_risk_count??0} critiques · ${kpis?.high_risk_count??0} élevés`}
          icon={<ShieldAlert className="h-5 w-5 text-red-600"/>} color="bg-red-50 dark:bg-red-950" href="/home/suppliers?risk_level=critical"/>
      </div>

      {/* Carte + Distribution */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500"/>Exposition géographique
                </CardTitle>
                <CardDescription className="text-xs">Cliquez sur un pays pour filtrer tous les graphiques</CardDescription>
              </div>
              {selectedCountry && <Badge variant="secondary" className="text-xs shrink-0">{countryFlag(selectedCountry)} {selectedData?.country_name}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <WorldMapReal countries={countryExposure} selected={selectedCountry} onSelect={setSelectedCountry}/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribution des risques</CardTitle>
            <CardDescription className="text-xs">{totalRisk} fournisseurs évalués</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex justify-center">
              <div className="h-[110px] w-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDistribution} dataKey="count" nameKey="label"
                      cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2} strokeWidth={0}>
                      {riskDistribution.map(e=><Cell key={e.level} fill={RISK_COLORS[e.level]??'#ccc'}/>)}
                    </Pie>
                    <Tooltip formatter={(v:number,n:string)=>[v,n]}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {(['low','medium','high','critical'] as const).map(level=>{
              const item=riskDistribution.find(r=>r.level===level);
              const count=item?.count??0;
              const labels={low:'Faible',medium:'Modéré',high:'Élevé',critical:'Critique'};
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-500">{labels[level]}</span>
                    <span className={`font-semibold tabular-nums ${riskTextClass(level)}`}>{count}</span>
                  </div>
                  <progress
                    className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 ${level === 'critical' ? 'accent-red-500' : level === 'high' ? 'accent-orange-500' : level === 'medium' ? 'accent-amber-500' : 'accent-green-500'}`}
                    value={totalRisk > 0 ? (count / totalRisk) * 100 : 0}
                    max={100}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Réseau + Radar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Réseau fournisseurs{selectedCountry&&` — ${selectedData?.country_name}`}
                </CardTitle>
                <CardDescription className="text-xs">
                  Taille = dépense · Or = sole source · Badge = alertes
                </CardDescription>
              </div>
              <span className="text-xs text-gray-400">{filtered.length} fournisseur{filtered.length!==1?'s':''}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <SupplierNetwork suppliers={filtered}/>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Radar {selectedCountry?selectedData?.country_name:'global'}
            </CardTitle>
            <CardDescription className="text-xs">
              Score moyen par dimension{selectedCountry?` (${filtered.length} fournisseurs)`:''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length>0
              ? <DimensionRadar suppliers={filtered}/>
              : <div className="h-52 flex items-center justify-center text-sm text-gray-400">Aucun fournisseur</div>
            }
          </CardContent>
        </Card>
      </div>

      {/* Matrice Criticité × Dépendance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Matrice Criticité × Dépendance{selectedCountry&&` — ${selectedData?.country_name}`}
              </CardTitle>
              <CardDescription className="text-xs">
                X = criticité · Y = dépense annuelle · Taille = risque · Or = sole source
              </CardDescription>
            </div>
            <div className="hidden sm:flex gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"/>Risque élevé</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block"/>Risque faible</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CriticalityMatrix suppliers={filtered}/>
        </CardContent>
      </Card>

      {/* Top risqués + Alertes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {selectedCountry?`Fournisseurs — ${selectedData?.country_name}`:'Fournisseurs les plus risqués'}
              </CardTitle>
              <Link href="/home/suppliers?sort=global_score&order=asc" className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tous <ArrowUpRight className="h-3 w-3"/>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {filtered.filter(s=>s.global_score!==null).sort((a,b)=>(a.global_score??100)-(b.global_score??100)).slice(0,7).map((s,i)=>(
              <Link key={s.id} href={`/home/suppliers/${s.id}`}
                className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <span className="text-xs text-gray-400 w-4 tabular-nums shrink-0">{i+1}</span>
                <span className="text-sm shrink-0">{s.country_code?countryFlag(s.country_code):'🏢'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                  <MiniScoreBar score={s.global_score}/>
                </div>
                {s.is_sole_source && <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-1.5 py-0.5 shrink-0">SS</span>}
                {s.open_alerts>0 && <span className="text-[9px] bg-red-50 text-red-700 rounded-full px-1.5 py-0.5 shrink-0 font-medium">{s.open_alerts}⚠</span>}
              </Link>
            ))}
            {filtered.filter(s=>s.global_score!==null).length===0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun fournisseur évalué</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Alertes récentes</CardTitle>
              <Link href="/home/alerts" className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight className="h-3 w-3"/>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAlerts.length===0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="h-7 w-7 text-green-300 mb-1.5"/>
                <p className="text-sm text-gray-500">Aucune alerte ouverte</p>
              </div>
            ) : (
              recentAlerts
                .filter(a=>!selectedCountry||a.supplier?.country_code===selectedCountry||!a.supplier)
                .slice(0,6)
                .map(alert=>(
                  <div key={alert.id} className="flex items-start gap-2.5 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${alert.severity==='critical'?'bg-red-500':alert.severity==='warning'?'bg-orange-500':'bg-blue-500'}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{alert.supplier?.name??alert.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{alert.message}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 shrink-0">{relativeTime(alert.created_at)}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analyses IA récentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Analyses IA récentes</CardTitle>
            <Link href="/home/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowUpRight className="h-3 w-3"/>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentAnalyses.length===0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Sparkles className="h-7 w-7 text-purple-300 mb-1.5"/>
              <p className="text-sm text-gray-500">Aucune analyse récente</p>
            </div>
          ) : (
            recentAnalyses.slice(0,4).map(analysis=>(
              <Link key={analysis.id} href={`/home/suppliers/${analysis.supplier_id}`}
                className="flex items-start gap-2.5 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-purple-500"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{analysis.supplier_name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{analysis.risk_signals?.length ?? 0} signaux détectés</p>
                </div>
                <span className="text-[9px] text-gray-400 shrink-0">{relativeTime(analysis.created_at)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
