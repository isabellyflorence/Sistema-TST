import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EpiMovement } from '../../core/models/sicc.models';
import { SiccDataService } from '../../core/services/sicc-data.service';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './estoque.component.html'
})
export class EstoqueComponent {
  readonly data = inject(SiccDataService);
  movement = this.emptyMovement();
  search = '';
  statusFilter = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  get totalItems(): number {
    return this.data.epis().reduce((total, epi) => total + epi.stock, 0);
  }

  get lowStockCount(): number {
    return this.data.epis().filter(epi => epi.stock <= epi.minStock).length;
  }

  get expiringCount(): number {
    return this.data.epis().filter(epi => this.data.daysUntil(epi.expiry) <= this.data.settings().alertDays).length;
  }

  get filteredEpis() {
    const term = this.search.toLowerCase().trim();
    return this.data.epis().filter(epi => {
      const matchesStatus = !this.statusFilter ||
        (this.statusFilter === 'critico' && epi.stock <= epi.minStock) ||
        (this.statusFilter === 'vencendo' && this.data.daysUntil(epi.expiry) <= this.data.settings().alertDays) ||
        (this.statusFilter === 'regular' && epi.stock > epi.minStock && this.data.daysUntil(epi.expiry) > this.data.settings().alertDays);
      return matchesStatus && (!term || `${epi.name} ${epi.code} ${epi.category}`.toLowerCase().includes(term));
    });
  }

  get stockMovements(): EpiMovement[] {
    return this.data.movements().filter(item => item.type === 'Entrada' || item.type === 'Saída').slice(0, 12);
  }

  register(): void {
    if (!this.movement.epiId || !this.movement.date) {
      this.showMessage('Selecione o EPI e informe a data.', 'error');
      return;
    }
    const result = this.data.registerMovement({ ...this.movement });
    this.showMessage(result.message, result.ok ? 'success' : 'error');
    if (result.ok) this.movement = this.emptyMovement();
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
  }

  stockPercent(stock: number, minStock: number): number {
    return minStock ? Math.min(100, (stock / (minStock * 2)) * 100) : 100;
  }

  private emptyMovement(): EpiMovement {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return { id: this.data?.newId('MOV') ?? '', type: 'Entrada', epiId: '', quantity: 1, date: now.toISOString().slice(0, 16), reason: '', signature: '' };
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
