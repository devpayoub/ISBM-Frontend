// ──────────────────────────── Enums ────────────────────────────
export type Role = 'ADMIN' | 'MANAGER' | 'CONTROLLER' | 'MAINTENANCE' | 'OPERATOR';
export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type MachineType = 'ISBM' | 'INJECTION' | 'COMPRESSOR' | 'CHILLER' | 'DRYER';
export type MachineStatus = 'RUNNING' | 'STOPPED' | 'MAINTENANCE' | 'BREAKDOWN';
export type AndonColor = 'GREEN' | 'ORANGE' | 'RED';
export type AlertSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type NcStatus = 'OPEN' | 'INVESTIGATING' | 'CORRECTED' | 'CLOSED';
export type PmStatus = 'DUE' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';
export type PmFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

// ──────────────────────────── Identity ────────────────────────────
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: Role;
  shift?: Shift;
  is_on_duty: boolean;
  is_active: boolean;
  machine_assignment?: number | null;
  date_joined?: string;
}

// ──────────────────────────── Assets ────────────────────────────
export interface Machine {
  id: number;
  name: string;
  code: string;
  type: MachineType;
  status: MachineStatus;
  andon_status: AndonColor;
  nominal_bph: number;
  nominal_cph: number;
  cavities: number;
  product_format?: string;
  location?: string;
  is_active: boolean;
}

export interface Parameter {
  id: number;
  key: string;
  label: string;
  value: string;
  unit: string;
  category: string;
  effective_from?: string;
  is_active: boolean;
}

// ──────────────────────────── Alerts ────────────────────────────
export interface AlertCategory {
  id: number;
  name: string;
  code: string;
  severity_default: AlertSeverity;
  color: string;
  requires_maintenance: boolean;
  is_active: boolean;
}

export interface Alert {
  id: number;
  machine: number;
  machine_name?: string;
  machine_detail?: Machine;
  category: number | null;
  category_detail?: AlertCategory;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  reported_by?: number;
  reported_by_name?: string;
  worker_name?: string;
  shift: Shift;
  acknowledged_at?: string;
  acknowledged_by?: number;
  acknowledged_by_name?: string;
  resolved_at?: string;
  resolved_by?: number;
  resolved_by_name?: string;
  closed_at?: string;
  downtime_min: number;
  bottles_lost: number;
  photo?: string;
  priority_score: number;
  escalation_level: number;
  escalated_at?: string;
  comments_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface AlertComment {
  id: number;
  alert: number;
  user: number;
  user_name?: string;
  text: string;
  created_at: string;
}

// ──────────────────────────── Maintenance ────────────────────────────
export interface Intervention {
  id: number;
  alert: number;
  alert_title?: string;
  machine_name?: string;
  technician: number;
  technician_name?: string;
  action_taken?: string;
  parts_used?: string;
  started_at: string;
  finished_at?: string;
  duration_min?: number;
  notes?: string;
  verified: boolean;
}

export interface PreventiveMaintenance {
  id: number;
  machine: number;
  machine_name?: string;
  task: string;
  frequency: PmFrequency;
  checklist: Record<string, boolean>;
  last_done?: string;
  next_due: string;
  assigned_to?: number;
  assigned_to_name?: string;
  status: PmStatus;
}

// ──────────────────────────── Production ────────────────────────────
export interface ProductionEntry {
  id: number;
  date: string;
  hour: number;
  machine: number;
  machine_name?: string;
  shift: Shift;
  bottles_produced: number;
  caps_produced: number;
  reject_count: number;
  reject_pct: number;
  downtime_min: number;
  downtime_reason?: string;
  pet_kg: number;
  energy_kwh: number;
  air_m3: number;
  recorded_by: number;
}

export interface OEERecord {
  id: number;
  machine: number;
  machine_name?: string;
  date: string;
  shift: Shift;
  theoretical_production: number;
  actual_production: number;
  total_downtime_min: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  trs_pct: number;
  kwh_per_bottle: number;
  air_per_bottle: number;
  reject_count: number;
}

export interface CostParameter {
  id: number;
  name: string;
  label?: string;
  value: number;
  unit: string;
  is_active: boolean;
}

export interface CostRecord {
  id: number;
  machine: number;
  machine_name?: string;
  date: string;
  shift: Shift;
  pet_cost: number;
  energy_cost: number;
  air_cost: number;
  labor_cost: number;
  total_cost: number;
  production_count: number;
  cost_per_bottle: number;
}

export interface ProductionPlan {
  id: number;
  date: string;
  machine: number;
  machine_name?: string;
  product: string;
  target_bph: number;
  actual_bph: number;
  variance: number;
  variance_pct: number;
  notes?: string;
}

// ──────────────────────────── ISO 9001 / Quality ────────────────────────────
export interface NonConformity {
  id: number;
  nc_number: string;
  source: 'INTERNAL' | 'CUSTOMER' | 'AUDIT' | 'ALERT';
  machine?: number;
  machine_name?: string;
  product?: string;
  type: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  status: NcStatus;
  opened_by: number;
  opened_by_name?: string;
  opened_at: string;
  closed_at?: string;
  linked_alert?: number;
}

export interface AuditDocument {
  id: number;
  title: string;
  clause: string;
  file: string;
  version: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  status: 'DRAFT' | 'READY' | 'APPROVED';
  uploaded_at: string;
}

// ──────────────────────────── ANDON / PLC ────────────────────────────
export interface AndonEvent {
  id: number;
  machine: number;
  machine_name?: string;
  color: AndonColor;
  reason?: string;
  started_at: string;
  ended_at?: string;
  duration_min?: number;
  triggered_by: 'PLC' | 'MANUAL' | 'ALERT';
}

export interface PlcReading {
  id: number;
  machine: number;
  ts: string;
  production_count: number;
  downtime_signal: boolean;
  temperature?: number;
  pressure?: number;
  cycle_time_ms?: number;
  raw?: Record<string, unknown>;
}

// ──────────────────────────── Audit ────────────────────────────
export interface ActivityLog {
  id: number;
  user: number | null;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  target_type: string;
  target_id: number | null;
  detail: string;
  created_at: string;
}

// ──────────────────────────── Pagination ────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
