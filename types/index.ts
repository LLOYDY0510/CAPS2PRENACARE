// types/index.ts

export type UserRole =
  | 'bhw_head'
  | 'bhw_purok'
  | 'nurse'
  | 'admin'
  | 'pregnant_mother'
  | 'pending';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole | string | null;
  purok: string | null;
  pregnant_mother_id: string | null;
  created_at: string;
};

export type RiskLevel = 'low' | 'high';

export type PregnantMother = {
  id: string;
  serial_no: string | null;
  date_registered: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  address: string | null;
  purok: string | null;
  age: number | null;
  contact_number: string | null;
  lmp: string | null;
  gravida_para: string | null;
  edd: string | null;
  blood_pressure: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  latitude: number | null;
  longitude: number | null;
  risk_level: RiskLevel | null;
  registered_by: string | null;
};

export type Trimester = '1st' | '2nd' | '3rd';

export type PrenatalCheckup = {
  id: string;
  pregnant_mother_id: string;
  trimester: Trimester;
  checkup_date: string;
  blood_pressure: string | null;
  weight_kg: number | null;
  notes: string | null;
  recorded_by?: string | null;
};

export type RiskIndicatorType =
  | 'checklist'
  | 'age_below'
  | 'first_pregnancy_age_above';

export type RiskIndicator = {
  id: string;
  label: string;
  indicator_type: RiskIndicatorType | string;
  threshold_value: number | null;
  active: boolean;
  created_by?: string | null;
  created_at?: string;
};

export type MonthlyTip = {
  id: string;
  month: number;
  risk_level: RiskLevel;
  title: string;
  content: string;
};

export type TipBroadcastStatus = 'pending' | 'approved' | 'sent';

export type TipBroadcast = {
  id: string;
  month: number;
  risk_level: RiskLevel;
  period: string;
  title: string;
  content: string;
  status: TipBroadcastStatus;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
};

export type TipBroadcastRecipient = {
  broadcast_id: string;
  pregnant_mother_id: string;
  sent: boolean;
  sent_at?: string | null;
  pregnant_mothers: { full_name: string } | null;
};

export type PrenatalSchedule = {
  id: string;
  visit_date: string;
  reminder_sent: boolean;
  reminder_sent_at?: string | null;
  set_by?: string | null;
};

export type SmsLog = {
  id: string;
  recipient_count: number;
  recipient_numbers?: string[] | null;
  message: string;
  status: 'success' | 'failed';
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
};

export type RiskPoint = {
  id: string;
  full_name: string;
  purok: string | null;
  risk_level: RiskLevel;
  latitude: number;
  longitude: number;
};

export type ReportRow = {
  serial_no: string | number | null;
  date_registered: string | null;
  name: string;
  address: string | null;
  purok: string | null;
  age: number | null;
  contact_number: string | null;
  lmp: string | null;
  edd: string | null;
  gravida_para: string | null;
  blood_pressure: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  risk_level: string | null;
};
