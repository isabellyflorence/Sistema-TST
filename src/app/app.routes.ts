import { Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login.component';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CadastrosComponent } from './features/cadastros/cadastros.component';
import { GestaoEpisComponent } from './features/gestao-epis/gestao-epis.component';
import { EstoqueComponent } from './features/estoque/estoque.component';
import { TreinamentosComponent } from './features/treinamentos/treinamentos.component';
import { RelatoriosComponent } from './features/relatorios/relatorios.component';
import { ConfiguracoesComponent } from './features/configuracoes/configuracoes.component';
import { authGuard, permissionGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [permissionGuard],
        data: { permission: 'dashboard' }
      },
      {
        path: 'cadastros',
        component: CadastrosComponent,
        canActivate: [permissionGuard],
        data: { permission: 'cadastros' }
      },
      {
        path: 'gestao-epis',
        component: GestaoEpisComponent,
        canActivate: [permissionGuard],
        data: { permission: 'gestao-epis' }
      },
      {
        path: 'estoque',
        component: EstoqueComponent,
        canActivate: [permissionGuard],
        data: { permission: 'estoque' }
      },
      {
        path: 'treinamentos',
        component: TreinamentosComponent,
        canActivate: [permissionGuard],
        data: { permission: 'treinamentos' }
      },
      {
        path: 'relatorios',
        component: RelatoriosComponent,
        canActivate: [permissionGuard],
        data: { permission: 'relatorios' }
      },
      {
        path: 'configuracoes',
        component: ConfiguracoesComponent,
        canActivate: [permissionGuard],
        data: { permission: 'configuracoes' }
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
