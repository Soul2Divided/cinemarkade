import { Component, OnInit, HostListener, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';
import { Modal } from '../modal/modal';
import { Loader } from '../loader/loader';
import { UserService } from '../../core/user/user.service';


@Component({
  imports: [Navbar, ReactiveFormsModule, Modal, Loader],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  errorMessage: string = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);

  formLogin = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  constructor(private router: Router, private userService: UserService) {
    
  }

  @HostListener('document:keydown.enter')
  async onSubmit(): Promise<void> {
    if (!this.formLogin.valid) {
      this.formLogin.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);

    try {
      const { email, password } = this.formLogin.getRawValue();
      await this.userService.iniciarSesion(email ?? '', password ?? '');
      this.mostrarModal.set(true);
      await this.router.navigate(['/home']);
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo iniciar sesión');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/login']);
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  irASeleccion(): void {
    this.router.navigate(['/select-login']);
  }

}