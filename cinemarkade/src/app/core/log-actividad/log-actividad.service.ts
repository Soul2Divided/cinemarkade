import { Inject, Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { LogActividad, RegistrarLogActividadInput } from './log-actividad.model';
import { LogActividadRepository } from './log-actividad.repository';

@Injectable({ providedIn: 'root' })
export class LogActividadService {
    private readonly authService = inject(AuthService);

    constructor(
        @Inject(LogActividadRepository)
        private readonly repository: LogActividadRepository,
    ) {}

    async registrar(accion: string, detalle: string): Promise<void> {
        try {
            const usuarioId = this.authService.usuarioActual()?.id
                ?? await this.authService.obtenerIdUsuarioSesion();

            if (!usuarioId) {
                throw new Error('No hay una sesión activa para registrar la actividad.');
            }

            const datos: RegistrarLogActividadInput = {
                usuario_id: usuarioId,
                accion,
                detalle,
                fecha_hora: this.fechaHoraLocalCine(),
            };

            await this.repository.registrar(datos);
        } catch (error) {
            console.error('No se pudo registrar la actividad administrativa:', error);
        }
    }

    listar(): Promise<LogActividad[]> {
        return this.repository.listar();
    }

    private fechaHoraLocalCine(): string {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date());
        const valor = (tipo: string) => partes.find(parte => parte.type === tipo)?.value ?? '';

        return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}:${valor('second')}`;
    }
}
