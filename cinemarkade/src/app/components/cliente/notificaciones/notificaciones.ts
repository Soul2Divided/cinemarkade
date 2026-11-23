import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Navbar } from '../../navbar/navbar';
import { NotificacionService } from '../../../core/notificacion/notificacion.service';

@Component({
    selector: 'app-notificaciones',
    imports: [CommonModule, Navbar],
    templateUrl: './notificaciones.html',
    styleUrl: './notificaciones.scss',
})
export class Notificaciones implements OnInit {
    readonly notificacionService = inject(NotificacionService);
    readonly cargando = signal(true);
    readonly error = signal('');

    async ngOnInit(): Promise<void> {
        try {
            await this.notificacionService.listar();
        } catch (error) {
            this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el historial.');
        } finally {
            this.cargando.set(false);
        }
    }

    async marcarLeida(id: string): Promise<void> {
        try {
            await this.notificacionService.marcarLeida(id);
        } catch (error) {
            this.error.set(error instanceof Error ? error.message : 'No se pudo actualizar el aviso.');
        }
    }
}
