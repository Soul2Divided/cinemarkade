import { Injectable } from '@angular/core';
import { Funcion, FuncionInput } from './funcion.model';

@Injectable()
export abstract class FuncionRepository {
    abstract listar(): Promise<Funcion[]>;
    abstract obtenerPorId(id: number): Promise<Funcion>;
    abstract listarPorPelicula(peliculaId: number): Promise<Funcion[]>;
    abstract crear(datos: FuncionInput): Promise<Funcion>;
    abstract actualizar(id: number, datos: FuncionInput): Promise<Funcion>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
    abstract existeFuncionActivaEnSala(
        salaId: number,
        excluirFuncionId?: number
    ): Promise<boolean>;
}