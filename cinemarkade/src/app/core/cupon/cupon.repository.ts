import { Injectable } from '@angular/core';
import { Cupon, CuponInput } from './cupon.model';

@Injectable()
export abstract class CuponRepository {
    abstract listar(): Promise<Cupon[]>;
    abstract obtenerPorId(id: number): Promise<Cupon | null>;
    abstract crear(datos: CuponInput): Promise<Cupon>;
    abstract actualizar(id: number, datos: CuponInput): Promise<Cupon>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
}
