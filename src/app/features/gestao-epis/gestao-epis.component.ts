import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Epi, EpiMovement, MovementType } from '../../core/models/sicc.models';
import { SiccDataService } from '../../core/services/sicc-data.service';

@Component({
  selector: 'app-gestao-epis',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gestao-epis.component.html'
})
export class GestaoEpisComponent {
  readonly data = inject(SiccDataService);
  readonly operationTypes: MovementType[] = ['Entrega', 'Devolução', 'Troca'];

  movement = this.emptyMovement();
  message = '';
  messageType: 'success' | 'error' = 'success';
  historySearch = '';
  historyType = '';

  get selectedEmployee() {
    return this.movement.employeeId ? this.data.employeeById(this.movement.employeeId) : undefined;
  }

  get availableEpis(): Epi[] {
    const employee = this.selectedEmployee;
    if (!employee || this.movement.type !== 'Entrega') return this.data.epis();
    return this.data.epis().filter(epi => this.data.isEpiCompatible(employee, epi));
  }

  get requiredCategories(): string[] {
    const employee = this.selectedEmployee;
    return employee ? this.data.roleById(employee.roleId)?.requiredCategories ?? [] : [];
  }

  get history(): EpiMovement[] {
    const term = this.historySearch.toLowerCase().trim();
    return this.data.movements().filter(item => {
      const searchable = `${item.type} ${this.data.employeeName(item.employeeId)} ${this.data.epiName(item.epiId)} ${item.reason}`.toLowerCase();
      return (!this.historyType || item.type === this.historyType) && (!term || searchable.includes(term));
    });
  }

  register(): void {
    if (!this.movement.employeeId || !this.movement.epiId || !this.movement.date) {
      this.showMessage('Selecione colaborador, EPI e data.', 'error');
      return;
    }
    if (this.movement.type === 'Entrega' && !this.movement.signature.trim()) {
      this.showMessage('Registre a assinatura ou nome de quem recebeu o EPI.', 'error');
      return;
    }

    const result = this.data.registerMovement({ ...this.movement });
    this.showMessage(result.message, result.ok ? 'success' : 'error');
    if (result.ok) this.movement = this.emptyMovement();
  }

  resetMovement(): void {
    this.movement = this.emptyMovement();
  }

  onEmployeeChange(): void {
    if (this.movement.epiId && !this.availableEpis.some(epi => epi.id === this.movement.epiId)) {
      this.movement.epiId = '';
    }
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
  }

  private emptyMovement(): EpiMovement {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return {
      id: this.data?.newId('MOV') ?? '',
      type: 'Entrega',
      employeeId: '',
      epiId: '',
      quantity: 1,
      date: now.toISOString().slice(0, 16),
      reason: '',
      signature: ''
    };
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
