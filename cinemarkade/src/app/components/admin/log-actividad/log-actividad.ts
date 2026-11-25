import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LogActividad } from '../../../core/log-actividad/log-actividad.model';
import { LogActividadService } from '../../../core/log-actividad/log-actividad.service';

@Component({
    imports: [DatePipe],
    selector: 'app-log-actividad',
    styleUrl: './log-actividad.scss',
    templateUrl: './log-actividad.html',
})
export class LogActividadComponent {
    private readonly servicio = inject(LogActividadService);

    readonly registros = signal<LogActividad[]>([]);
    readonly cargando = signal(true);
    readonly error = signal(false);

    constructor() {
        void this.cargar();
    }

    async cargar(): Promise<void> {
        this.cargando.set(true);
        this.error.set(false);

        try {
            this.registros.set(await this.servicio.listar());
        } catch (error) {
            console.error('No se pudo cargar el historial de actividad:', error);
            this.error.set(true);
        } finally {
            this.cargando.set(false);
        }
    }

    etiquetaAccion(accion: string | null): string {
        const etiquetas: Record<string, string> = {
            crear_funcion: 'Creó una función',
            actualizar_funcion: 'Modificó una función',
            modificar_precio_producto: 'Modificó el precio de un producto',
            modificar_precio_combo: 'Modificó el precio de un combo',
            modificar_precio_preventa: 'Modificó el recargo de preventa',
            validar_qr: 'Validó una entrada',
        };

        return accion ? etiquetas[accion] ?? accion : 'Actividad administrativa';
    }
}
