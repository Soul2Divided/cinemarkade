import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../navbar/navbar';
import { AuthService } from '../../../auth/auth.service';

@Component({
    imports: [Navbar, RouterLink, ReactiveFormsModule],
    selector: 'app-mi-perfil',
    styleUrl: './mi-perfil.scss',
    templateUrl: './mi-perfil.html',
})
export class MiPerfil {
    constructor(
        private router: Router,
        public authService: AuthService,
    ) {}

    readonly editando = signal(false);
    readonly guardando = signal(false);
    readonly error = signal('');
    readonly exito = signal('');
    readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    readonly coloresOjos = ['Azul/Celeste', 'Marrón', 'Verde'];
    readonly fechaMaxima = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

    readonly formPerfil = new FormGroup({
        nombre: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/)],
        }),
        apellido: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/)],
        }),
        fecha_nacimiento: new FormControl('', {
            nonNullable: true,
            validators: Validators.required,
        }),
        tipo_sangre: new FormControl('', { nonNullable: true, validators: Validators.required }),
        color_ojos: new FormControl('', { nonNullable: true, validators: Validators.required }),
        cantidad_dias_vacaciones: new FormControl(0, {
            nonNullable: true,
            validators: [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
        }),
    });

    abrirEditarPerfil(): void {
        const usuario = this.authService.usuarioActual();

        if (!usuario || this.guardando()) {
            return;
        }

        this.formPerfil.reset({
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            fecha_nacimiento: usuario.fecha_nacimiento?.slice(0, 10) ?? '',
            tipo_sangre: usuario.tipo_sangre,
            color_ojos: usuario.color_ojos,
            cantidad_dias_vacaciones: usuario.cantidad_dias_vacaciones,
        });
        this.error.set('');
        this.exito.set('');
        this.editando.set(true);
    }

    cancelarEdicion(): void {
        if (this.guardando()) {
            return;
        }

        this.editando.set(false);
        this.error.set('');
    }

    campoInvalido(campo: keyof typeof this.formPerfil.controls): boolean {
        const control = this.formPerfil.controls[campo];

        return control.touched && control.invalid;
    }

    async guardarPerfil(): Promise<void> {
        if (this.guardando()) {
            return;
        }

        this.error.set('');
        this.formPerfil.markAllAsTouched();

        if (this.formPerfil.invalid) {
            this.error.set('Revisá los campos indicados antes de guardar.');

            return;
        }

        this.guardando.set(true);

        try {
            await this.authService.actualizarPerfil(this.formPerfil.getRawValue());
            this.editando.set(false);
            this.exito.set('Tu perfil se actualizó correctamente.');
        } catch (error) {
            this.error.set(
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar el perfil. Intentá nuevamente.',
            );
        } finally {
            this.guardando.set(false);
        }
    }

    irAHistorialCompras(): void {
        this.router.navigate(['/historial-compras']);
    }

    irAHistorialFunciones(): void {
        this.router.navigate(['/historial-funciones']);
    }

    irAMisEntradas(): void {
        this.router.navigate(['/mis-entradas']);
    }
}
