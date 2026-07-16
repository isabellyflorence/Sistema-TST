import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccessProfile, Employee, Epi, SystemUser, WorkRole } from '../../core/models/sicc.models';
import { SiccDataService } from '../../core/services/sicc-data.service';

type RegisterTab = 'colaboradores' | 'epis' | 'funcoes' | 'usuarios';

@Component({
  selector: 'app-cadastros',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cadastros.component.html'
})
export class CadastrosComponent {
  readonly data = inject(SiccDataService);
  readonly categories = ['Pés', 'Tronco', 'Proteção radiológica', 'Olhos', 'Mãos', 'Face', 'Membros superiores', 'Cabeça', 'Respiratória', 'Colete'];
  readonly profiles: AccessProfile[] = ['Administrador', 'RH', 'Técnico de Segurança do Trabalho'];

  activeTab: RegisterTab = 'colaboradores';
  search = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  employeeForm = this.emptyEmployee();
  epiForm = this.emptyEpi();
  roleForm = this.emptyRole();
  roleCategories = new Set<string>();
  userForm = this.emptyUser();

  get filteredEmployees(): Employee[] {
    const term = this.search.toLowerCase().trim();
    return this.data.employees().filter(item =>
      !term || `${item.name} ${item.registration} ${item.cpf} ${item.email} ${item.phone} ${item.sector} ${this.data.roleName(item.roleId)}`.toLowerCase().includes(term)
    );
  }

  get filteredEpis(): Epi[] {
    const term = this.search.toLowerCase().trim();
    return this.data.epis().filter(item => !term || `${item.code} ${item.name} ${item.category} ${item.ca}`.toLowerCase().includes(term));
  }

  get filteredRoles(): WorkRole[] {
    const term = this.search.toLowerCase().trim();
    return this.data.roles().filter(item => !term || `${item.name} ${item.requiredCategories.join(' ')}`.toLowerCase().includes(term));
  }

  get filteredUsers(): SystemUser[] {
    const term = this.search.toLowerCase().trim();
    return this.data.users().filter(item =>
      !term || `${item.name} ${item.cpf} ${item.email} ${item.phone} ${item.registration} ${item.profile}`.toLowerCase().includes(term)
    );
  }

  setTab(tab: RegisterTab): void {
    this.activeTab = tab;
    this.search = '';
    this.clearMessage();
  }

