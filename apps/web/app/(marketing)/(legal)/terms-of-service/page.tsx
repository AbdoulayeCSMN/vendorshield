import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:termsOfService'),
  };
}

async function TermsOfServicePage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t(`marketing:termsOfService`)}
        subtitle={t(`marketing:termsOfServiceDescription`)}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">
          Dernière mise à jour : 29 juin 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Objet</h2>
          <p>
            Les présentes conditions générales d&apos;utilisation (« CGU »)
            régissent l&apos;accès et l&apos;utilisation du service
            VendorShield (le « Service »), une plateforme SaaS de gestion et
            d&apos;anticipation des risques fournisseurs, accessible à
            l&apos;adresse vendorshield-ten.vercel.app. Le Service est
            exploité par Abdoulaye Chaibou, exploitant individuel basé au
            Maroc (« nous », « l&apos;Exploitant »).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Acceptation</h2>
          <p>
            En créant un compte ou en utilisant le Service, vous acceptez
            sans réserve les présentes CGU. Si vous n&apos;y consentez pas,
            vous ne devez pas utiliser le Service. Le Service est destiné à
            un usage professionnel (B2B) ; vous garantissez agir dans le
            cadre de votre activité professionnelle.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Description du service</h2>
          <p>
            VendorShield permet de référencer des fournisseurs, de calculer
            des scores de risque (financier, opérationnel, géopolitique,
            ESG), de configurer des alertes, d&apos;importer des données, et
            d&apos;accéder à des fonctionnalités d&apos;intelligence
            artificielle (analyse, prédiction, enrichissement OSINT). Le
            Service est fourni « en l&apos;état » et peut évoluer ou être
            amélioré sans préavis.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Compte utilisateur</h2>
          <p>
            Vous êtes responsable de la confidentialité de vos identifiants
            et de toute activité effectuée depuis votre compte. Vous vous
            engagez à fournir des informations exactes lors de la création de
            votre compte et de votre organisation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            5. Essai gratuit, abonnement et facturation
          </h2>
          <p>
            Un essai gratuit de 14 jours est proposé sans carte bancaire
            requise. À l&apos;issue de l&apos;essai, l&apos;accès se limite à
            un palier gratuit restreint, sauf souscription à un abonnement
            payant (Starter, Pro ou Enterprise sur devis).
          </p>
          <p>
            Les paiements des abonnements sont traités par{' '}
            <strong>Paddle.com Market Limited</strong>, notre revendeur et
            Merchant of Record. Paddle facture en son nom, collecte la TVA
            applicable et émet les factures correspondantes ; les conditions
            de paiement de Paddle (
            <a
              href="https://www.paddle.com/legal/checkout-buyer-terms"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buyer Terms
            </a>
            ) s&apos;appliquent en complément des présentes CGU pour tout ce
            qui concerne la transaction de paiement elle-même.
          </p>
          <p>
            Les abonnements se renouvellent automatiquement à chaque
            échéance (mensuelle ou annuelle) jusqu&apos;à annulation. Voir
            notre{' '}
            <a href="/refund-policy" className="underline">
              politique de remboursement
            </a>{' '}
            pour les modalités d&apos;annulation et de remboursement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Résiliation</h2>
          <p>
            Vous pouvez résilier votre abonnement à tout moment depuis votre
            espace de facturation ; la résiliation prend effet à la fin de la
            période déjà payée. Nous nous réservons le droit de suspendre ou
            résilier un compte en cas de violation des présentes CGU ou
            d&apos;usage frauduleux.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            7. Propriété intellectuelle
          </h2>
          <p>
            Le Service, son code, sa marque et ses contenus sont la propriété
            de l&apos;Exploitant. Vous conservez l&apos;entière propriété des
            données que vous importez ou créez dans le Service (« vos
            données »).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            8. Données personnelles
          </h2>
          <p>
            Le traitement des données personnelles est décrit dans notre{' '}
            <a href="/privacy-policy" className="underline">
              politique de confidentialité
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            9. Disponibilité et limitation de responsabilité
          </h2>
          <p>
            Nous mettons en œuvre des moyens raisonnables pour assurer la
            disponibilité et la fiabilité du Service, sans garantie
            d&apos;absence d&apos;interruption ou d&apos;erreur. Les analyses
            de risque, scores et prédictions générés (y compris par
            intelligence artificielle) sont fournis à titre indicatif et
            d&apos;aide à la décision ; ils ne remplacent pas votre propre
            analyse et jugement professionnel. Dans la mesure permise par la
            loi applicable, notre responsabilité est limitée au montant des
            sommes versées au titre de l&apos;abonnement au cours des douze
            derniers mois.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">10. Modification des CGU</h2>
          <p>
            Nous pouvons modifier les présentes CGU ; toute modification
            substantielle vous sera notifiée par email ou via le Service. La
            poursuite de l&apos;utilisation du Service après notification
            vaut acceptation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">11. Droit applicable</h2>
          <p>
            Les présentes CGU sont soumises au droit marocain, sans préjudice
            des dispositions impératives de protection des consommateurs ou
            des données personnelles applicables dans le pays de
            l&apos;utilisateur.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">12. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU :{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

export default withI18n(TermsOfServicePage);
