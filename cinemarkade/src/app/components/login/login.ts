import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';


@Component({
  imports: [Navbar, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  errorMessage: string = '';

  formLogin = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  constructor(private router: Router) {}

  onSubmit(): void {
    if (this.formLogin.valid) {
      console.log('Formulario enviado:', this.formLogin.value);
    } else {
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
    }
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