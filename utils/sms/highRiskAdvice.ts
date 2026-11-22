// High-risk advice SMS copy, taken verbatim from docs/Message/High.docx.
// Each entry pairs one docx indicator row with its SMS text.

export type AdviceIndicator = {
  label: string;
  indicator_type: string;
  advice_message?: string | null;
};

const AGE_BELOW_ADVICE =
  'Mommy, mas daghan ang nutrisyon nga kinahanglan sa imong edad. Kaon og lain-lain nga pagkaon adlaw-adlaw, inom folic acid, ug ayaw palabya ang check-up.';
const FIRST_PREGNANCY_AGE_ABOVE_ADVICE =
  'Mommy, importante ang regular nga check-up ug healthy nga timbang. Kaon og utanon, prutas ug protina, ug mag-ehersisyo nga hinay-hinay. Ayaw mag-diet.';
const MULTIPLE_PREGNANCY_ADVICE =
  'Mommy, mas daghan ang nutrisyon nga kinahanglan sa kambal/triplets. Pangutan-a imong midwife/doktor para sa dietitian, ug kaon og gagmay pero kanunay.';
const OVARIAN_ADVICE =
  'Mommy, sunda ang bilin sa imong doktor. Kaon og balanseng pagkaon, inom og daghang tubig (mga 9 ka baso), ug ipahibalo dayon kung grabe ang sakit sa tiyan.';
const UTERINE_ADVICE =
  'Mommy, sunda ang bilin sa imong doktor. Kaon og balanseng pagkaon, inom og daghang tubig, ug adto dayon sa health center kung dunay pagdugo o grabeng sakit sa tiyan.';
const PLACENTAL_ADVICE =
  'Mommy, pahulay ug sunda ang bilin sa doktor. Kaon og iron-rich nga pagkaon (isda, manok, utanon). Adto dayon sa ospital kung dunay pagdugo sa pwerta.';
const BREECH_ADVICE =
  'Mommy, kanunay nga mausab ang posisyon sa bata. Padayon sa check-up aron mamonitor, ug kaon og balanse ug mag-ehersisyo nga hinay-hinay.';
const MISCARRIAGE_ADVICE =
  'Mommy, inom og 800µg folic acid adlaw-adlaw hangtod 12 weeks. Likayi ang alkohol, limitahi ang kape, ug kaon lang og lutong-lutong pagkaon.';
const STILLBIRTH_ADVICE =
  'Mommy, ayaw pagkaon og hilaw o di-hingpit nga luto. Likayi ang alkohol, ug ipahibalo dayon sa midwife kung maminusan ang lihok sa bata.';
const MAJOR_OPERATION_ADVICE =
  'Mommy, ayaw sobra ang pagtaas sa timbang (mas taas ang risk sa CS). Kaon og wholegrain, utanon ug prutas, ug maglakaw-lakaw adlaw-adlaw.';
const MEDICAL_CONDITION_ADVICE =
  'Mommy, kaon og gamay ang asin, tamis ug tambok. Ayaw mag-diet, ug ipahibalo sa midwife ang tanang tambal o supplement nga imong gi-inom.';
const OTHER_RISK_ADVICE =
  'Mommy, kung dunay pagdugo, kusog nga sakit sa tiyan o lagnat, adto dayon sa ospital. Kung grabe ang pagsuka ug di ka makakaon, pahibalo sa midwife.';

// Map one indicator to its docx advice. Order matters: specific rows first,
// bleeding signs before general medical conditions, other-risk catch-all last.
export function matchHighRiskAdvice(label: string, indicatorType: string): string {
  const l = (label || '').toLowerCase();
  if (indicatorType === 'age_below' || l.includes('teen') || l.includes('young') || l.includes('adolescent')) {
    return AGE_BELOW_ADVICE;
  }
  if (indicatorType === 'first_pregnancy_age_above' || (l.includes('first') && l.includes('age'))) {
    return FIRST_PREGNANCY_AGE_ABOVE_ADVICE;
  }
  if (l.includes('twin') || l.includes('multiple') || l.includes('triplet') || l.includes('kambal')) {
    return MULTIPLE_PREGNANCY_ADVICE;
  }
  if (l.includes('ovar')) return OVARIAN_ADVICE;
  if (l.includes('placenta') || l.includes('previa')) return PLACENTAL_ADVICE;
  if (l.includes('uter')) return UTERINE_ADVICE;
  if (l.includes('breech') || l.includes('presentation') || l.includes('transverse') || l.includes('suhi')) {
    return BREECH_ADVICE;
  }
  if (l.includes('stillbirth') || l.includes('patay nga bata')) return STILLBIRTH_ADVICE;
  if (l.includes('miscarriage') || l.includes('abort') || l.includes('kunan')) return MISCARRIAGE_ADVICE;
  if (l.includes('myomectomy') || l.includes('cesarean') || l.includes('c-section') || l.includes('operation')
    || l.includes('scar') || l.includes('tahi') || /\bcs\b/.test(l)) {
    return MAJOR_OPERATION_ADVICE;
  }
  if (l.includes('bleed') || l.includes('spotting') || l.includes('hemorrhage') || l.includes('dugo')
    || l.includes('contraction') || l.includes('premature') || l.includes('lagnat') || l.includes('fever')
    || l.includes('vomit') || l.includes('suka')) {
    return OTHER_RISK_ADVICE;
  }
  if (l.includes('hypertens') || l.includes('blood pressure') || l.includes('preeclamp') || l.includes('eclamp')
    || l.includes('diabet') || l.includes('sugar') || l.includes('gdm') || l.includes('asthma')
    || l.includes('heart') || l.includes('cardiac') || l.includes('kidney') || l.includes('renal')
    || l.includes('pulmonary') || l.includes('thyroid') || l.includes('anemi') || l.includes('hemoglobin')) {
    return MEDICAL_CONDITION_ADVICE;
  }
  return OTHER_RISK_ADVICE;
}

// Join matched advices for one mother. Staff-written advice wins per
// indicator, duplicates collapse, and the join caps at three texts.
export function composeHighRiskAdvice(indicators: AdviceIndicator[], limit = 3): string | null {
  const parts: string[] = [];
  for (const indicator of indicators) {
    const override = indicator.advice_message?.trim();
    const text = override || matchHighRiskAdvice(indicator.label, indicator.indicator_type);
    if (text && !parts.includes(text)) parts.push(text);
    if (parts.length >= limit) break;
  }
  return parts.length ? parts.join('\n\n') : null;
}
