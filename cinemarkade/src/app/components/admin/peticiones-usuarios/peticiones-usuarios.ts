import { registrarErrorUsuario } from '../../../core/services/error-usuario';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Modal } from '../../modal/modal';
import { PeticionPelicula } from '../../../core/peticion-pelicula/peticion-pelicula.model';
import { PeticionPeliculaService } from '../../../core/peticion-pelicula/peticion-pelicula.service';

@Component({
    imports: [Modal, DatePipe],
    selector: 'app-peticiones-usuarios',
    styleUrl: './peticiones-usuarios.scss',
    templateUrl: './peticiones-usuarios.html',
})
export class PeticionesUsuarios {
    private readonly servicio = inject(PeticionPeliculaService);
    private readonly router = inject(Router);

    readonly peticiones = signal<PeticionPelicula[]>([]);
    readonly seleccionada = signal<PeticionPelicula | null>(null);
    readonly cargando = signal(true);
    readonly procesando = signal(false);
    readonly error = signal('');

    constructor() {
        void this.cargar();
    }

    async cargar(): Promise<void> {
        this.cargando.set(true);
        this.error.set('');

        try {
            this.peticiones.set(await this.servicio.listarPendientes());
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error en peticiones-usuarios.ts:', error));
        } finally {
            this.cargando.set(false);
        }
    }

    async rechazar(): Promise<void> {
        const peticion = this.seleccionada();
        if (!peticion || this.procesando()) {
            return;
        }

        this.procesando.set(true);
        this.error.set('');

        try {
            await this.servicio.resolver(peticion.id, 'rechazado');
            this.seleccionada.set(null);
            await this.cargar();
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error en peticiones-usuarios.ts:', error));
        } finally {
            this.procesando.set(false);
        }
    }

    async aceptar(): Promise<void> {
        const peticion = this.seleccionada();
        if (!peticion || this.procesando()) {
            return;
        }

        this.procesando.set(true);
        this.error.set('');

        try {
            await this.servicio.resolver(peticion.id, 'aceptado');
            this.seleccionada.set(null);
            await this.router.navigate(['/admin/nueva-pelicula'], {
                state: {
                    propuesta: {
                        titulo: peticion.titulo,
                        descripcion: peticion.descripcion,
                    },
                },
            });
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error en peticiones-usuarios.ts:', error));
        } finally {
            this.procesando.set(false);
        }
    }
}
