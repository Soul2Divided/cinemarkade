import { Injectable } from '@angular/core';

import { FuncionInput, Funcion } from './funcion.model';

@Injectable()
export abstract class FuncionRepository {
    abstract listar(): Promise<Funcion[]>;
    abstract obtenerPorId(id: number): Promise<Funcion>;
    abstract listarPorPelicula(peliculaId: number): Promise<Funcion[]>;
    abstract crearMuchas(funciones: FuncionInput[]): Promise<Funcion[]>;
    abstract eliminar(id: number): Promise<void>;
}