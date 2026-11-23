import { Injectable, inject, signal } from '@angular/core';
import { NotificacionUsuario } from './notificacion.model';
import { NotificacionRepository } from './notificacion.repository';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
    private readonly repository = inject(NotificacionRepository);

    readonly notificaciones = signal<NotificacionUsuario[]>([]);
    readonly noLeidas = signal(0);

    limpiar(): void {
        this.notificaciones.set([]);
        this.noLeidas.set(0);
    }

    async suscribirPush(usuarioId: string, clavePublica: string): Promise<void> {
        if (!usuarioId.trim()) {
            throw new Error('Se necesita identificar al usuario para activar las notificaciones.');
        }

        if (!clavePublica.trim()) {
            throw new Error('No está configurada la clave pública de notificaciones.');
        }

        await this.repository.suscribirPush({ usuarioId, clavePublica });
    }

    async activarRecordatorioEstreno(funcionId: number): Promise<void> {
        this.validarIdentificador(funcionId, 'función');
        await this.repository.activarRecordatorioEstreno(funcionId);
    }

    async activarRecordatorioPorCompra(proyeccionId: number): Promise<void> {
        this.validarIdentificador(proyeccionId, 'proyección');
        await this.repository.activarRecordatorioPorCompra(proyeccionId);
    }

    async listar(): Promise<void> {
        const notificaciones = await this.repository.listar();
        this.notificaciones.set(notificaciones);
        this.noLeidas.set(notificaciones.filter(notificacion => !notificacion.leida_en).length);
    }

    async marcarLeida(id: string): Promise<void> {
        const notificacion = this.notificaciones().find(item => item.id === id);
        if (!notificacion || notificacion.leida_en) {
            return;
        }

        const leidaEn = new Date().toISOString();
        await this.repository.marcarLeida(id, leidaEn);
        this.notificaciones.update(actuales => actuales.map(item =>
            item.id === id ? { ...item, leida_en: leidaEn } : item,
        ));
        this.noLeidas.update(actual => Math.max(0, actual - 1));
    }

    private validarIdentificador(id: number, entidad: string): void {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error(`El identificador de ${entidad} no es válido.`);
        }
    }
}
