import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:privacyPolicy'),
  };
}

async function PrivacyPolicyPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SitePageHeader
        title={t('marketing:privacyPolicy')}
        subtitle={t('marketing:privacyPolicyDescription')}
      />

      <div className={'container mx-auto max-w-3xl space-y-8 py-8'}>
        <p className="text-muted-foreground text-sm">
          Dernière mise à jour : 29 juin 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            1. Responsable du traitement
          </h2>
          <p>
            Le responsable du traitement des données personnelles collectées
            via VendorShield est Abdoulaye Chaibou, exploitant individuel
            basé au Maroc. Contact :{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Données collectées</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Données de compte : nom, email, mot de passe (haché), société,
              rôle.
            </li>
            <li>
              Données métier que vous saisissez ou importez : fiches
              fournisseurs, évaluations de risque, documents, contacts.
            </li>
            <li>
              Données de facturation, traitées directement par Paddle.com
              (nous ne stockons pas vos données de carte bancaire).
            </li>
            <li>
              Données techniques : adresse IP, journaux de connexion, cookies
              strictement nécessaires (voir notre{' '}
              <a href="/cookie-policy" className="underline">
                politique de cookies
              </a>
              ).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Finalités et base légale</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Fourniture du Service et exécution du contrat (CGU) — base
              légale : exécution contractuelle.
            </li>
            <li>
              Facturation et obligations comptables — base légale :
              obligation légale et exécution contractuelle.
            </li>
            <li>
              Emails transactionnels et alertes que vous configurez — base
              légale : exécution contractuelle.
            </li>
            <li>
              Amélioration du Service et sécurité — base légale : intérêt
              légitime.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            4. Sous-traitants et destinataires
          </h2>
          <p>Vos données peuvent être traitées par les prestataires suivants, dans le cadre strict de leur prestation :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Supabase</strong> (hébergement base de données,
              authentification, fichiers) — région Union européenne.
            </li>
            <li>
              <strong>Paddle.com</strong> (Merchant of Record — paiement,
              facturation, TVA).
            </li>
            <li>
              <strong>Groq</strong> et <strong>OpenRouter</strong>{' '}
              (traitement par modèles de langage pour les fonctionnalités
              d&apos;analyse et de copilote IA — les contenus envoyés à ces
              prestataires sont limités à ce qui est nécessaire à la
              fonctionnalité demandée).
            </li>
            <li>
              <strong>Resend</strong> (envoi des emails transactionnels et
              d&apos;alertes).
            </li>
            <li>
              <strong>Vercel</strong> (hébergement de l&apos;application).
            </li>
          </ul>
          <p>
            Certains de ces prestataires (Groq, OpenRouter, Paddle, Vercel)
            peuvent traiter des données en dehors de l&apos;Union européenne ;
            dans ce cas, le transfert repose sur les Clauses Contractuelles
            Types de la Commission européenne ou un mécanisme équivalent
            prévu par ces prestataires.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Durée de conservation</h2>
          <p>
            Vos données sont conservées pendant toute la durée de votre
            relation contractuelle avec nous, puis archivées ou supprimées
            dans un délai raisonnable après résiliation de votre compte, sauf
            obligation légale de conservation plus longue (comptabilité,
            facturation).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            6. Vos droits
          </h2>
          <p>
            Conformément au RGPD et, le cas échéant, à la loi marocaine
            n°09-08, vous disposez d&apos;un droit d&apos;accès, de
            rectification, d&apos;effacement, de limitation, d&apos;opposition
            et de portabilité de vos données personnelles. Vous pouvez
            exercer ces droits en écrivant à{' '}
            <a href="mailto:a.chaibou.tech@gmail.com" className="underline">
              a.chaibou.tech@gmail.com
            </a>
            . Si vous résidez dans l&apos;Union européenne, vous disposez
            également du droit d&apos;introduire une réclamation auprès de
            l&apos;autorité de contrôle compétente (en France, la CNIL).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Sécurité</h2>
          <p>
            Vos données sont protégées par chiffrement en transit (HTTPS) et
            au repos, ainsi que par une isolation stricte entre comptes
            clients (politiques RLS au niveau de la base de données). Aucun
            système n&apos;étant infaillible, nous ne pouvons garantir une
            sécurité absolue.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Modifications</h2>
          <p>
            Cette politique peut être mise à jour ; la date de dernière mise
            à jour figure en haut de cette page. Toute modification
            substantielle vous sera notifiée.
          </p>
        </section>
      </div>
    </div>
  );
}

export default withI18n(PrivacyPolicyPage);
