import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SiccDataService } from '../../core/services/sicc-data.service';

interface ReportOption { id: string; label: string; description: string; icon: string; }
interface ReportRow { [key: string]: string | number; }

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './relatorios.component.html'
})
export class RelatoriosComponent {
  readonly data = inject(SiccDataService);
  readonly options: ReportOption[] = [
    { id: 'recebimento', label: 'Recebimento', description: 'Entradas e quantidades recebidas', icon: 'bi-box-arrow-in-down' },
    { id: 'entrega', label: 'Entrega e consumo', description: 'Distribuição por colaborador e setor', icon: 'bi-person-check' },
    { id: 'validade', label: 'Validade', description: 'Vencidos e próximos do vencimento', icon: 'bi-calendar2-x' },
    { id: 'estoque', label: 'Estoque', description: 'Saldos, mínimos e itens críticos', icon: 'bi-boxes' },
    { id: 'conformidade', label: 'Conformidade', description: 'Colaboradores sem EPI obrigatório', icon: 'bi-shield-check' },
    { id: 'treinamento', label: 'Treinamentos', description: 'Participação, validade e conclusão', icon: 'bi-mortarboard' },
    { id: 'auditoria', label: 'Auditoria', description: 'Registro das operações do sistema', icon: 'bi-journal-text' }
  ];

  reportType = 'entrega';
  startDate = '';
  endDate = '';
  search = '';

  get selectedOption(): ReportOption {
    return this.options.find(option => option.id === this.reportType) ?? this.options[0];
  }

  get rows(): ReportRow[] {
    const data = this.buildRows().filter(row => !this.search || Object.values(row).join(' ').toLowerCase().includes(this.search.toLowerCase()));
    return data;
  }

  get columns(): string[] {
    return this.rows[0] ? Object.keys(this.rows[0]) : [];
  }

  setReport(id: string): void {
    this.reportType = id;
    this.search = '';
  }

  exportExcel(): void {
    if (!this.rows.length) return;
    const header = this.columns.map(column => `<th>${this.escapeHtml(column)}</th>`).join('');
    const body = this.rows.map(row => `<tr>${this.columns.map(column => `<td>${this.escapeHtml(String(row[column] ?? ''))}</td>`).join('')}</tr>`).join('');
    const html = `<html><head><meta charset="utf-8"></head><body><h2>${this.escapeHtml(this.selectedOption.label)}</h2><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    this.download(new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' }), `relatorio-${this.reportType}.xls`);
  }

  exportPdf(): void {
    if (!this.rows.length) return;
    const popup = window.open('', '_blank', 'width=1100,height=750');
    if (!popup) return;
    const header = this.columns.map(column => `<th>${this.escapeHtml(column)}</th>`).join('');
    const body = this.rows.map(row => `<tr>${this.columns.map(column => `<td>${this.escapeHtml(String(row[column] ?? ''))}</td>`).join('')}</tr>`).join('');
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório - ${this.escapeHtml(this.selectedOption.label)}</title><style>body{font-family:Arial;color:#173b5a;padding:32px}h1{margin-bottom:5px}p{color:#687280}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:11px}th,td{border:1px solid #dbe4ee;padding:8px;text-align:left}th{background:#184f72;color:#fff}@media print{body{padding:0}}</style></head><body><h1>Hospital Esperança</h1><p>${this.escapeHtml(this.selectedOption.label)} · gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  private buildRows(): ReportRow[] {
    switch (this.reportType) {
      case 'recebimento':
        return this.data.movements().filter(item => item.type === 'Entrada' && this.inPeriod(item.date)).map(item => ({ Data: this.formatDate(item.date), EPI: this.data.epiName(item.epiId), Quantidade: item.quantity, Origem: item.reason || 'Não informada' }));
      case 'entrega':
        return this.data.movements().filter(item => ['Entrega', 'Devolução', 'Troca'].includes(item.type) && this.inPeriod(item.date)).map(item => {
          const employee = item.employeeId ? this.data.employeeById(item.employeeId) : undefined;
          const epi = this.data.epiById(item.epiId);
          return { Data: this.formatDate(item.date), Operação: item.type, Colaborador: employee?.name ?? '—', CPF: employee?.cpf ?? '—', 'E-mail': employee?.email ?? '—', Celular: employee?.phone ?? '—', Matrícula: employee?.registration ?? '—', Função: employee ? this.data.roleName(employee.roleId) : '—', Setor: employee?.sector ?? '—', EPI: epi?.name ?? '—', Quantidade: item.quantity, Validade: epi?.expiry ?? '—', Assinatura: item.signature || '—' };
        });
      case 'validade':
        return this.data.epis().map(epi => ({ Código: epi.code, EPI: epi.name, CA: epi.ca, Validade: epi.expiry, 'Dias restantes': this.data.daysUntil(epi.expiry), Situação: this.data.isExpired(epi.expiry) ? 'Vencido' : this.data.daysUntil(epi.expiry) <= this.data.settings().alertDays ? 'Próximo do vencimento' : 'Regular', Estoque: epi.stock }));
      case 'estoque':
        return this.data.epis().map(epi => ({ Código: epi.code, EPI: epi.name, Categoria: epi.category, Estoque: epi.stock, Mínimo: epi.minStock, Situação: epi.stock <= epi.minStock ? 'Crítico' : 'Regular', Validade: epi.expiry }));
      case 'conformidade':
        return this.data.employees().map(employee => {
          const role = this.data.roleById(employee.roleId);
          const delivered = this.data.movements().filter(item => item.employeeId === employee.id && item.type === 'Entrega').map(item => this.data.epiById(item.epiId)?.category).filter((category): category is string => !!category);
          const missing = role?.requiredCategories.filter(category => !delivered.includes(category)) ?? [];
          return { Colaborador: employee.name, CPF: employee.cpf || '—', 'E-mail': employee.email || '—', Celular: employee.phone || '—', Matrícula: employee.registration, Função: role?.name ?? '—', Setor: employee.sector, 'EPIs pendentes': missing.join(', ') || 'Nenhum', Conformidade: missing.length ? 'Pendente' : 'Conforme' };
        });
      case 'treinamento':
        return this.data.trainings().filter(training => this.inPeriod(training.date)).flatMap(training => training.participants.map(participant => ({ Treinamento: training.name, Tipo: training.type, Data: this.formatDate(training.date), 'Válido até': this.formatDate(training.validUntil, false), Colaborador: this.data.employeeName(participant), Status: this.data.isExpired(training.validUntil) ? 'Vencido' : training.status, 'Carga horária': `${training.duration}h` })));
      case 'auditoria':
        return this.data.audits().filter(item => this.inPeriod(item.date)).map(item => ({ Data: this.formatDate(item.date), Ação: item.action, Detalhe: item.detail }));
      default:
        return [];
    }
  }

  private inPeriod(date: string): boolean {
    const value = date.slice(0, 10);
    return (!this.startDate || value >= this.startDate) && (!this.endDate || value <= this.endDate);
  }

  private formatDate(date: string, includeTime = true): string {
    const value = date.includes('T') ? new Date(date) : new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', includeTime && date.includes('T') ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(value);
  }

  private download(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }
}
