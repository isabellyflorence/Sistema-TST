import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ModulePermission } from '../../models/sicc.models';
import { AuthService } from '../../services/auth.service';
import { SiccDataService } from '../../services/sicc-data.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  permission: ModulePermission;
}

interface SearchResult { label: string; detail: string; icon: string; route: string; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  readonly data = inject(SiccDataService);
  private readonly router = inject(Router);

  menuAberto = false;
  notificationsOpen = false;
  profileOpen = false;
  searchTerm = '';

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-grid-1x2-fill',
      route: '/dashboard',
      permission: 'dashboard'
    },
    {
      label: 'Cadastros',
      icon: 'bi-clipboard2-data-fill',
      route: '/cadastros',
      permission: 'cadastros'
    },
    {
      label: 'Gestão de EPIs',
      icon: 'bi-shield-check',
      route: '/gestao-epis',
      permission: 'gestao-epis'
    },
    {
      label: 'Estoque',
      icon: 'bi-boxes',
      route: '/estoque',
      permission: 'estoque'
    },
    {
      label: 'Treinamentos',
      icon: 'bi-mortarboard-fill',
      route: '/treinamentos',
      permission: 'treinamentos'
    },
    {
      label: 'Relatórios',
      icon: 'bi-bar-chart-line-fill',
      route: '/relatorios',
      permission: 'relatorios'
    },
    {
      label: 'Configurações',
      icon: 'bi-gear-fill',
      route: '/configuracoes',
      permission: 'configuracoes'
    }
  ];

  get visibleMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => this.auth.canAccess(item.permission));
  }

  get searchResults(): SearchResult[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (term.length < 2) return [];
    return [
      ...this.data.employees().filter(item => `${item.name} ${item.registration}`.toLowerCase().includes(term)).map(item => ({ label: item.name, detail: `Colaborador · ${item.registration}`, icon: 'bi-person', route: '/cadastros' })),
      ...this.data.epis().filter(item => `${item.name} ${item.code}`.toLowerCase().includes(term)).map(item => ({ label: item.name, detail: `EPI · estoque ${item.stock}`, icon: 'bi-shield-check', route: '/estoque' })),
      ...this.data.trainings().filter(item => item.name.toLowerCase().includes(term)).map(item => ({ label: item.name, detail: `Treinamento · ${item.status}`, icon: 'bi-mortarboard', route: '/treinamentos' }))
    ].slice(0, 7);
  }

  get notifications(): SearchResult[] {
    const stock = this.data.epis().filter(epi => epi.stock <= epi.minStock).map(epi => ({ label: `${epi.name} com estoque crítico`, detail: `${epi.stock} unidade(s), mínimo ${epi.minStock}`, icon: 'bi-boxes', route: '/estoque' }));
    const expiry = this.data.epis().filter(epi => this.data.daysUntil(epi.expiry) <= this.data.settings().alertDays).map(epi => ({ label: `${epi.name} em alerta de validade`, detail: `${this.data.daysUntil(epi.expiry)} dia(s) restantes`, icon: 'bi-calendar2-exclamation', route: '/estoque' }));
    return [...stock, ...expiry].slice(0, 8);
  }

  get initials(): string {
    return (this.auth.currentUser()?.name ?? 'Usuário').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  alternarMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }

  navigateTo(result: SearchResult): void {
    this.searchTerm = '';
    this.notificationsOpen = false;
    this.router.navigate([result.route]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
