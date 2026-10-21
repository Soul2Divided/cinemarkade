import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GuardarResenaEvento, Resena as ResenaModel } from '../../core/resena/resena.model';
import { Estrellas } from '../estrellas/estrellas';

@Component({
    imports: [DatePipe, ReactiveFormsModule, RouterLink, Estrellas],
    selector: 'app-resena',
    styleUrl: './resena.scss',
    templateUrl: './resena.html',
})
export class Resena {
    readonly resenas = input<ResenaModel[]>([]);
    readonly usuarioId = input<string | null>(null);
    readonly cargando = input(false);
    readonly guardando = input(false);
    readonly error = input('');
    readonly mensaje = input('');
    readonly propias = input(false);

    readonly guardar = output<GuardarResenaEvento>();
    readonly eliminar = output<number>();
    readonly reintentar = output<void>();

    readonly editandoId = signal<number | null>(null);
    readonly eliminandoId = signal<number | null>(null);
    readonly estrellas = [1, 2, 3, 4, 5];
    readonly tieneResena = computed(() =>
        this.resenas().some((resena) => resena.usuario_id === this.usuarioId()),
    );
    readonly mostrarFormulario = computed(
        () =>
            !!this.usuarioId() &&
            !this.cargando() &&
            (this.editandoId() !== null || (!this.propias() && !this.tieneResena())),
    );

    readonly formulario = new FormGroup({
        estrellas: new FormControl(0, {
            nonNullable: true,
            validators: [Validators.required, Validators.min(1), Validators.max(5)],
        }),
        comentario: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(300)],
        }),
    });

    constructor() {
        effect(() => {
            if (this.mensaje()) {
                this.cancelarEdicion();
            }
        });
    }

    editar(resena: ResenaModel): void {
        if (this.guardando() || resena.usuario_id !== this.usuarioId()) {
            return;
        }

        this.editandoId.set(resena.id);
        this.eliminandoId.set(null);
        this.formulario.reset({ estrellas: resena.estrellas, comentario: resena.comentario });
    }

    cancelarEdicion(): void {
        this.editandoId.set(null);
        this.eliminandoId.set(null);
        this.formulario.reset({ estrellas: 0, comentario: '' });
    }

    enviar(): void {
        this.formulario.markAllAsTouched();

        if (this.formulario.invalid || this.guardando()) {
            return;
        }

        this.guardar.emit({ id: this.editandoId(), ...this.formulario.getRawValue() });
    }

    confirmarEliminacion(id: number): void {
        if (!this.guardando()) {
            this.eliminar.emit(id);
        }
    }
}