  saveEmployee(): void {
    const form = this.employeeForm;
    if (!form.name.trim() || !form.registration.trim() || !form.cpf.trim() || !form.email.trim() || !form.phone.trim() || !form.roleId) {
      this.showMessage('Preencha nome, matrícula, CPF, e-mail, celular e função.', 'error');
      return;
    }
    if (!this.isValidCpf(form.cpf)) {
      this.showMessage('Informe um CPF válido.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      this.showMessage('Informe um endereço de e-mail válido.', 'error');
      return;
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      this.showMessage('Informe um celular com DDD.', 'error');
      return;
    }
    const result = this.data.saveEmployee({ ...form });
    this.showMessage(result.message, result.ok ? 'success' : 'error');
    if (result.ok) this.employeeForm = this.emptyEmployee();
  }

  editEmployee(employee: Employee): void {
    this.employeeForm = { ...this.emptyEmployee(), ...employee };
    this.scrollToForm();
  }

  formatCpf(value: string): string {
    return value.replace(/\D/g, '').slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  deleteEmployee(employee: Employee): void {
    if (confirm(`Excluir o colaborador ${employee.name}?`)) this.data.deleteEmployee(employee.id);
  }

  saveEpi(): void {
    const form = this.epiForm;
    if (!form.name.trim() || !form.code.trim() || !form.description.trim() || !form.size.trim() || !form.ca.trim() || !form.expiry || !form.category) {
      this.showMessage('Preencha todos os campos obrigatórios do EPI.', 'error');
      return;
    }
    const result = this.data.saveEpi({ ...form });
    this.showMessage(result.message, result.ok ? 'success' : 'error');
    if (result.ok) this.epiForm = this.emptyEpi();
  }

  editEpi(epi: Epi): void {
    this.epiForm = { ...epi };
    this.scrollToForm();
  }

  deleteEpi(epi: Epi): void {
    if (confirm(`Excluir o EPI ${epi.name}?`)) this.data.deleteEpi(epi.id);
  }

  toggleRoleCategory(category: string, checked: boolean): void {
    checked ? this.roleCategories.add(category) : this.roleCategories.delete(category);
  }

  saveRole(): void {
    if (!this.roleForm.name.trim() || this.roleCategories.size === 0) {
      this.showMessage('Informe a função e ao menos uma categoria obrigatória.', 'error');
      return;
    }
    this.data.saveRole({ ...this.roleForm, requiredCategories: [...this.roleCategories] });
    this.showMessage('Função salva com sucesso.', 'success');
    this.roleForm = this.emptyRole();
    this.roleCategories.clear();
  }

  editRole(role: WorkRole): void {
    this.roleForm = { ...role, requiredCategories: [...role.requiredCategories] };
    this.roleCategories = new Set(role.requiredCategories);
    this.scrollToForm();
  }

  deleteRole(role: WorkRole): void {
    if (this.data.employees().some(employee => employee.roleId === role.id)) {
      this.showMessage('Não é possível excluir uma função vinculada a colaboradores.', 'error');
      return;
    }
    if (confirm(`Excluir a função ${role.name}?`)) this.data.deleteRole(role.id);
  }

  saveUser(): void {
    const form = this.userForm;
    if (!form.name.trim() || !form.cpf.trim() || !form.email.trim() || !form.phone.trim() || !form.registration.trim() || !form.password.trim()) {
      this.showMessage('Preencha nome, CPF, e-mail, celular, matrícula e senha.', 'error');
      return;
    }
    if (!this.isValidCpf(form.cpf)) {
      this.showMessage('Informe um CPF válido para o usuário.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      this.showMessage('Informe um endereço de e-mail válido para o usuário.', 'error');
      return;
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      this.showMessage('Informe um celular com DDD para o usuário.', 'error');
      return;
    }
    const result = this.data.saveUser({ ...form });
    this.showMessage(result.message, result.ok ? 'success' : 'error');
    if (result.ok) this.userForm = this.emptyUser();
  }

  editUser(user: SystemUser): void {
    this.userForm = { ...this.emptyUser(), ...user };
    this.scrollToForm();
  }

  deleteUser(user: SystemUser): void {
    if (user.id === 'usr-admin') {
      this.showMessage('O administrador principal não pode ser excluído.', 'error');
      return;
    }
    if (confirm(`Excluir o usuário ${user.name}?`)) this.data.deleteUser(user.id);
  }

  cancelEdit(): void {
    this.employeeForm = this.emptyEmployee();
    this.epiForm = this.emptyEpi();
    this.roleForm = this.emptyRole();
    this.roleCategories.clear();
    this.userForm = this.emptyUser();
  }

  private emptyEmployee(): Employee {
    return { id: this.data?.newId('COL') ?? '', name: '', registration: '', cpf: '', email: '', phone: '', roleId: '', sector: '', active: true };
  }

  private emptyEpi(): Epi {
    return { id: this.data?.newId('EPI') ?? '', code: '', name: '', description: '', category: '', size: '', ca: '', expiry: '', stock: 0, minStock: 0 };
  }

  private emptyRole(): WorkRole {
    return { id: this.data?.newId('FUN') ?? '', name: '', requiredCategories: [] };
  }

  private emptyUser(): SystemUser {
    return { id: this.data?.newId('USR') ?? '', name: '', cpf: '', email: '', phone: '', registration: '', password: '', profile: 'RH', active: true };
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }

  private clearMessage(): void {
    this.message = '';
  }

  private scrollToForm(): void {
    setTimeout(() => document.querySelector('.record-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  private isValidCpf(value: string): boolean {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (length: number): number => {
      const sum = cpf.slice(0, length).split('').reduce(
        (total, digit, index) => total + Number(digit) * (length + 1 - index),
        0
      );
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
  }
}
