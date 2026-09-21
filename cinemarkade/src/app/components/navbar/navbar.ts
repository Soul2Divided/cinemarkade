import { Component, EventEmitter, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HostListener } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Loader } from '../loader/loader';
import { Modal } from '../modal/modal';

@Component({
  imports: [RouterLink, UpperCasePipe, Loader, Modal],
  selector: 'app-navbar',
  styleUrl: './navbar.scss',
  templateUrl: './navbar.html',
})

export class Navbar {
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);
  errorMessage: string = '';

  @Output() search = new EventEmitter<string>();

  constructor(public authService: AuthService, public router: Router) { }

  menuAbierto = signal<boolean>(false);

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  async cerrarSesion(): Promise<void> {
    this.cerrarMenu();
    try {
      await this.authService.signOut();
      this.mostrarLoader.set(true)
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo crear el usuario');
    } finally {
      this.mostrarModal.set(true);
      this.mostrarLoader.set(true);
      this.router.navigate(['/']);
    }
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    console.log('Búsqueda:', query);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-perfil-container')) {
      this.cerrarMenu();
    }
  }
}