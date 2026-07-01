'use client';

import { useState, useTransition } from 'react';

import { CheckCircle, Clock, Copy, ExternalLink, Link2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import {
  createDeliveryReportRequestAction,
  type DeliveryReportRequest,
} from '~/lib/vendorshield/actions/delivery-report.actions';

const STATUS_CFG = {
  pending:   { label: 'En attente', en: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  submitted: { label: 'Reçu',      en: 'Received',   cls: 'bg-green-50 text-green-700 border-green-200' },
  expired:   { label: 'Expiré',    en: 'Expired',    cls: 'bg-gray-50 text-gray-500 border-gray-200' },
};

function portalUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  return `${base}/portal/commande/${token}`;
}

function CopyLinkButton({ token }: { token: string }) {
  const { t } = useTranslation('vendorshield');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(portalUrl(token));
    setCopied(true);
    toast.success(t('questionnaire.linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copy}>
        {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <a href={portalUrl(token)} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>
    </div>
  );
}

// ─── Dialog création ──────────────────────────────────────────────────────────

function CreateDeliveryLinkDialog({
  supplierId,
  open,
  onClose,
}: {
  supplierId: string;
  open: boolean;
  onClose: (newToken?: string) => void;
}) {
  const { t } = useTranslation('vendorshield');
  const [isPending, startTransition] = useTransition();
  const [periodLabel, setPeriodLabel] = useState('');
  const [orderRef, setOrderRef] = useState('');

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createDeliveryReportRequestAction(
        supplierId,
        periodLabel || undefined,
        orderRef || undefined,
      );
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(t('delivery.created'));
      navigator.clipboard.writeText(portalUrl(res.data.token)).catch(() => {});
      onClose(res.data.token);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {t('delivery.newLink')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t('delivery.newLinkDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">{t('delivery.periodLabel')}</Label>
            <Input
              placeholder={t('delivery.periodPlaceholder')}
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm">{t('delivery.orderRefLabel')}</Label>
            <Input
              placeholder={t('delivery.orderRefPlaceholder')}
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('delivery.createLink')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function SupplierDeliveryReportsPanel({
  supplierId,
  requests: initialRequests,
}: {
  supplierId: string;
  requests: DeliveryReportRequest[];
}) {
  const { t } = useTranslation('vendorshield');
  const [requests, setRequests] = useState(initialRequests);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreated = (newToken?: string) => {
    setDialogOpen(false);
    if (newToken) {
      // Optimistic: add a placeholder entry — real data will arrive on next RSC refresh
      window.location.reload();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="text-primary h-4 w-4" />
              {t('delivery.title')}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t('delivery.send')}
            </Button>
          </div>
          <CardDescription className="text-xs">
            {t('delivery.desc')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('delivery.empty')}</p>
          ) : (
            requests.map((req) => {
              const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {req.period_label ?? t('delivery.noLabel')}
                      {req.order_ref && (
                        <span className="ml-1 font-normal text-gray-400">· {req.order_ref}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
                      {req.submitted_at && (
                        <> · {t('delivery.submittedOn')} {new Date(req.submitted_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Badge className={`shrink-0 text-[10px] border ${cfg.cls}`}>
                    {cfg.label}
                  </Badge>
                  {req.status === 'pending' && <CopyLinkButton token={req.token} />}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CreateDeliveryLinkDialog
        supplierId={supplierId}
        open={dialogOpen}
        onClose={handleCreated}
      />
    </>
  );
}
