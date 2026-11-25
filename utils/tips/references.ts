/* References transcribed from docs/Message/advisesandhealthtip.pdf ([1]-[7]).
   [1] and [3] overlap in the source; both are kept verbatim pending owner confirmation. */
export const HIGH_RISK_REFERENCES = [
  '[1] World Health Organization. WHO recommendations on antenatal care for a positive pregnancy experience. 2016.',
  '[2] World Health Organization. WHO recommendations on antenatal care for a positive pregnancy experience: Highlights and key messages. 2018.',
  '[3] World Health Organization. New guidelines on antenatal care for a positive pregnancy experience. 2016.',
  '[4] American College of Obstetricians and Gynecologists. Bleeding During Pregnancy.',
  '[5] American College of Obstetricians and Gynecologists. Urgent Maternal Warning Signs.',
  '[6] MedlinePlus. Preterm labor. 2026.',
  '[7] PhilHealth Circular PC-2026-0016, Annex A: Characteristics of High Risk.',
];

/* Low-risk PDF table is blank, so low-risk tips reuse the existing templates with WHO references. */
export const LOW_RISK_REFERENCES = [
  HIGH_RISK_REFERENCES[0],
  HIGH_RISK_REFERENCES[1],
];

export const HIGH_RISK_SMS_REF = 'Ref: WHO, ACOG, PhilHealth';
export const LOW_RISK_SMS_REF = 'Ref: WHO ANC';
