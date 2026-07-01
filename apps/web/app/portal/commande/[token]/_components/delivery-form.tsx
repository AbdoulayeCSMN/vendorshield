'use client';

import { useState, useTransition } from 'react';

import { CheckCircle2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import {
  submitDeliveryReportAction,
  type DeliveryReportInput,
} from '~/lib/vendorshield/actions/delivery-report.actions';

// Labels bilingues (fr / en) — le portail est utilisé par des fournisseurs
// qui peuvent être dans n'importe quelle langue.
const L = {
  title:          { fr: 'Rapport de livraison',       en: 'Delivery Report' },
  subtitle:       { fr: 'Merci de renseigner les informations ci-dessous pour votre livraison.',
                    en: 'Please fill in the information below for your delivery.' },
  period:         { fr: 'Période',                    en: 'Period' },
  orderRef:       { fr: 'Référence commande',         en: 'Order reference' },
  orderRefPh:     { fr: 'Ex : BC-2026-00123',         en: 'e.g. PO-2026-00123' },
  plannedDate:    { fr: 'Date de livraison prévue *', en: 'Planned delivery date *' },
  actualDate:     { fr: 'Date de livraison réelle *', en: 'Actual delivery date *' },
  quantity:       { fr: 'Quantité livrée *',          en: 'Delivered quantity *' },
  unit:           { fr: 'Unité',                      en: 'Unit' },
  defectMode:     { fr: 'Mode de saisie des défauts', en: 'Defect entry mode' },
  defectModeNone: { fr: 'Pas de défaut',              en: 'No defect' },
  defectModePpm:  { fr: 'PPM direct',                 en: 'Direct PPM' },
  defectModeCount:{ fr: 'Nombre de défauts',          en: 'Defect count' },
  ppmLabel:       { fr: 'PPM (défauts / million)',    en: 'PPM (defects / million)' },
  defectsLabel:   { fr: 'Nombre de défauts bruts',   en: 'Raw defect count' },
  deliveryStatus: { fr: 'Statut de la livraison *',  en: 'Delivery status *' },
  statusOnTime:   { fr: 'À l\'heure',                 en: 'On time' },
  statusLate:     { fr: 'En retard',                  en: 'Late' },
  statusPartial:  { fr: 'Partielle',                  en: 'Partial' },
  statusRejected: { fr: 'Refusée / non-conforme',    en: 'Rejected / non-conforming' },
  notes:          { fr: 'Commentaires (optionnel)',   en: 'Notes (optional)' },
  notesPh:        { fr: 'Problème rencontré, explication du retard…',
                    en: 'Issue encountered, explanation for delay…' },
  submit:         { fr: 'Soumettre',                  en: 'Submit' },
  submitting:     { fr: 'Envoi…',                    en: 'Sending…' },
  successTitle:   { fr: 'Rapport transmis — Merci !', en: 'Report submitted — Thank you!' },
  successMsg:     { fr: 'Vos données ont été enregistrées avec succès.',
                    en: 'Your data has been recorded successfully.' },
  required:       { fr: '* Champs obligatoires',      en: '* Required fields' },
  errorRequired:  { fr: 'Veuillez remplir tous les champs obligatoires.',
                    en: 'Please fill in all required fields.' },
} as const;

const UNITS = ['pièces', 'kg', 't', 'l', 'm', 'm²', 'm³', 'cartons', 'palettes', 'lots', 'autres'];

type Lang = 'fr' | 'en';

function t(key: keyof typeof L, lang: Lang): string {
  return L[key][lang];
}

export function DeliveryForm({
  token,
  supplierName,
  periodLabel,
  defaultOrderRef,
}: {
  token: string;
  supplierName: string;
  periodLabel: string | null;
  defaultOrderRef: string | null;
}) {
  const [lang, setLang] = useState<Lang>('fr');
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const [orderRef, setOrderRef] = useState(defaultOrderRef ?? '');
  const [plannedDate, setPlannedDate] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pièces');
  const [defectMode, setDefectMode] = useState<'none' | 'ppm' | 'count'>('none');
  const [ppm, setPpm] = useState('');
  const [defects, setDefects] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!plannedDate || !actualDate || !quantity || !status) {
      toast.error(t('errorRequired', lang));
      return;
    }

    const input: DeliveryReportInput = {
      order_ref:    orderRef || undefined,
      planned_date: plannedDate,
      actual_date:  actualDate,
      quantity:     parseFloat(quantity),
      unit,
      ppm:     defectMode === 'ppm' && ppm ? parseFloat(ppm) : null,
      defects: defectMode === 'count' && defects ? parseFloat(defects) : null,
      status,
      notes:   notes || undefined,
    };

    startTransition(async () => {
      const res = await submitDeliveryReportAction(token, input);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center dark:bg-gray-900">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="mt-3 text-lg font-semibold">{t('successTitle', lang)}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('successMsg', lang)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + lang switch */}
      <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">{t('title', lang)}</h1>
              <p className="text-muted-foreground text-sm">{supplierName}</p>
            </div>
          </div>
          {/* Sélecteur de langue */}
          <div className="flex gap-1 shrink-0">
            {(['fr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded px-2 py-0.5 text-xs font-medium uppercase transition-colors ${
                  lang === l
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{t('subtitle', lang)}</p>
        {periodLabel && (
          <p className="mt-1 text-xs text-primary font-medium">
            {t('period', lang)} : {periodLabel}
          </p>
        )}
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 dark:bg-gray-900 space-y-4">
        {/* Référence commande */}
        <div>
          <Label className="text-sm">{t('orderRef', lang)}</Label>
          <Input
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder={t('orderRefPh', lang)}
            className="mt-1.5"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">{t('plannedDate', lang)}</Label>
            <Input
              type="date"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">{t('actualDate', lang)}</Label>
            <Input
              type="date"
              required
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Quantité + unité */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">{t('quantity', lang)}</Label>
            <Input
              type="number"
              required
              min={0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">{t('unit', lang)}</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statut livraison */}
        <div>
          <Label className="text-sm">{t('deliveryStatus', lang)}</Label>
          <Select required value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_time">{t('statusOnTime', lang)}</SelectItem>
              <SelectItem value="late">{t('statusLate', lang)}</SelectItem>
              <SelectItem value="partial">{t('statusPartial', lang)}</SelectItem>
              <SelectItem value="rejected">{t('statusRejected', lang)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Défauts */}
        <div>
          <Label className="text-sm">{t('defectMode', lang)}</Label>
          <Select value={defectMode} onValueChange={(v) => setDefectMode(v as typeof defectMode)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('defectModeNone', lang)}</SelectItem>
              <SelectItem value="ppm">{t('defectModePpm', lang)}</SelectItem>
              <SelectItem value="count">{t('defectModeCount', lang)}</SelectItem>
            </SelectContent>
          </Select>

          {defectMode === 'ppm' && (
            <div className="mt-2">
              <Input
                type="number"
                min={0}
                step="any"
                placeholder={t('ppmLabel', lang)}
                value={ppm}
                onChange={(e) => setPpm(e.target.value)}
              />
            </div>
          )}
          {defectMode === 'count' && (
            <div className="mt-2">
              <Input
                type="number"
                min={0}
                step="1"
                placeholder={t('defectsLabel', lang)}
                value={defects}
                onChange={(e) => setDefects(e.target.value)}
              />
              {quantity && defects && (
                <p className="text-muted-foreground mt-1 text-xs">
                  PPM ≈ {Math.round((parseFloat(defects) / parseFloat(quantity)) * 1_000_000).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm">{t('notes', lang)}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPh', lang)}
            rows={3}
            className="mt-1.5 resize-none"
          />
        </div>

        <p className="text-muted-foreground text-xs">{t('required', lang)}</p>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('submitting', lang)}</>
          ) : (
            t('submit', lang)
          )}
        </Button>
      </form>

      {/* Powered by */}
      <p className="text-muted-foreground text-center text-[11px]">
        Propulsé par Avilyre — vos données sont traitées de façon confidentielle.
      </p>
    </div>
  );
}
