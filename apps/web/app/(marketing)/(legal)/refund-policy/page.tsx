import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:refundPolicy'),
  };
}

async function RefundPolicyPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t('marketing:refundPolicy')}
        subtitle={t('marketing:refundPolicyDescription')}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">
          Dernière mise à jour : 29 juin 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Essai gratuit</h2>
          <p>
            VendorShield propose un essai gratuit de 14 jours, sans carte
            bancaire requise. Aucun paiement n&apos;est prélevé pendant cette
            période ; à son terme, l&apos;accès se limite à un palier gratuit
            restreint si aucun abonnement n&apos;est souscrit.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            2. Garantie satisfait ou remboursé — 14 jours
          </h2>
          <p>
            Si vous souscrivez un abonnement payant (Starter ou Pro) et
            n&apos;êtes pas satisfait(e), vous pouvez demander un
            remboursement intégral dans les <strong>14 jours</strong> suivant
            votre premier paiement, sans justification. Passé ce délai, les
            paiements déjà effectués ne sont pas remboursés au prorata, sauf
            disposition légale impérative contraire applicable dans votre
            pays.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Annulation</h2>
          <p>
            Vous pouvez annuler votre abonnement à tout moment depuis votre
            espace de facturation (
            <code>/home/billing</code>) ou via le portail client Paddle.
            L&apos;annulation empêche le renouvellement suivant, mais ne
            rembourse pas la période en cours déjà payée (sauf dans le délai
            de 14 jours décrit ci-dessus). Vous conservez l&apos;accès jusqu&apos;à
            la fin de la période déjà réglée.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            4. Erreurs de facturation
          </h2>
          <p>
            En cas de double prélèvement, d&apos;erreur de montant ou de
            tout autre problème de facturation, contactez-nous immédiatement
            — ces situations sont corrigées intégralement, sans délai
            particulier.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            5. Rôle de Paddle dans les remboursements
          </h2>
          <p>
            Les paiements étant traités par <strong>Paddle.com</strong>,
            notre Merchant of Record, les remboursements sont exécutés par
            Paddle sur le même moyen de paiement utilisé lors de l&apos;achat,
            une fois la demande validée. Le délai d&apos;apparition sur votre
            relevé bancaire dépend de votre banque (généralement 5 à 10 jours
            ouvrés).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Comment demander un remboursement</h2>
          <p>
            Écrivez-nous à{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>{' '}
            en indiquant l&apos;email de votre compte et le motif de votre
            demande. Nous répondons sous 48h ouvrées.
          </p>
        </section>
      </div>
    </div>
  );
}

export default withI18n(RefundPolicyPage);
