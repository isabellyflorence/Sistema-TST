import { Injectable, computed, signal } from '@angular/core';

import {
  AuditEntry,
  Employee,
  Epi,
  EpiMovement,
  SiccState,
  SystemSettings,
  SystemUser,
  Training,
  WorkRole
} from '../models/sicc.models';

const STORAGE_KEY = 'hospital-esperanca-sicc-v1';

@Injectable({ providedIn: 'root' })
export class SiccDataService {
  readonly state = signal<SiccState>(this.loadState());

  readonly employees = computed(() => this.state().employees);
  readonly epis = computed(() => this.state().epis);
  readonly roles = computed(() => this.state().roles);
  readonly users = computed(() => this.state().users);
  readonly movements = computed(() => this.state().movements);
  readonly trainings = computed(() => this.state().trainings);
  readonly audits = computed(() => this.state().audits);
  readonly settings = computed(() => this.state().settings);

  saveEmployee(employee: Employee): { ok: boolean; message: string } {
    const duplicateRegistration = this.employees().some(
      item => item.registration.toLowerCase() === employee.registration.trim().toLowerCase() && item.id !== employee.id
    );

    if (duplicateRegistration) {
      return { ok: false, message: 'Já existe um colaborador com esta matrícula.' };
    }

    const normalizedCpf = employee.cpf.replace(/\D/g, '');
    const duplicateCpf = this.employees().some(
      item => item.cpf.replace(/\D/g, '') === normalizedCpf && item.id !== employee.id
    );

    if (duplicateCpf) {
      return { ok: false, message: 'Já existe um colaborador com este CPF.' };
    }

    this.upsert('employees', {
      ...employee,
      registration: employee.registration.trim(),
      cpf: employee.cpf.trim(),
      email: employee.email.trim().toLowerCase(),
      phone: employee.phone.trim()
    });
    this.log('Cadastro de colaborador', `${employee.name} (${employee.registration})`);
    return { ok: true, message: 'Colaborador salvo com sucesso.' };
  }

  deleteEmployee(id: string): void {
    const employee = this.employeeById(id);
    this.remove('employees', id);
    if (employee) this.log('Exclusão de colaborador', employee.name);
  }

  saveEpi(epi: Epi): { ok: boolean; message: string } {
    const duplicate = this.epis().some(
      item => item.code.toLowerCase() === epi.code.trim().toLowerCase() && item.id !== epi.id
    );

    if (duplicate) return { ok: false, message: 'Já existe um EPI com este código.' };

    this.upsert('epis', {
      ...epi,
      code: epi.code.trim(),
      stock: Number(epi.stock),
      minStock: Number(epi.minStock)
    });
    this.log('Cadastro de EPI', `${epi.name} (${epi.code})`);
    return { ok: true, message: 'EPI salvo com sucesso.' };
  }

  deleteEpi(id: string): void {
    const epi = this.epiById(id);
    this.remove('epis', id);
    if (epi) this.log('Exclusão de EPI', epi.name);
  }

  saveRole(role: WorkRole): void {
    this.upsert('roles', role);
    this.log('Cadastro de função', role.name);
  }

  deleteRole(id: string): void {
    const role = this.roleById(id);
    this.remove('roles', id);
    if (role) this.log('Exclusão de função', role.name);
  }

  saveUser(user: SystemUser): { ok: boolean; message: string } {
    const duplicateAccess = this.users().some(
      item => (
        item.email.toLowerCase() === user.email.trim().toLowerCase()
        || item.registration.toLowerCase() === user.registration.trim().toLowerCase()
      ) && item.id !== user.id
    );
    if (duplicateAccess) return { ok: false, message: 'E-mail ou matrícula já cadastrado.' };

    const normalizedCpf = user.cpf.replace(/\D/g, '');
    const duplicateCpf = this.users().some(
      item => item.cpf.replace(/\D/g, '') === normalizedCpf && item.id !== user.id
    );
    if (duplicateCpf) return { ok: false, message: 'Já existe um usuário com este CPF.' };

    this.upsert('users', {
      ...user,
      registration: user.registration.trim(),
      cpf: user.cpf.trim(),
      email: user.email.trim().toLowerCase(),
      phone: user.phone.trim()
    });
    this.log('Cadastro de usuário', `${user.name} - ${user.profile}`);
    return { ok: true, message: 'Usuário salvo com sucesso.' };
  }

