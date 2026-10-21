import { Injectable } from '@angular/core';
import { Resena, ResenaInput } from './resena.model';

@Injectable()
export abstract class ResenaRepository {
    abstract listarPorPelicula(peliculaId: number): Promise<Resena[]>;
    abstract listarPropias(): Promise<Resena[]>;
    abstract crear(peliculaId: number, datos: ResenaInput): Promise<Resena>;
    abstract actualizar(id: number, datos: ResenaInput): Promise<Resena>;
    abstract eliminar(id: number): Promise<void>;
}
