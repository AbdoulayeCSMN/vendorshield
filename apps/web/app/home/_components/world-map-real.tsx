'use client';

import { memo, useMemo, useState } from 'react';

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

import type { CountryExposure } from '~/lib/vendorshield/analytics.server';

// URL TopoJSON monde (hébergé sur CDN jsDelivr — pas de dépendance fichier local)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 numeric → alpha-2 (subset des pays VendorShield)
const ISO_NUMERIC_TO_ALPHA2: Record<string, string> = {
  '004': 'AF', '008': 'AL', '012': 'DZ', '024': 'AO', '032': 'AR',
  '051': 'AM', '036': 'AU', '040': 'AT', '031': 'AZ', '050': 'BD',
  '056': 'BE', '068': 'BO', '070': 'BA', '076': 'BR', '100': 'BG',
  '116': 'KH', '120': 'CM', '124': 'CA', '152': 'CL', '156': 'CN',
  '170': 'CO', '180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU',
  '818': 'EG', '231': 'ET', '246': 'FI', '250': 'FR', '276': 'DE',
  '288': 'GH', '300': 'GR', '320': 'GT', '332': 'HT', '340': 'HN',
  '348': 'HU', '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ',
  '376': 'IL', '380': 'IT', '384': 'CI', '392': 'JP', '400': 'JO',
  '398': 'KZ', '404': 'KE', '408': 'KP', '410': 'KR', '422': 'LB',
  '434': 'LY', '458': 'MY', '484': 'MX', '504': 'MA', '508': 'MZ',
  '516': 'NA', '524': 'NP', '528': 'NL', '554': 'NZ', '566': 'NG',
  '578': 'NO', '586': 'PK', '591': 'PA', '604': 'PE', '608': 'PH',
  '616': 'PL', '620': 'PT', '642': 'RO', '643': 'RU', '646': 'RW',
  '682': 'SA', '686': 'SN', '694': 'SL', '706': 'SO', '710': 'ZA',
  '144': 'LK', '729': 'SD', '752': 'SE', '756': 'CH', '760': 'SY',
  '834': 'TZ', '764': 'TH', '788': 'TN', '792': 'TR', '800': 'UG',
  '804': 'UA', '784': 'AE', '840': 'US', '858': 'UY', '860': 'UZ',
  '862': 'VE', '704': 'VN', '887': 'YE', '894': 'ZM', '716': 'ZW',
  '040': 'AT', '703': 'SK', '705': 'SI', '724': 'ES', '826': 'GB',
  '096': 'BN', '702': 'SG', '344': 'HK', '446': 'MO', '158': 'TW',
  '096': 'BN', '064': 'BT', '072': 'BW', '084': 'BZ', '204': 'BJ',
  '466': 'ML', '478': 'MR', '454': 'MW', '450': 'MG', '818': 'EG',
  '152': 'CL',
};

// ─── Helpers couleur ──────────────────────────────────────────────────────────

function scoreToFill(score: number | null, isSelected: boolean, hasData: boolean): string {
  if (!hasData) return isSelected ? '#c7d2fe' : '#e2e8f0';
  if (score === null) return isSelected ? '#c7d2fe' : '#d1d5db';
  if (score >= 70) return isSelected ? '#15803d' : '#22c55e';
  if (score >= 40) return isSelected ? '#c2410c' : '#f97316';
  if (score >= 20) return isSelected ? '#b91c1c' : '#ef4444';
  return isSelected ? '#7f1d1d' : '#dc2626';
}