  deleteUser(id: string): void {
    const user = this.userById(id);
    this.remove('users', id);
    if (user) this.log('Exclusão de usuário', user.name);
  }

  registerMovement(movement: EpiMovement): { ok: boolean; message: string } {
    const epi = this.epiById(movement.epiId);
    if (!epi) return { ok: false, message: 'Selecione um EPI válido.' };

    const quantity = Number(movement.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, message: 'Informe uma quantidade maior que zero.' };
    }

    if (movement.type === 'Entrega') {
      const employee = movement.employeeId ? this.employeeById(movement.employeeId) : undefined;
      if (!employee) return { ok: false, message: 'Selecione um colaborador.' };
      if (this.isExpired(epi.expiry)) return { ok: false, message: 'Não é permitido entregar EPI vencido.' };
      if (!this.isEpiCompatible(employee, epi)) {
        return { ok: false, message: 'Este EPI não é compatível com a função do colaborador.' };
      }
    }

    const decreasesStock = movement.type === 'Entrega' || movement.type === 'Saída';
    const increasesStock = movement.type === 'Entrada' || movement.type === 'Devolução';

    if (decreasesStock && epi.stock < quantity) {
      return { ok: false, message: `Estoque insuficiente. Disponível: ${epi.stock}.` };
    }

    const stockDelta = increasesStock ? quantity : decreasesStock ? -quantity : 0;
    this.state.update(current => ({
      ...current,
      epis: current.epis.map(item => item.id === epi.id ? { ...item, stock: item.stock + stockDelta } : item),
      movements: [{ ...movement, quantity }, ...current.movements]
    }));
    this.persist();
    this.log(`Movimentação: ${movement.type}`, `${epi.name} - ${quantity} unidade(s)`);
    return { ok: true, message: `${movement.type} registrada com sucesso.` };
  }

  saveTraining(training: Training): void {
    this.upsert('trainings', { ...training, duration: Number(training.duration) });
    this.log('Cadastro de treinamento', training.name);
  }

  deleteTraining(id: string): void {
    const training = this.trainingById(id);
    this.remove('trainings', id);
    if (training) this.log('Exclusão de treinamento', training.name);
  }

  saveSettings(settings: SystemSettings): void {
    this.state.update(current => ({ ...current, settings }));
    this.persist();
    this.log('Atualização das configurações', 'Dados do sistema, alertas e permissões');
  }

  importState(state: SiccState): boolean {
    if (!state?.employees || !state?.epis || !state?.settings) return false;
    this.state.set(state);
    this.persist();
    this.log('Importação de backup', 'Base restaurada por arquivo JSON');
    return true;
  }

  resetDemoData(): void {
    this.state.set(this.seedState());
    this.persist();
  }

  employeeById(id: string): Employee | undefined {
    return this.employees().find(item => item.id === id);
  }

  epiById(id: string): Epi | undefined {
    return this.epis().find(item => item.id === id);
  }

  roleById(id: string): WorkRole | undefined {
    return this.roles().find(item => item.id === id);
  }

  userById(id: string): SystemUser | undefined {
    return this.users().find(item => item.id === id);
  }

  trainingById(id: string): Training | undefined {
    return this.trainings().find(item => item.id === id);
  }

  employeeName(id?: string): string {
    return id ? this.employeeById(id)?.name ?? 'Colaborador removido' : '—';
  }

  epiName(id: string): string {
    return this.epiById(id)?.name ?? 'EPI removido';
  }

  roleName(id: string): string {
    return this.roleById(id)?.name ?? 'Função não informada';
  }

  isEpiCompatible(employee: Employee, epi: Epi): boolean {
    const role = this.roleById(employee.roleId);
    return !!role?.requiredCategories.includes(epi.category);
  }

  isExpired(date: string): boolean {
    return new Date(`${date}T23:59:59`).getTime() < new Date().getTime();
  }

  daysUntil(date: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(`${date}T00:00:00`).getTime() - now.getTime()) / 86400000);
  }

  newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private upsert<K extends 'employees' | 'epis' | 'roles' | 'users' | 'trainings'>(
    key: K,
    value: SiccState[K][number]
  ): void {
    this.state.update(current => {
      const list = current[key] as Array<{ id: string }>;
      const exists = list.some(item => item.id === value.id);
      const updated = exists ? list.map(item => item.id === value.id ? value : item) : [value, ...list];
      return { ...current, [key]: updated } as SiccState;
    });
    this.persist();
  }

  private remove<K extends 'employees' | 'epis' | 'roles' | 'users' | 'movements' | 'trainings'>(key: K, id: string): void {
    this.state.update(current => ({
      ...current,
      [key]: current[key].filter(item => item.id !== id)
    }));
    this.persist();
  }

  private log(action: string, detail: string): void {
    const entry: AuditEntry = { id: this.newId('AUD'), date: new Date().toISOString(), action, detail };
    this.state.update(current => ({ ...current, audits: [entry, ...current.audits].slice(0, 200) }));
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private loadState(): SiccState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const seed = this.seedState();
      if (!saved) return seed;

      const parsed = JSON.parse(saved) as SiccState;
      const seededEmployees = new Map(seed.employees.map(employee => [employee.id, employee]));
      const seededUsers = new Map(seed.users.map(user => [user.id, user]));
      return {
        ...seed,
        ...parsed,
        employees: parsed.employees.map(employee => {
          const seededEmployee = seededEmployees.get(employee.id);
          return {
            ...seededEmployee,
            ...employee,
            cpf: employee.cpf ?? seededEmployee?.cpf ?? '',
            email: employee.email ?? seededEmployee?.email ?? '',
            phone: employee.phone ?? seededEmployee?.phone ?? ''
          };
        }),
        users: parsed.users.map(user => {
          const seededUser = seededUsers.get(user.id);
          return {
            ...seededUser,
            ...user,
            cpf: user.cpf ?? seededUser?.cpf ?? '',
            email: user.email ?? seededUser?.email ?? '',
            phone: user.phone ?? seededUser?.phone ?? ''
          };
        })
      };
    } catch {
      return this.seedState();
    }
  }

  private seedState(): SiccState {
    const roles: WorkRole[] = [
      { id: 'role-radiologia', name: 'Técnico em Radiologia', requiredCategories: ['Pés', 'Tronco', 'Proteção radiológica', 'Olhos', 'Mãos', 'Face'] },
      { id: 'role-enfermagem', name: 'Técnico em Enfermagem', requiredCategories: ['Olhos', 'Face', 'Membros superiores', 'Cabeça', 'Pés'] },
      { id: 'role-pintor', name: 'Pintor', requiredCategories: ['Pés', 'Olhos', 'Membros superiores', 'Respiratória', 'Colete'] },
      { id: 'role-asg', name: 'Auxiliar de Serviços Gerais', requiredCategories: ['Pés', 'Olhos', 'Mãos', 'Respiratória'] }
    ];

    const employees: Employee[] = [
      { id: 'emp-1', name: 'Mariana Souza', registration: 'HE-1042', cpf: '123.456.789-09', email: 'mariana.souza@hospital.com', phone: '(11) 98765-1042', roleId: 'role-enfermagem', sector: 'UTI', active: true },
      { id: 'emp-2', name: 'Carlos Almeida', registration: 'HE-0876', cpf: '111.444.777-35', email: 'carlos.almeida@hospital.com', phone: '(11) 98765-0876', roleId: 'role-radiologia', sector: 'Radiologia', active: true },
      { id: 'emp-3', name: 'Juliana Lima', registration: 'HE-1120', cpf: '529.982.247-25', email: 'juliana.lima@hospital.com', phone: '(11) 98765-1120', roleId: 'role-asg', sector: 'Centro Cirúrgico', active: true },
      { id: 'emp-4', name: 'Rafael Pereira', registration: 'HE-0988', cpf: '168.995.350-09', email: 'rafael.pereira@hospital.com', phone: '(11) 98765-0988', roleId: 'role-pintor', sector: 'Manutenção', active: true }
    ];

    const epis: Epi[] = [
      { id: 'epi-1', code: 'EPI-001', name: 'Luva de proteção', description: 'Luva de procedimento hospitalar', category: 'Mãos', size: 'M', ca: '25445', expiry: '2027-05-30', stock: 250, minStock: 80 },
      { id: 'epi-2', code: 'EPI-002', name: 'Óculos de proteção', description: 'Óculos incolor anti-impacto', category: 'Olhos', size: 'Único', ca: '98765', expiry: '2026-08-05', stock: 30, minStock: 20 },
      { id: 'epi-3', code: 'EPI-003', name: 'Protetor auricular', description: 'Protetor tipo plug de silicone', category: 'Cabeça', size: 'Único', ca: '64321', expiry: '2026-08-24', stock: 18, minStock: 20 },
      { id: 'epi-4', code: 'EPI-004', name: 'Avental plumbífero', description: 'Proteção radiológica de tronco', category: 'Proteção radiológica', size: 'G', ca: '44552', expiry: '2027-11-10', stock: 12, minStock: 5 },
      { id: 'epi-5', code: 'EPI-005', name: 'Máscara PFF2', description: 'Proteção respiratória descartável', category: 'Respiratória', size: 'Único', ca: '77661', expiry: '2026-12-15', stock: 145, minStock: 60 },
      { id: 'epi-6', code: 'EPI-006', name: 'Sapato de segurança', description: 'Calçado fechado antiderrapante', category: 'Pés', size: 'Variado', ca: '11882', expiry: '2028-01-20', stock: 48, minStock: 20 }
    ];

    const users: SystemUser[] = [
      { id: 'usr-admin', name: 'Juliana Silva', cpf: '390.533.447-05', email: 'admin@hospital.com', phone: '(11) 98888-0001', registration: 'ADM001', password: 'admin123', profile: 'Administrador', active: true },
      { id: 'usr-rh', name: 'Roberta Martins', cpf: '935.411.347-80', email: 'rh@hospital.com', phone: '(11) 98888-0002', registration: 'RH001', password: 'rh123', profile: 'RH', active: true },
      { id: 'usr-seguranca', name: 'João Santos', cpf: '012.345.678-90', email: 'seguranca@hospital.com', phone: '(11) 98888-0003', registration: 'TST001', password: 'sicc123', profile: 'Técnico de Segurança do Trabalho', active: true }
    ];

    const movements: EpiMovement[] = [
      { id: 'mov-1', type: 'Entrega', employeeId: 'emp-1', epiId: 'epi-1', quantity: 2, date: '2026-07-15T09:42', reason: 'Entrega periódica', signature: 'Mariana Souza' },
      { id: 'mov-2', type: 'Troca', employeeId: 'emp-2', epiId: 'epi-4', quantity: 1, date: '2026-07-15T08:18', reason: 'Desgaste', signature: 'Carlos Almeida' },
      { id: 'mov-3', type: 'Entrega', employeeId: 'emp-3', epiId: 'epi-5', quantity: 3, date: '2026-07-14T16:35', reason: 'Entrega inicial', signature: 'Juliana Lima' },
      { id: 'mov-4', type: 'Devolução', employeeId: 'emp-4', epiId: 'epi-2', quantity: 1, date: '2026-07-14T14:10', reason: 'Fim da atividade', signature: 'Rafael Pereira' }
    ];

    const trainings: Training[] = [
      { id: 'tre-1', name: 'NR 06 - Uso de EPI', type: 'NR 06', date: '2026-07-20', validUntil: '2027-07-20', duration: 4, participants: ['emp-1', 'emp-2'], status: 'Agendado' },
      { id: 'tre-2', name: 'Uso correto de proteção respiratória', type: 'EPI', date: '2026-06-10', validUntil: '2027-06-10', duration: 2, participants: ['emp-3', 'emp-4'], status: 'Concluído' }
    ];

    const settings: SystemSettings = {
      hospitalName: 'Hospital Esperança',
      systemName: 'SICC - Sistema Interno de Cadastro e Controle',
      alertDays: 30,
      stockAlertEnabled: true,
      expiryAlertEnabled: true,
      permissions: {
        'Administrador': ['dashboard', 'cadastros', 'gestao-epis', 'estoque', 'treinamentos', 'relatorios', 'configuracoes'],
        'RH': ['dashboard', 'cadastros', 'treinamentos', 'relatorios'],
        'Técnico de Segurança do Trabalho': ['dashboard', 'gestao-epis', 'estoque', 'treinamentos', 'relatorios']
      }
    };

    return { employees, epis, roles, users, movements, trainings, audits: [], settings };
  }
}
