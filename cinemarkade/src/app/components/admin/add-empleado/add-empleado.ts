import { Component, HostListener, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Modal } from '../../modal/modal';
import { Loader } from '../../loader/loader';
import { passwordCheck } from '../../../validators/user.validators';
import { UserService } from '../../../core/user/user.service';
import { CrearUserCommand } from '../../../core/user/user.model';

@Component({
  imports: [ReactiveFormsModule, Modal, Loader],
  selector: 'app-add-empleado',
  styleUrl: '../../register/register.scss',
  templateUrl: './add-empleado.html',
})
export class AddEmpleado {
  pasoActual = 1;
  errorMessage = '';
  mostrarModal = signal(false);
  mostrarLoader = signal(false);

  formRegister = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    apellido: new FormControl('', [Validators.required]),
    mail: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)]),
    password2: new FormControl('', Validators.required),
    fecha_nacimiento: new FormControl('', [Validators.required]),
    tipo_sangre: new FormControl('', [Validators.required]),
    color_ojos: new FormControl('', [Validators.required]),
    cantidad_dias_vacaciones: new FormControl(14, [Validators.required, Validators.min(0)]),
  }, { validators: passwordCheck });

  constructor(private readonly router: Router, private readonly userService: UserService) {}

  @HostListener('document:keydown.enter')
  siguientePaso(): void {
    const camposPasoUno = ['nombre', 'apellido', 'mail', 'password', 'password2'];
    const valido = camposPasoUno.every(campo => this.formRegister.get(campo)?.valid) &&
      !this.formRegister.hasError('unmatchPassword');

    if (valido) {
      this.errorMessage = '';
      this.pasoActual = 2;
      return;
    }

    camposPasoUno.forEach(campo => this.formRegister.get(campo)?.markAsTouched());
    this.triggerError('COMPLETÁ EL PASO 1 PARA CONTINUAR');
  }

  pasoAnterior(): void {
    this.errorMessage = '';
    this.pasoActual = 1;
  }

  seleccionarColorOjos(color: string): void {
    const control = this.formRegister.get('color_ojos');
    control?.setValue(color);
    control?.markAsTouched();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formRegister.get(field);
    const passwordsDoNotMatch = field === 'password2' && this.formRegister.hasError('unmatchPassword');
    return !!(control && control.touched && (control.invalid || passwordsDoNotMatch));
  }

  getFieldError(field: string): string {
    const control = this.formRegister.get(field);
    if (!control?.touched) return '';

    if (control.hasError('required')) {
      const requiredMessages: Record<string, string> = {
        nombre: 'El nombre es obligatorio',
        apellido: 'El apellido es obligatorio',
        mail: 'El email es obligatorio',
        password: 'La contraseña es obligatoria',
        password2: 'Debes confirmar la contraseña',
        fecha_nacimiento: 'La fecha de nacimiento es obligatoria',
        tipo_sangre: 'Debes seleccionar un tipo de sangre',
        color_ojos: 'Debes seleccionar un color de ojos',
        cantidad_dias_vacaciones: 'Los días de vacaciones son obligatorios',
      };
      return requiredMessages[field] ?? 'Este campo es obligatorio';
    }

    if (field === 'mail' && control.hasError('email')) return 'Ingresa un email válido';
    if (field === 'password' && (control.hasError('minlength') || control.hasError('pattern'))) {
      return 'Debes agregar un número, una minúscula, una mayúscula y un carácter especial a la contraseña';
    }
    if (field === 'password2' && this.formRegister.hasError('unmatchPassword')) return 'Las contraseñas no coinciden';
    if (field === 'cantidad_dias_vacaciones' && control.hasError('min')) return 'Los días de vacaciones no pueden ser negativos';
    return '';
  }

  async onSubmit(): Promise<void> {
    if (!this.formRegister.valid) {
      this.formRegister.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);
    try {
      const datos = this.formRegister.getRawValue() as CrearUserCommand;
      await this.userService.crearEmpleado(datos);
      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error ? error.message : 'No se pudo crear el empleado.');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    void this.router.navigate(['/admin']);
  }

  cancelar(): void {
    void this.router.navigate(['/admin']);
  }

  triggerError(message: string): void {
    this.errorMessage = message;
  }
}
