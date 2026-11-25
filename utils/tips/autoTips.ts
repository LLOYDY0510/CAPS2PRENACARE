import { normalizeSearch } from '@/utils/tables/search';
import {
  HIGH_RISK_REFERENCES,
  HIGH_RISK_SMS_REF,
  LOW_RISK_REFERENCES,
  LOW_RISK_SMS_REF,
} from '@/utils/tips/references';

/* Seed labels in docs/Message/advisesandhealthtip.pdf, in table order. */
export const ADVICE_SEED_LABELS = [
  'Maternal age below 19 years old at delivery',
  'First pregnancy at age 35 years and older',
  'Multiple or multifetal pregnancy (twins, triplets)',
  'Ovarian abnormality (e.g., ovarian cyst)',
  'Uterine abnormality (e.g., myoma uteri)',
  'Placental abnormality (e.g., placenta previa)',
  'Abnormal fetal presentation (e.g., breech)',
  'History of 3 or more miscarriages/abortions',
  'History of 1 stillbirth',
  'History of major obstetric/gynecologic operation (e.g., cesarean section, myomectomy)',
  'History of medical conditions (hypertension, preeclampsia, eclampsia, heart disease, diabetes, thyroid disorder, morbid obesity, moderate to severe asthma, epilepsy, renal disease, bleeding disorder)',
  'Other risk factors during present pregnancy (e.g., premature contractions, vaginal bleeding)',
];

export const ADVICE_FALLBACK_LABEL = ADVICE_SEED_LABELS[11];

/* Live risk_indicators labels differ in wording; map each to its seed label. */
const ALIAS: Record<string, string> = {
  'maternalagebelow19yearsoldatthedateofdelivery': ADVICE_SEED_LABELS[0],
  'firstpregnancyinpatientswithage35yearsandolderatthedateofdelivery': ADVICE_SEED_LABELS[1],
  'multipleormultifetalpregnancyegtwinsandtriplets': ADVICE_SEED_LABELS[2],
  'ovarianabnormalityegovariancyst': ADVICE_SEED_LABELS[3],
  'uterineabnormalityegmyomauteri': ADVICE_SEED_LABELS[4],
  'placentalabnormalityegplacentaprevia': ADVICE_SEED_LABELS[5],
  'abnormalfetalpresentationegbreech': ADVICE_SEED_LABELS[6],
  'historyof3threeormoremiscarriagesabortion': ADVICE_SEED_LABELS[7],
  'historyof1onestillbirth': ADVICE_SEED_LABELS[8],
  'historyofmajorobstetricandorgynecologicoperationegcaesareansectionuterinemyomectomy': ADVICE_SEED_LABELS[9],
  'historyofmedicalconditionseghypertensionpreeclampsiaeclampsiaheartdiseasediabetesthyroiddisordermorbidobesitymoderatetosevereasthmaepilepsyrenaldiseasebleedingdisorder': ADVICE_SEED_LABELS[10],
  'otherriskfactorsthatmayariseduringpresentpregnancyegprematurecontractionsvaginalbleedingthatwarrantreferralforfurthermanagement': ADVICE_SEED_LABELS[11],
};

function clean(label: string): string {
  return normalizeSearch(label).replace(/[^a-z0-9]/g, '');
}

const SEED_BY_NORM = new Map(ADVICE_SEED_LABELS.map((label) => [clean(label), label]));

/* Resolve a mother's indicator to its monthly-advice row, falling back to general guidance. */
export function resolveAdviceLabel(indicatorLabel: string | null | undefined, indicatorType?: string | null): string {
  if (indicatorType === 'age_below') return ADVICE_SEED_LABELS[0];
  if (indicatorType === 'first_pregnancy_age_above') return ADVICE_SEED_LABELS[1];
  const key = clean(indicatorLabel ?? '');
  return SEED_BY_NORM.get(key) ?? ALIAS[key] ?? ADVICE_FALLBACK_LABEL;
}

/* Pregnancy month from LMP, 1-9; mirrors the broadcast manager's grouping. */
export function pregnancyMonth(lmp: string | null, nowMs: number = Date.now()): number | null {
  if (!lmp) return null;
  const lmpDate = new Date(lmp);
  if (isNaN(lmpDate.getTime())) return null;
  const days = Math.floor((nowMs - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  const month = Math.floor(days / 30) + 1;
  if (month < 1 || month > 9) return null;
  return month;
}

export function adviceSlug(seedLabel: string): string {
  return clean(seedLabel).slice(0, 40);
}

/* Stable per-month key: a risk flip never rewrites an already-sent month. */
export function autoTipEventKey(motherId: string, month: number, slug: string): string {
  return `auto-tip:${motherId}:m${month}:${slug}`;
}

export function tipSmsText(content: string, highRisk: boolean): string {
  return `${content} (${highRisk ? HIGH_RISK_SMS_REF : LOW_RISK_SMS_REF})`;
}

export function tipNoticeText(content: string, highRisk: boolean): string {
  const refs = highRisk ? HIGH_RISK_REFERENCES : LOW_RISK_REFERENCES;
  return `${content}\n\nReferences:\n${refs.join('\n')}`;
}

export function tipTitle(month: number, highRisk: boolean): string {
  return `Month ${month}: ${highRisk ? 'High-Risk Care' : 'Low-Risk Care'}`;
}
