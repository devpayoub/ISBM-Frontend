export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CONTROLLER'
  | 'MAINTENANCE'
  | 'OPERATOR';

type Action =
  | 'declare_alert'
  | 'acknowledge_alert'
  | 'start_alert'
  | 'resolve_alert'
  | 'close_alert'
  | 'verify_alert'
  | 'manage_users'
  | 'edit_settings';

// Kept in sync with the role checks in Backend/apps/alerts/views.py and
// Backend/apps/maintenance/views.py — update both sides together.
const rolePermissions: Record<UserRole, Action[]> = {
  ADMIN: [
    'declare_alert', 'acknowledge_alert', 'start_alert', 'resolve_alert',
    'close_alert', 'verify_alert', 'manage_users', 'edit_settings'
  ],
  MANAGER: [
    'declare_alert', 'acknowledge_alert', 'start_alert', 'resolve_alert',
    'close_alert', 'verify_alert', 'edit_settings'
  ],
  CONTROLLER: [
    'declare_alert', 'verify_alert'
  ],
  MAINTENANCE: [
    'acknowledge_alert', 'start_alert'
  ],
  OPERATOR: []
};

export function can(role: string | undefined | null, action: Action): boolean {
  if (!role) return false;
  const permissions = rolePermissions[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(action);
}
