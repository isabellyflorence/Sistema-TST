import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  senha = '';
  mostrarSenha = false;
  carregando = false;
  erro = '';
  recuperacaoEnviada = false;

  entrar(): void {
    this.erro = '';
    if (!this.email.trim() || !this.senha.trim()) {
      this.erro = 'Preencha a matrícula/e-mail e a senha.';
      return;
    }

    this.carregando = true;

    setTimeout(() => {
      this.carregando = false;
      const result = this.auth.login(this.email, this.senha);
      if (result.ok) this.router.navigate(['/dashboard']);
      else this.erro = result.message;
    }, 600);
  }

  recuperarSenha(): void {
    if (!this.email.trim()) {
      this.erro = 'Informe sua matrícula ou e-mail para recuperar a senha.';
      return;
    }
    this.erro = '';
    this.recuperacaoEnviada = true;
  }
}
