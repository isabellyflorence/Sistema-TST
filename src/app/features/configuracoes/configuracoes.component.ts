import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccessProfile, ModulePermission, SiccState, SystemSettings } from '../../core/models/sicc.models';
import { SiccDataService } from '../../core/services/sicc-data.service';

interface ModuleOption { id: ModulePermission; label: string; }

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracoes.component.html'
})
export class ConfiguracoesComponent {
  readonly data = inject(SiccDataService);
  readonly profiles: AccessProfile[] = ['Administrador', 'RH', 'Técnico de Segurança do Trabalho'];
  readonly modules: ModuleOption[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'cadastros', label: 'Cadastros' },
    { id: 'gestao-epis', label: 'Gestão de EPIs' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'treinamentos', label: 'Treinamentos' },
    { id: 'relatorios', label: 'Relatórios' },
    { id: 'configuracoes', label: 'Configurações' }
  ];

  settings = this.copySettings();
  activeProfile: AccessProfile = 'Administrador';
  message = '';
  messageType: 'success' | 'error' = 'success';

  save(): void {
    if (!this.settings.hospitalName.trim() || !this.settings.systemName.trim() || this.settings.alertDays < 1) {
      this.showMessage('Preencha os dados do sistema e informe um prazo de alerta válido.', 'error');
      return;
    }
    this.data.saveSettings(this.settings);
    this.settings = this.copySettings();
    this.showMessage('Configurações salvas com sucesso.', 'success');
  }

  hasPermission(permission: ModulePermission): boolean {
    return this.settings.permissions[this.activeProfile].includes(permission);
  }

  togglePermission(permission: ModulePermission, checked: boolean): void {
    if (this.activeProfile === 'Administrador') return;
    const current = this.settings.permissions[this.activeProfile];
    this.settings.permissions[this.activeProfile] = checked
      ? [...new Set([...current, permission])]
      : current.filter(item => item !== permission);
  }

  exportBackup(): void {
    const blob = new Blob([JSON.stringify(this.data.state(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup-sicc-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  importBackup(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const success = this.data.importState(JSON.parse(String(reader.result)) as SiccState);
        this.settings = this.copySettings();
        this.showMessage(success ? 'Backup importado com sucesso.' : 'Arquivo de backup inválido.', success ? 'success' : 'error');
      } catch {
        this.showMessage('Não foi possível ler o arquivo de backup.', 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  resetData(): void {
    if (!confirm('Restaurar os dados de demonstração? Todos os registros atuais serão substituídos.')) return;
    this.data.resetDemoData();
    this.settings = this.copySettings();
    this.showMessage('Dados de demonstração restaurados.', 'success');
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(date));
  }

  private copySettings(): SystemSettings {
    const settings = this.data?.settings();
    return settings
      ? { ...settings, permissions: {
          Administrador: [...settings.permissions.Administrador],
          RH: [...settings.permissions.RH],
          'Técnico de Segurança do Trabalho': [...settings.permissions['Técnico de Segurança do Trabalho']]
        } }
      : { hospitalName: '', systemName: '', alertDays: 30, stockAlertEnabled: true, expiryAlertEnabled: true, permissions: { Administrador: [], RH: [], 'Técnico de Segurança do Trabalho': [] } };
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
