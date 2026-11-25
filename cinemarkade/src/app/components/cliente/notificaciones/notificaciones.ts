import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Navbar } from '../../navbar/navbar';
import { NotificacionService } from '../../../core/notificacion/notificacion.service';
import { registrarErrorUsuario } from '../../../core/services/error-usuario';
import { Router } from '@angular/router';
import { NotificacionUsuario } from '../../../core/notificacion/notificacion.model';

@Component({
    selector: 'app-notificaciones',
    imports: [CommonModule, Navbar],
    templateUrl: './notificaciones.html',
    styleUrl: './notificaciones.scss',
})
export class Notificaciones implements OnInit {
    readonly notificacionService = inject(NotificacionService);
    private readonly router = inject(Router);
    readonly cargando = signal(true);
    readonly error = signal('');

    async ngOnInit(): Promise<void> {
        try {
            await this.notificacionService.listar();
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error al cargar notificaciones:', error));
        } finally {
            this.cargando.set(false);
        }
    }

    async marcarLeida(id: string): Promise<void> {
        try {
            await this.notificacionService.marcarLeida(id);
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error al marcar una notificación:', error));
        }
    }

    async elegirOtroHorario(notificacion: NotificacionUsuario): Promise<void> {
        if (!notificacion.pelicula_id) {
            return;
        }

        try {
            await this.notificacionService.marcarLeida(notificacion.id);
        } catch (error) {
            console.error('No se pudo marcar la notificación como leída:', error);
        }

        await this.router.navigate(['/funciones', notificacion.pelicula_id]);
    }
}
