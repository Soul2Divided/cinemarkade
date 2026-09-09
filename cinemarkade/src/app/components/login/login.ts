import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  activeOptionIndex: number = 0;

  options: string[] = [
    'INICIAR SESIÓN',
    'REGISTRARSE',
    'INGRESAR COMO INVITADO'
  ];

  setActiveIndex(index: number): void {
    this.activeOptionIndex = index;
  }

  constructor() {
  }
}