function scoreToStroke(isSelected: boolean, hasData: boolean): string {
  if (isSelected) return '#1e40af';
  if (hasData) return '#fff';
  return '#cbd5e1';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorldMapRealProps {
  countries: CountryExposure[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}

// ─── Tooltip interne ──────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  content: CountryExposure;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export const WorldMapReal = memo(function WorldMapReal({
  countries,
  selected,
  onSelect,
}: WorldMapRealProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Map code alpha-2 → données exposition
  const dataMap = useMemo(
    () => new Map(countries.map((c) => [c.country_code.trim(), c])),
    [countries],
  );

  // Pays triés par risque pour la légende
  const sorted = useMemo(
    () => [...countries].sort((a, b) => (a.avg_score ?? 999) - (b.avg_score ?? 999)).slice(0, 7),
    [countries],
  );

  const handleMouseEnter = (
    geo: { id: string },
    data: CountryExposure | undefined,
    evt: React.MouseEvent,
  ) => {
    if (!data) return;
    const rect = (evt.currentTarget as SVGElement)
      .closest('.rsm-svg')
      ?.getBoundingClientRect();
    setTooltip({
      x: evt.clientX - (rect?.left ?? 0),
      y: evt.clientY - (rect?.top ?? 0) - 10,
      content: data,
    });
  };

  function countryFlag(code: string) {
    const c = code.trim().toUpperCase();
    if (c.length !== 2) return '';
    return c
      .split('')
      .map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
      .join('');
  }

  function scoreLabel(s: number | null) {
    if (s === null) return 'N/A';
    if (s >= 70) return 'Faible';
    if (s >= 40) return 'Modéré';
    return 'Élevé';
  }

  return (
    <div className="space-y-3">
      {/* Carte */}
      <div className="relative w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-sky-50/40 dark:bg-slate-900/60">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 110, center: [15, 20] }}
          style={{ width: '100%', height: 'auto' }}
          viewBox="0 0 800 420"
        >
          <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={6}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // Convertir l'ID numérique ISO en alpha-2
                  const alpha2 = ISO_NUMERIC_TO_ALPHA2[String(geo.id).padStart(3, '0')];
                  const data = alpha2 ? dataMap.get(alpha2) : undefined;
                  const isSelected = !!alpha2 && selected === alpha2;
                  const hasData = !!data;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => {
                        if (!data || !alpha2) return;
                        onSelect(isSelected ? null : alpha2);
                      }}
                      onMouseEnter={(evt) => handleMouseEnter(geo, data, evt)}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill:        scoreToFill(data?.avg_score ?? null, isSelected, hasData),
                          stroke:      scoreToStroke(isSelected, hasData),
                          strokeWidth: isSelected ? 1.5 : hasData ? 0.5 : 0.3,
                          outline:     'none',
                          cursor:      hasData ? 'pointer' : 'default',
                          transition:  'fill 0.15s',
                        },
                        hover: {
                          fill:        hasData
                            ? scoreToFill(data?.avg_score ?? null, true, hasData)
                            : '#e0e7ff',
                          stroke:      hasData ? '#1e40af' : '#c7d2fe',
                          strokeWidth: hasData ? 1.5 : 0.5,
                          outline:     'none',
                        },
                        pressed: {
                          fill:    '#3730a3',
                          outline: 'none',
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Marqueurs pour les pays avec données */}
            {countries.map((c) => {
              // On cherche la position approximative depuis les géographies
              // On affiche juste un point de repère pour les sélectionnés
              if (c.country_code.trim() !== selected) return null;
              return null; // Les marqueurs sont optionnels — la coloration suffit
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip flottant */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-xs max-w-52"
            style={{
              left: Math.min(tooltip.x + 12, 580),
              top:  Math.max(tooltip.y - 60, 4),
            }}
          >
            <p className="font-semibold text-gray-900 dark:text-white mb-1">
              {countryFlag(tooltip.content.country_code)} {tooltip.content.country_name}
            </p>
            <p className="text-gray-500">
              {tooltip.content.count} fournisseur{tooltip.content.count > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${tooltip.content.avg_score ?? 0}%`,
                    background: scoreToFill(tooltip.content.avg_score, false, true),
                  }}
                />
              </div>
              <span
                className="font-semibold tabular-nums"
                style={{ color: scoreToFill(tooltip.content.avg_score, false, true) }}
              >
                {tooltip.content.avg_score ?? 'N/A'}/100
              </span>
            </div>
            <p className="text-gray-400 mt-0.5">
              Risque {scoreLabel(tooltip.content.avg_score)}
            </p>
          </div>
        )}

        {/* Légende des couleurs */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px]">
          {[
            { color: '#22c55e', label: 'Faible (≥70)' },
            { color: '#f97316', label: 'Modéré (40-69)' },
            { color: '#ef4444', label: 'Élevé (<40)' },
            { color: '#e2e8f0', label: 'Aucun fournisseur' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <span
                className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>

        {/* Instructions zoom */}
        <div className="absolute top-2 right-2 text-[9px] text-gray-400 bg-white/70 dark:bg-gray-900/70 rounded px-1.5 py-1">
          Scroll = zoom · Glisser = déplacer · Clic = filtrer
        </div>
      </div>

      {/* Liste pays avec fournisseurs */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {sorted.map((c) => (
            <button
              key={c.country_code}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                selected === c.country_code.trim()
                  ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() =>
                onSelect(selected === c.country_code.trim() ? null : c.country_code.trim())
              }
            >
              <span className="text-base shrink-0">{countryFlag(c.country_code)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {c.country_name}
                  </p>
                  <span className="text-[9px] text-gray-400 shrink-0 ml-1">
                    {c.count} fourn.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width:      `${c.avg_score ?? 0}%`,
                        background: scoreToFill(c.avg_score, false, true),
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold tabular-nums w-6 text-right"
                    style={{ color: scoreToFill(c.avg_score, false, true) }}
                  >
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
});
