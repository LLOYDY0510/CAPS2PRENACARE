export type PrenatalVisitStatus = 'upcoming' | 'missed' | 'completed';

type VisitStatusInput = {
  scheduledFor?: string | null;
  actualCheckupDate?: string | null;
  recordedStatus?: string | null;
  today?: string;
};

export function getPrenatalVisitStatus({
  scheduledFor,
  recordedStatus,
  today = new Date().toISOString().slice(0, 10),
}: VisitStatusInput): PrenatalVisitStatus {
  if (actualCheckupDate || recordedStatus === 'completed') return 'completed';
  if (!scheduledFor || scheduledFor >= today) return 'upcoming';
  return 'missed';
}

export function prenatalStatusLabel(status: PrenatalVisitStatus): string {
  return status === 'completed' ? 'Complete' : status[0].toUpperCase() + status.slice(1);
}