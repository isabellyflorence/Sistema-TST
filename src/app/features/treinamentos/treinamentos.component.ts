import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Training, TrainingStatus } from '../../core/models/sicc.models';
import { SiccDataService } from '../../core/services/sicc-data.service';

@Component({
  selector: 'app-treinamentos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './treinamentos.component.html'
})
export class TreinamentosComponent {
  readonly data = inject(SiccDataService);
  readonly statuses: TrainingStatus[] = ['Agendado', 'Concluído', 'Cancelado'];

  trainingForm = this.emptyTraining();
  selectedParticipants = new Set<string>();
  search = '';
  statusFilter = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  get filteredTrainings(): Training[] {
    const term = this.search.toLowerCase().trim();
    return this.data.trainings().filter(item => {
      const expired = this.isTrainingExpired(item);
      const matchesStatus = !this.statusFilter || item.status === this.statusFilter || (this.statusFilter === 'Vencido' && expired);
      return matchesStatus && (!term || `${item.name} ${item.type} ${item.participants.map(id => this.data.employeeName(id)).join(' ')}`.toLowerCase().includes(term));
    });
  }

  get upcomingCount(): number {
    return this.data.trainings().filter(item => item.status === 'Agendado').length;
  }

  get completedCount(): number {
    return this.data.trainings().filter(item => item.status === 'Concluído').length;
  }

  get expiredCount(): number {
    return this.data.trainings().filter(item => this.isTrainingExpired(item)).length;
  }

  toggleParticipant(id: string, checked: boolean): void {
    checked ? this.selectedParticipants.add(id) : this.selectedParticipants.delete(id);
  }

  save(): void {
    if (!this.trainingForm.name.trim() || !this.trainingForm.type.trim() || !this.trainingForm.date || !this.trainingForm.validUntil) {
      this.showMessage('Preencha nome, tipo, data e validade.', 'error');
      return;
    }
    if (this.selectedParticipants.size === 0) {
      this.showMessage('Selecione ao menos um participante.', 'error');
      return;
    }
    this.data.saveTraining({ ...this.trainingForm, participants: [...this.selectedParticipants] });
    this.showMessage('Treinamento salvo com sucesso.', 'success');
    this.resetForm();
  }

  edit(training: Training): void {
    this.trainingForm = { ...training, participants: [...training.participants] };
    this.selectedParticipants = new Set(training.participants);
    setTimeout(() => document.querySelector('.record-form')?.scrollIntoView({ behavior: 'smooth' }));
  }

  remove(training: Training): void {
    if (confirm(`Excluir o treinamento ${training.name}?`)) this.data.deleteTraining(training.id);
  }

  resetForm(): void {
    this.trainingForm = this.emptyTraining();
    this.selectedParticipants.clear();
  }

  conclude(training: Training): void {
    this.data.saveTraining({ ...training, status: 'Concluído' });
    this.showMessage('Treinamento marcado como concluído.', 'success');
  }

  isTrainingExpired(training: Training): boolean {
    return training.status === 'Concluído' && this.data.isExpired(training.validUntil);
  }

  issueCertificate(training: Training, participantId: string): void {
    const employee = this.data.employeeById(participantId);
    if (!employee) return;
    const popup = window.open('', '_blank', 'width=900,height=650');
    if (!popup) {
      this.showMessage('Permita pop-ups para emitir o certificado.', 'error');
      return;
    }
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado</title><style>body{font-family:Arial;color:#123f68;padding:45px}.certificate{border:10px double #184f72;padding:70px;text-align:center}h1{font-size:42px;margin:0 0 45px}h2{font-size:30px}p{font-size:18px;line-height:1.8}.signatures{display:flex;justify-content:space-around;margin-top:70px}.signatures div{border-top:1px solid #184f72;padding-top:8px;width:240px}@media print{body{padding:0}}</style></head><body><div class="certificate"><h1>Hospital Esperança</h1><p>Certificamos que</p><h2>${this.escapeHtml(employee.name)}</h2><p>concluiu o treinamento <strong>${this.escapeHtml(training.name)}</strong>, com carga horária de ${training.duration} hora(s), realizado em ${this.formatDate(training.date)}.</p><div class="signatures"><div>Responsável técnico</div><div>Participante</div></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`));
  }

  private emptyTraining(): Training {
    return { id: this.data?.newId('TRE') ?? '', name: '', type: '', date: '', validUntil: '', duration: 1, participants: [], status: 'Agendado' };
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }
}
