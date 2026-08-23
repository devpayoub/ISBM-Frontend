// ──────────────────────────── Enums ────────────────────────────
export type Role = 'ADMIN' | 'MANAGER' | 'CONTROLLER' | 'MAINTENANCE' | 'OPERATOR' | 'SUPPLIER';
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
  full_name?: string;
  phone?: string;
  role: Role;
  shift?: Shift;
  is_on_duty: boolean;
  is_active: boolean;
  machine_assignment?: number | null;
  assigned_machines?: number[];
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
  serial_number?: string;
  manufacturer?: string;
  is_active: boolean;
}

export interface Parameter {
  id: number;
  key: string;
  label: string;
  value: string;
  text_value?: string;
  unit: string;
  category: string;
  effective_from?: string;
  is_active: boolean;
}

export interface MachineComponent {
  id: number;
  machine: number;
  machine_code?: string;
  name: string;
  reference?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuxiliaryEquipment {
  id: number;
  name: string;
  reference?: string;
  machines: number[];
  machines_detail?: { id: number; code: string; name: string }[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Mold {
  id: number;
  machine: number;
  machine_code?: string;
  name: string;
  reference?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ──────────────────────────── RH / Shifts ────────────────────────────
export interface ShiftAssignment {
  id: number;
  user: number;
  user_name?: string;
  user_role?: string;
  machine?: number | null;
  machine_code?: string;
  shift: Shift;
  starts_at: string;
  ends_at?: string | null;
  created_at?: string;
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
  reported_by_name?: string;
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

// ──────────────────────────── Controller Control (preventive maintenance) ────────────────────────────
export type ControlResultStatus = 'PENDING' | 'OK' | 'PROBLEM';

export interface ChecklistItem {
  id: number;
  text: string;
  order: number;
}

export interface ChecklistSection {
  id: number;
  name: string;
  order: number;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  id: number;
  key: string;
  name: string;
  is_active: boolean;
  sections: ChecklistSection[];
}

export interface MaintenanceControlResult {
  id: number;
  item: number;
  item_text: string;
  section_name: string;
  status: ControlResultStatus;
  note: string;
}

export interface MaintenanceControl {
  id: number;
  template: number;
  template_name: string;
  machine: number | null;
  machine_code: string;
  equipment: number | null;
  equipment_name: string;
  target_label: string;
  date: string;
  shift: Shift;
  controller: number | null;
  controller_name: string;
  confirmed_at: string | null;
  confirmed_by: number | null;
  confirmed_by_name: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  results: MaintenanceControlResult[];
}

// ──────────────────────────── Stock ────────────────────────────
export type StockItemType = 'RAW_MATERIAL' | 'COLORANT';
export type StockStatus = 'IN_STOCK' | 'LOW' | 'RUPTURE';
export type StockMovementType = 'RECEIPT' | 'CONSUMPTION' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  stock_item: number;
  type: StockMovementType;
  delta: string;
  quantity_before: string;
  quantity_after: string;
  reason: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface StockItem {
  id: number;
  type: StockItemType;
  name: string;
  reference: string;
  supplier: string;
  ral: string;
  unit: string;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  min_threshold: string;
  batch: string;
  received_at: string | null;
  notes: string;
  is_active: boolean;
  status: StockStatus;
  created_by: number | null;
  created_by_name: string;
  movements: StockMovement[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────── Reclamation ────────────────────────────
export type ReclamationStatus = 'OPEN' | 'INVESTIGATING' | 'CORRECTED' | 'CLOSED';
export type ReclamationSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export interface ResolvedPersonnelEntry {
  id: number;
  name: string;
}

export interface ResolvedPersonnel {
  date?: string;
  hour_label?: string;
  shift?: string;
  machine?: string;
  maintenance?: ResolvedPersonnelEntry[];
  controller?: ResolvedPersonnelEntry[];
  production?: ResolvedPersonnelEntry[];
}

export interface ReclamationAttachment {
  id: number;
  reclamation: number;
  file: string;
  uploaded_by: number | null;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface Reclamation {
  id: number;
  reference: string;
  client: string;
  reported_at: string;
  description: string;
  stock_item: number | null;
  stock_item_name: string;
  stock_item_reference: string;
  product_reference: string;
  machine: number | null;
  machine_code: string;
  production_at: string | null;
  severity: ReclamationSeverity;
  status: ReclamationStatus;
  resolved_personnel: ResolvedPersonnel;
  resolution: string;
  created_by: number | null;
  created_by_name: string;
  closed_by: number | null;
  closed_by_name: string;
  closed_at: string | null;
  attachments: ReclamationAttachment[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────── Catalog (Bottle characteristics) ────────────────────────────
export type BouchantType = 'HDPE' | 'LDPE' | 'COLORANT';

export interface BottleCharacteristic {
  id: number;
  category: string;
  reference: string;
  time_per_bottle_sec: string | null;
  raw_material: number;
  raw_material_name: string;
  raw_material_reference: string;
  raw_material_qty_g: string;
  colorant: number | null;
  colorant_name: string;
  colorant_reference: string;
  colorant_qty_g: string;
  bouchant_type: BouchantType;
  bouchant_raw_material_qty_g: string;
  bouchant_colorant_qty_g: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────── Production ────────────────────────────
export type ProductionEntryStatus = 'DRAFT' | 'VALIDATED' | 'STOCK_CONSUMED';

export interface ProductionEntry {
  id: number;
  date: string;
  hour: number;
  machine: number;
  machine_name?: string;
  machine_code?: string;
  shift: Shift;
  planning_order: number | null;
  planning_order_reference?: string;
  bottles_produced: number;
  caps_produced: number;
  reject_count: number;
  reject_pct: number;
  downtime_min: number;
  downtime_reason?: string;
  status: ProductionEntryStatus;
  validated_at: string | null;
  validated_by: number | null;
  validated_by_name?: string;
  raw_material_consumed_kg: string | null;
  colorant_consumed_kg: string | null;
  theoretical_raw_kg: string | null;
  theoretical_colorant_kg: string | null;
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
  labor_cost: number;
  total_cost: number;
  production_count: number;
  cost_per_bottle: number;
}

export type PlanningOrderStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface PlanningOrder {
  id: number;
  machine: number;
  machine_code: string;
  mold: number | null;
  mold_name: string;
  mold_reference: string;
  bottle: number | null;
  bottle_category: string;
  product_reference: string;
  color: string;
  color_formulation: string;
  quantity: number;
  time_per_bottle_sec: string;
  mold_change_min: number;
  requested_start: string | null;
  status: PlanningOrderStatus;
  notes: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialCheck {
  bottle: number;
  bottle_category: string;
  raw_material_reference: string;
  raw_material_required_kg: string;
  raw_material_physical_kg: string;
  raw_material_reserved_kg: string;
  raw_material_available_kg: string;
  colorant_reference: string;
  colorant_required_kg: string | null;
  colorant_physical_kg: string | null;
  colorant_reserved_kg: string | null;
  colorant_available_kg: string | null;
  stock_sufficient: boolean;
  stock_status: 'OK' | 'WARNING' | 'INSUFFICIENT';
  is_first_shortage: boolean;
}

export interface ScheduledOrder {
  id: number;
  machine: number;
  machine_code: string;
  mold: number | null;
  mold_name: string;
  product_reference: string;
  color: string;
  quantity: number;
  mold_change_min: number;
  production_time_min: number;
  estimated_start: string;
  estimated_finish: string;
  total_duration_min: number;
  material_check: MaterialCheck | null;
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

// ──────────────────────────── Support / SAV ────────────────────────────
export type TicketCriticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus =
  | 'NEW' | 'AWAITING_SUPPLIER' | 'DIAGNOSING' | 'SOLUTION_PROPOSED'
  | 'INTERVENING' | 'RESOLVED' | 'CLOSED';
export type TicketValidationDecision =
  | 'ACCEPTED' | 'REFUSED' | 'INFO_REQUESTED' | 'ONSITE_REQUESTED' | 'VIDEOCALL_REQUESTED';
export type TicketAttachmentCategory =
  | 'PHOTO' | 'VIDEO' | 'PDF' | 'REPORT' | 'SCREENSHOT' | 'ALARM_LOG' | 'TECHNICAL_FILE';

export interface TicketAttachment {
  id: number;
  ticket: number;
  solution?: number | null;
  file: string;
  category: TicketAttachmentCategory;
  uploaded_by?: number;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export type CommentRequestType = 'QUESTION' | 'TEST_REQUEST' | 'PHOTO_REQUEST' | '';

export interface TicketComment {
  id: number;
  ticket: number;
  user: number;
  user_name?: string;
  text: string;
  request_type?: CommentRequestType;
  created_at: string;
}

export interface TicketStatusLog {
  id: number;
  ticket: number;
  from_status: TicketStatus | '';
  to_status: TicketStatus;
  decision: TicketValidationDecision | '';
  reason: string;
  changed_by?: number;
  changed_by_name?: string;
  created_at: string;
}

export interface SupplierSolution {
  id: number;
  ticket: number;
  diagnostic: string;
  probable_cause: string;
  root_cause: string;
  repair_procedure: string;
  spare_parts: string;
  estimated_duration_min?: number;
  urgency: TicketCriticality;
  proposed_by?: number;
  proposed_by_name?: string;
  proposed_at: string;
  attachments?: TicketAttachment[];
}

export interface TicketClosure {
  id: number;
  ticket: number;
  repair_conforms: boolean;
  machine_back_in_service: boolean;
  restarted_at?: string;
  total_downtime_min: number;
  intervention_duration_min?: number;
  parts_replaced: string;
  intervention_cost?: number | string;
  closed_by?: number;
  closed_by_name?: string;
  closed_at: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  machine: number;
  machine_detail?: Machine;
  alert?: number | null;
  reported_by?: number;
  reported_by_name?: string;
  assigned_supplier?: number;
  assigned_supplier_name?: string;
  criticality: TicketCriticality;
  status: TicketStatus;
  production_line?: string;
  equipment_detail?: string;
  error_code?: string;
  description: string;
  symptoms?: string;
  production_impacted?: string;
  downtime_start?: string;
  downtime_end?: string;
  attachments: TicketAttachment[];
  comments: TicketComment[];
  status_logs: TicketStatusLog[];
  solutions: SupplierSolution[];
  closure?: TicketClosure | null;
  created_at: string;
  updated_at: string;
}

export interface SupportKPIByMachine {
  machine__code: string;
  count: number;
  mttr_min: number;
  mtbf_min: number | null;
}

export interface SupportKPIBySupplier {
  supplier_name: string;
  count: number;
  avg_cost: number | null;
  total_cost: number | null;
}

export interface SupportKPIIntervention {
  ticket_number: string;
  machine_code: string;
  supplier_name: string | null;
  closed_at: string;
  total_downtime_min: number;
  parts_replaced: string;
  intervention_cost: number | string | null;
}

export interface SupportKPIs {
  window_days: number;
  ticket_count: number;
  avg_supplier_response_min: number | null;
  avg_resolution_min: number | null;
  avg_intervention_cost: number | null;
  total_intervention_cost: number | null;
  by_machine: SupportKPIByMachine[];
  by_supplier: SupportKPIBySupplier[];
  interventions: SupportKPIIntervention[];
}

// ──────────────────────────── Notifications ────────────────────────────
export interface Notification {
  id: number;
  verb: string;
  body: string;
  target_type: string;
  target_id: number | null;
  url: string;
  is_read: boolean;
  created_at: string;
}

// ──────────────────────────── Package / Bag traceability ────────────────────────────
export interface PersonnelSnapshotEntry {
  id: number;
  name: string;
  role: string;
}

export interface Package {
  id: number;
  reference: string;
  machine: number;
  machine_code: string;
  machine_name: string;
  planning_order: number | null;
  planning_order_reference: string;
  bottle: number | null;
  bottle_category: string;
  bottle_count: number;
  raw_material: number | null;
  raw_material_name: string;
  raw_material_reference_snapshot: string;
  raw_material_consumed_kg: string | null;
  color: number | null;
  color_name: string;
  color_reference_snapshot: string;
  colorant_consumed_kg: string | null;
  supplier: string;
  production_started_at: string;
  production_finished_at: string | null;
  personnel_snapshot: PersonnelSnapshotEntry[];
  notes: string;
  shipped_at: string | null;
  shipped_to: string;
  verified_at: string | null;
  verified_by: number | null;
  verified_by_name: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PackageSummary {
  bags_total: number;
  bags_shipped: number;
  bottles_made: number;
  bottles_shipped: number;
  bottles_on_hand: number;
}

export interface PackageOrderProgressPackage {
  id: number;
  reference: string;
  bottle_count: number;
  production_started_at: string;
  verified_at: string | null;
  verified_by_name: string;
}

export interface PackageOrderProgress {
  order_id: number;
  product_reference: string;
  machine_id: number;
  machine_code: string;
  bottle_category: string;
  target_quantity: number;
  produced_quantity: number;
  packages: PackageOrderProgressPackage[];
}

export interface BottleCapacity {
  id: number;
  category: string;
  raw_material_reference: string;
  raw_material_available_kg: string;
  colorant_reference: string;
  colorant_available_kg: string | null;
  max_producible: number;
  physical_capacity: number;
  limiting_component: string;
  limiting_component_name: string;
}

export interface MaterialsOverview {
  stock: {
    total_active_items: number;
    near_threshold_count: number;
    near_threshold: {
      id: number;
      reference: string;
      name: string;
      quantity: string;
      unit: string;
      status: 'IN_STOCK' | 'LOW' | 'RUPTURE';
    }[];
  };
  capacity: {
    id: number;
    category: string;
    physical_capacity: number;
    available_capacity: number;
    limiting_component: string;
    limiting_component_name: string;
  }[];
  orders: {
    queued: number;
    in_progress: number;
    stock_ok: number;
    stock_warning: number;
    stock_insufficient: number;
  };
  production: {
    planned_quantity: number;
    actual_quantity: number;
    completion_pct: number;
  };
}

// ──────────────────────────── Pagination ────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
