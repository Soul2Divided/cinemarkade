import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkActive, RouterLink} from '@angular/router';

interface MenuOption {
  label: string;
  route: string;
}

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-menu',
  styleUrl: './menu.scss',
  templateUrl: './menu.html',
})
export class Menu {
  activeOptionIndex: number = 0;

  options: MenuOption[] = [
    { label: 'INICIAR SESIÓN', route: '/login' },
    { label: 'REGISTRARSE', route: '/register' },
    { label: 'INGRESAR COMO INVITADO', route: '/invitado' }
  ];

  setActiveIndex(index: number): void {
    this.activeOptionIndex = index;
  }

  constructor() {
  }
}
