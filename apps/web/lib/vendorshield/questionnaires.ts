// Questionnaire d'auto-évaluation fournisseur — template (versionné en code,
// snapshoté par envoi) + barème de scoring. Types purs, importables côté client.

export type QuestionType = 'yes_no' | 'scale' | 'text';

export interface Question {
  id: string;
  category: string;
  label: string;
  type: QuestionType;
  weight: number; // 0 = non noté (informatif)
  /** Pour yes_no : si true, "oui" est défavorable (ex: incident subi). */
  inverse?: boolean;
}

export const QUESTIONNAIRE_VERSION = 'self-assessment-v1';

export const DEFAULT_QUESTIONNAIRE: Question[] = [
  { id: 'fin_profit', category: 'Financier', label: 'Êtes-vous bénéficiaire sur les 2 derniers exercices ?', type: 'yes_no', weight: 3 },
  { id: 'fin_dependency', category: 'Financier', label: 'Votre plus gros client représente-t-il moins de 30 % de votre CA ?', type: 'yes_no', weight: 2 },
  { id: 'qual_iso9001', category: 'Qualité', label: 'Disposez-vous d’une certification ISO 9001 en cours de validité ?', type: 'yes_no', weight: 3 },
  { id: 'qual_otd', category: 'Qualité', label: 'Niveau de ponctualité des livraisons sur 12 mois (1 = <70 %, 5 = >98 %)', type: 'scale', weight: 2 },
  { id: 'rse_vigilance', category: 'RSE / Vigilance', label: 'Avez-vous un code de conduite ou un plan de vigilance ?', type: 'yes_no', weight: 2 },
  { id: 'rse_iso14001', category: 'RSE / Vigilance', label: 'Disposez-vous d’une certification environnementale (ISO 14001) ?', type: 'yes_no', weight: 1 },
  { id: 'cyber_policy', category: 'Cybersécurité', label: 'Avez-vous une politique de sécurité de l’information ?', type: 'yes_no', weight: 2 },
  { id: 'cyber_incident', category: 'Cybersécurité', label: 'Avez-vous subi un incident cyber majeur ces 24 derniers mois ?', type: 'yes_no', weight: 2, inverse: true },
  { id: 'cont_bcp', category: 'Continuité', label: 'Disposez-vous d’un plan de continuité d’activité (PCA) ?', type: 'yes_no', weight: 2 },
  { id: 'cont_alt', category: 'Continuité', label: 'Pouvez-vous activer une source/site alternatif en cas de rupture ?', type: 'yes_no', weight: 1 },
  { id: 'comment', category: 'Complément', label: 'Commentaires ou informations complémentaires', type: 'text', weight: 0 },
];

export type Responses = Record<string, string | number | boolean | null>;

/** Score 0-100 pondéré à partir des réponses notées. */
export function scoreQuestionnaire(questions: Question[], responses: Responses): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const q of questions) {
    if (q.weight <= 0) continue;
    const r = responses[q.id];
    if (r === undefined || r === null || r === '') continue;

    let fraction = 0;
    if (q.type === 'yes_no') {
      const yes = r === true || r === 'yes' || r === 'oui';
      fraction = q.inverse ? (yes ? 0 : 1) : yes ? 1 : 0;
    } else if (q.type === 'scale') {
      const n = Number(r);
      if (!Number.isNaN(n)) fraction = Math.min(1, Math.max(0, (n - 1) / 4)); // 1..5 → 0..1
    } else {
      continue; // texte non noté
    }
    weighted += fraction * q.weight;
    totalWeight += q.weight;
  }

  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
}
