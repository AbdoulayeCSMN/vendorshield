import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:cookiePolicy'),
  };
}

async function CookiePolicyPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t(`marketing:cookiePolicy`)}
        subtitle={t(`marketing:cookiePolicyDescription`)}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">
          Dernière mise à jour : 29 juin 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
          <p>
            Un cookie est un petit fichier déposé sur votre appareil lors de
            la visite d&apos;un site, permettant de conserver des
            informations entre deux visites ou pages.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            2. Cookies utilisés sur VendorShield
          </h2>
          <p>
            Nous utilisons exclusivement des cookies strictement nécessaires
            au fonctionnement du Service — aucun cookie publicitaire ou de
            tracking tiers n&apos;est déposé à ce jour :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Cookies de session/authentification</strong> (Supabase
              Auth) — vous maintiennent connecté(e) à votre compte.
            </li>
            <li>
              <strong>Cookie CSRF</strong> — protège les formulaires contre
              les attaques de falsification de requête.
            </li>
            <li>
              <strong>Préférence d&apos;affichage</strong> (
              <code>layout-style</code>) — mémorise votre choix de mise en
              page (barre latérale ou en-tête).
            </li>
            <li>
              <strong>Mode démo</strong> (<code>vs-demo-mode</code>) — actif
              uniquement si vous visitez la démo publique en lecture seule.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Cookies tiers</h2>
          <p>
            Notre prestataire de paiement Paddle.com peut déposer ses propres
            cookies techniques lors du passage sur leur page de paiement
            hébergée, conformément à leur propre politique. Si nous
            déployons à l&apos;avenir des outils de mesure d&apos;audience ou
            de suivi publicitaire (par exemple pour des campagnes
            publicitaires), cette page sera mise à jour en conséquence et un
            bandeau de consentement vous sera présenté avant tout dépôt de
            cookie non essentiel.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            4. Gérer les cookies
          </h2>
          <p>
            Les cookies décrits ci-dessus étant strictement nécessaires au
            fonctionnement du Service, ils ne sont pas soumis à votre
            consentement préalable. Vous pouvez néanmoins les supprimer via
            les réglages de votre navigateur, au risque de perturber votre
            connexion au Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Contact</h2>
          <p>
            Pour toute question :{' '}
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

export default withI18n(CookiePolicyPage);
