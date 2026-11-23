import { Injectable } from '@angular/core';
import { NotificacionUsuario, SuscripcionPushInput } from './notificacion.model';

@Injectable()
export abstract class NotificacionRepository {
    abstract suscribirPush(datos: SuscripcionPushInput): Promise<void>;
    abstract activarRecordatorioEstreno(funcionId: number): Promise<void>;
    abstract activarRecordatorioPorCompra(proyeccionId: number): Promise<void>;
    abstract listar(): Promise<NotificacionUsuario[]>;
    abstract marcarLeida(id: string, leidaEn: string): Promise<void>;
}
