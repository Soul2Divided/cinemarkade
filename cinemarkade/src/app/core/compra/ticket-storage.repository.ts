import { Injectable } from '@angular/core';
import { GuardarTicketInput } from './ticket-storage.model';

@Injectable()
export abstract class TicketStorageRepository {
    abstract guardar(datos: GuardarTicketInput): Promise<string | null>;
    abstract obtenerUrlDescarga(ruta: string): Promise<string>;
    abstract eliminar(ruta: string): Promise<void>;
}
