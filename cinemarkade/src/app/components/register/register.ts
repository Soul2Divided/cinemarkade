import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  imports: [ReactiveFormsModule, Navbar],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  pasoActual: number = 1;
  errorMessage: string = '';

  formRegister = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    apellido: new FormControl('', [Validators.required]),
    mail: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    fechaNacimiento: new FormControl('', [Validators.required]),
    tipoSangre: new FormControl('', [Validators.required]),
    colorOjos: new FormControl('', [Validators.required]),
    diasVacaciones: new FormControl(14, [Validators.required, Validators.min(0)])
  });

  constructor(private router: Router) {}

  siguientePaso(): void {
    const stage1Valido = 
      this.formRegister.get('nombre')?.valid &&
      this.formRegister.get('apellido')?.valid &&
      this.formRegister.get('mail')?.valid &&
      this.formRegister.get('password')?.valid;

    if (stage1Valido) {
      this.errorMessage = '';
      this.pasoActual = 2;
    } else {
      this.formRegister.get('nombre')?.markAsTouched();
      this.formRegister.get('apellido')?.markAsTouched();
      this.formRegister.get('mail')?.markAsTouched();
      this.formRegister.get('password')?.markAsTouched();
      this.triggerError('COMPLETÁ EL PASO 1 PARA CONTINUAR');
    }
  }

  pasoAnterior(): void {
    this.errorMessage = '';
    this.pasoActual = 1;
  }

  seleccionarColorOjos(color: string): void {
    const control = this.formRegister.get('colorOjos');
    control?.setValue(color);
    control?.markAsTouched();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formRegister.get(field);
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(): void {
    if (this.formRegister.valid) {
      console.log('Registro enviado:', this.formRegister.value);
    } else {
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
    }
  }

  irASeleccion(): void {
    this.router.navigate(['/select-login']);
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  logRegisterData(): void {
    console.log('Datos del registro:', this.formRegister.value);
  }
}