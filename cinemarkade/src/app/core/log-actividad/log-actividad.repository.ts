import { Injectable } from '@angular/core';
import { LogActividad, RegistrarLogActividadInput } from './log-actividad.model';

@Injectable()
export abstract class LogActividadRepository {
    abstract registrar(datos: RegistrarLogActividadInput): Promise<void>;
    abstract listar(): Promise<LogActividad[]>;
}
