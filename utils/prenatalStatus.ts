import { localDate } from '@/utils/calendar';
export type PrenatalVisitStatus = 'upcoming' | 'missed' | 'completed';

type VisitStatusInput = {
  scheduledFor?: string | null;
  actualCheckupDate?: string | null;
  recordedStatus?: string | null;
  today?: string;
};

export function getPrenatalVisitStatus({
  scheduledFor,
  actualCheckupDate,
  recordedStatus,
  today = localDate(),
}: VisitStatusInput): PrenatalVisitStatus {
  if (actualCheckupDate || recordedStatus === 'completed') return 'completed';
  if (!scheduledFor || scheduledFor >= today) return 'upcoming';
  return 'missed';
}

export function prenatalStatusLabel(status: PrenatalVisitStatus): string {
  return status === 'completed' ? 'Complete' : status[0].toUpperCase() + status.slice(1);
}
