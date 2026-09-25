import { Injectable } from '@angular/core';

import { SalaInput, Sala } from './sala.model';

@Injectable()
export abstract class SalaRepository {
    abstract listar(): Promise<Sala[]>;
    abstract crear(datos: SalaInput): Promise<Sala>;
    abstract actualizar(id: number, datos: SalaInput): Promise<Sala>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
}