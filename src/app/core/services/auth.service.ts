import { Injectable, computed, inject, signal } from '@angular/core';

import { ModulePermission, SystemUser } from '../models/sicc.models';
import { SiccDataService } from './sicc-data.service';

const SESSION_KEY = 'hospital-esperanca-sicc-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly data = inject(SiccDataService);
  private readonly currentUserId = signal(sessionStorage.getItem(SESSION_KEY) ?? '');

  readonly currentUser = computed<SystemUser | undefined>(() => this.data.userById(this.currentUserId()));
  readonly isAuthenticated = computed(() => !!this.currentUser()?.active);

  login(identifier: string, password: string): { ok: boolean; message: string } {
    const normalized = identifier.trim().toLowerCase();
    const user = this.data.users().find(item =>
      item.active &&
      (item.email.toLowerCase() === normalized || item.registration.toLowerCase() === normalized) &&
      item.password === password
    );

    if (!user) return { ok: false, message: 'Matrícula/e-mail ou senha inválidos.' };
    sessionStorage.setItem(SESSION_KEY, user.id);
    this.currentUserId.set(user.id);
    return { ok: true, message: 'Acesso autorizado.' };
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUserId.set('');
  }

  canAccess(permission: ModulePermission): boolean {
    const profile = this.currentUser()?.profile;
    return !!profile && this.data.settings().permissions[profile].includes(permission);
  }
}
