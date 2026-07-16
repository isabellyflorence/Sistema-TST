export type AccessProfile = 'Administrador' | 'RH' | 'Técnico de Segurança do Trabalho';

export type ModulePermission =
  | 'dashboard'
  | 'cadastros'
  | 'gestao-epis'
  | 'estoque'
  | 'treinamentos'
  | 'relatorios'
  | 'configuracoes';

export interface Employee {
  id: string;
  name: string;
  registration: string;
  cpf: string;
  email: string;
  phone: string;
  roleId: string;
  sector: string;
  active: boolean;
}

export interface Epi {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  size: string;
  ca: string;
  expiry: string;
  stock: number;
  minStock: number;
}

export interface WorkRole {
  id: string;
  name: string;
  requiredCategories: string[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  registration: string;
  password: string;
  profile: AccessProfile;
  active: boolean;
}

export type MovementType = 'Entrada' | 'Saída' | 'Entrega' | 'Devolução' | 'Troca';

export interface EpiMovement {
  id: string;
  type: MovementType;
  employeeId?: string;
  epiId: string;
  quantity: number;
  date: string;
  reason: string;
  signature: string;
}

export type TrainingStatus = 'Agendado' | 'Concluído' | 'Cancelado';

export interface Training {
  id: string;
  name: string;
  type: string;
  date: string;
  validUntil: string;
  duration: number;
  participants: string[];
  status: TrainingStatus;
}

export interface AuditEntry {
  id: string;
  date: string;
  action: string;
  detail: string;
}

export interface SystemSettings {
  hospitalName: string;
  systemName: string;
  alertDays: number;
  stockAlertEnabled: boolean;
  expiryAlertEnabled: boolean;
  permissions: Record<AccessProfile, ModulePermission[]>;
}

export interface SiccState {
  employees: Employee[];
  epis: Epi[];
  roles: WorkRole[];
  users: SystemUser[];
  movements: EpiMovement[];
  trainings: Training[];
  audits: AuditEntry[];
  settings: SystemSettings;
}
