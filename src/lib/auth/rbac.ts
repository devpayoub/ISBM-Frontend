export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CONTROLLER'
  | 'MAINTENANCE'
  | 'OPERATOR'
  | 'SUPPLIER';

// Kept in sync with Backend/apps/accounts/models.py's Role.choices — MANAGER
// is the spec's "Chef d'équipe" (team lead), not a separate role.
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  MANAGER: "Chef d'équipe",
  CONTROLLER: 'Contrôleur',
  MAINTENANCE: 'Maintenance',
  OPERATOR: 'Opérateur',
  SUPPLIER: 'Fournisseur',
};

type Action =
  | 'declare_alert'
  | 'acknowledge_alert'
  | 'start_alert'
  | 'resolve_alert'
  | 'close_alert'
  | 'verify_alert'
  | 'manage_users'
  | 'edit_settings'
  | 'declare_ticket'
  | 'assign_ticket_supplier'
  | 'propose_ticket_solution'
  | 'validate_ticket'
  | 'close_ticket';

// Kept in sync with the role checks in Backend/apps/alerts/views.py,
// Backend/apps/maintenance/views.py and Backend/apps/support/views.py —
// update all sides together.
const rolePermissions: Record<UserRole, Action[]> = {
  ADMIN: [
    'declare_alert', 'acknowledge_alert', 'start_alert', 'resolve_alert',
    'close_alert', 'verify_alert', 'manage_users', 'edit_settings',
    'declare_ticket', 'assign_ticket_supplier', 'validate_ticket', 'close_ticket',
  ],
  MANAGER: [
    'declare_alert', 'acknowledge_alert', 'start_alert', 'resolve_alert',
    'close_alert', 'verify_alert', 'edit_settings',
    'declare_ticket', 'assign_ticket_supplier', 'validate_ticket', 'close_ticket',
  ],
  CONTROLLER: [
    'declare_alert', 'verify_alert',
  ],
  MAINTENANCE: [
    'declare_ticket', 'assign_ticket_supplier', 'validate_ticket', 'close_ticket',
  ],
  OPERATOR: ['declare_ticket'],
  SUPPLIER: ['propose_ticket_solution'],
};

export function can(role: string | undefined | null, action: Action): boolean {
  if (!role) return false;
  const permissions = rolePermissions[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(action);
}
