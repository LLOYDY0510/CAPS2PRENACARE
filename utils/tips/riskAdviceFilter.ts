import { matchesSearch, normalizeSearch } from '@/utils/tables/search';

export type AdviceFilterIndicator = {
  id: string;
  label: string;
  urgency: string;
};

export type AdviceFilterMother = {
  fullName: string;
  serialNo: string | null;
  purok: string | null;
  matchedIndicators: AdviceFilterIndicator[];
};

/* One row predicate shared by mother inclusion and displayed advice rows. */
export function adviceRowMatches(
  indicator: AdviceFilterIndicator,
  selectedIndicator: string,
  selectedUrgency: string,
): boolean {
  if (selectedIndicator !== 'all' && indicator.id !== selectedIndicator && indicator.label !== selectedIndicator) return false;
  if (selectedUrgency !== 'all' && indicator.urgency !== selectedUrgency) return false;
  return true;
}

/* Mothers matching the patient search that keep at least one visible advice row. Without indicator/urgency narrowing every mother is kept, including high-risk mothers with no matched rows. */
export function riskMotherMatches(
  mother: AdviceFilterMother,
  search: string,
  selectedIndicator: string,
  selectedUrgency: string,
): boolean {
  const q = normalizeSearch(search);
  if (!matchesSearch(q, mother.fullName, mother.serialNo, mother.purok, `zone ${mother.purok ?? ''}`)) return false;
  if (selectedIndicator === 'all' && selectedUrgency === 'all') return true;
  return mother.matchedIndicators.some((indicator) => adviceRowMatches(indicator, selectedIndicator, selectedUrgency));
}
