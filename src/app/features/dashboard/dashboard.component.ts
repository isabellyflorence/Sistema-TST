import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiccDataService } from '../../core/services/sicc-data.service';
import { AuthService } from '../../core/services/auth.service';

interface Indicator {
  title: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
}

interface Movement {
  collaborator: string;
  initials: string;
  role: string;
  epi: string;
  date: string;
  status: 'Entregue' | 'Devolvido' | 'Troca';
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly data = inject(SiccDataService);
  readonly auth = inject(AuthService);

  get indicators(): Indicator[] {
    const delivered = this.data.movements().filter(item => item.type === 'Entrega').reduce((total, item) => total + item.quantity, 0);
    const expired = this.data.epis().filter(epi => this.data.isExpired(epi.expiry)).length;
    const compliance = this.calculateCompliance();
    return [
      { title: 'EPIs entregues', value: String(delivered), detail: 'entregas registradas', icon: 'bi-shield-check', color: 'blue' },
      { title: 'Itens vencidos', value: String(expired), detail: 'bloqueados para entrega', icon: 'bi-calendar2-x', color: 'red' },
      { title: 'Colaboradores', value: String(this.data.employees().length), detail: 'pessoas cadastradas', icon: 'bi-people', color: 'green' },
      { title: 'Conformidade', value: `${compliance}%`, detail: 'categorias obrigatórias atendidas', icon: 'bi-patch-check', color: 'yellow' }
    ];
  }

  get movements(): Movement[] {
    return this.data.movements()
      .filter(item => ['Entrega', 'Devolução', 'Troca'].includes(item.type))
      .slice(0, 5)
      .map(item => {
        const employee = item.employeeId ? this.data.employeeById(item.employeeId) : undefined;
        const status: Movement['status'] = item.type === 'Entrega' ? 'Entregue' : item.type === 'Devolução' ? 'Devolvido' : 'Troca';
        return {
          collaborator: employee?.name ?? 'Colaborador removido',
          initials: (employee?.name ?? 'CR').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase(),
          role: employee ? this.data.roleName(employee.roleId) : '—',
          epi: this.data.epiName(item.epiId),
          date: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date)),
          status
        };
      });
  }

  get expiringItems() {
    return this.data.epis()
      .filter(epi => this.data.daysUntil(epi.expiry) <= this.data.settings().alertDays)
      .sort((a, b) => this.data.daysUntil(a.expiry) - this.data.daysUntil(b.expiry))
      .slice(0, 4)
      .map(epi => ({ name: epi.name, days: this.data.daysUntil(epi.expiry) < 0 ? 'Vencido' : `${this.data.daysUntil(epi.expiry)} dias`, color: this.data.daysUntil(epi.expiry) <= 10 ? 'red' : 'yellow' }));
  }

  get chartPoints(): ChartPoint[] {
    const today = new Date();
    const months = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (6 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const value = this.data.movements()
        .filter(item => item.type === 'Entrega' && item.date.startsWith(key))
        .reduce((total, item) => total + item.quantity, 0);
      return { label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''), value };
    });
    const max = Math.max(5, ...months.map(item => item.value));
    return months.map((item, index) => ({
      ...item,
      x: 10 + index * (680 / 6),
      y: 200 - (item.value / max) * 180
    }));
  }

  get chartPolyline(): string {
    return this.chartPoints.map(point => `${point.x},${point.y}`).join(' ');
  }

  get chartArea(): string {
    const points = this.chartPoints;
    return `M${points.map(point => `${point.x},${point.y}`).join(' L')} L690,220 L10,220 Z`;
  }

  get chartYLabels(): number[] {
    const max = Math.max(5, ...this.chartPoints.map(point => point.value));
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  }

  exportDashboard(): void {
    window.print();
  }

  private calculateCompliance(): number {
    if (!this.data.employees().length) return 100;
    const compliant = this.data.employees().filter(employee => {
      const role = this.data.roleById(employee.roleId);
      const delivered = this.data.movements().filter(item => item.employeeId === employee.id && item.type === 'Entrega').map(item => this.data.epiById(item.epiId)?.category);
      return !!role && role.requiredCategories.every(category => delivered.includes(category));
    }).length;
    return Math.round((compliant / this.data.employees().length) * 100);
  }
}
