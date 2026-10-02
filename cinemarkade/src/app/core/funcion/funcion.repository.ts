import { Injectable } from '@angular/core';
import { Funcion, FuncionInput } from './funcion.model';

@Injectable()
export abstract class FuncionRepository {
    abstract listar(): Promise<Funcion[]>;
    abstract obtenerPorId(id: number): Promise<Funcion>;
    abstract listarPorPelicula(peliculaId: number): Promise<Funcion[]>;
    abstract crearConProyecciones(datos: FuncionInput, horarios: string[]): Promise<Funcion>;
    abstract actualizarConProyecciones(
        id: number,
        datos: FuncionInput,
        horarios: string[]
    ): Promise<Funcion>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
    abstract existeFuncionActivaEnSala(
        salaId: number,
        fecha: string,
        excluirFuncionId?: number
    ): Promise<boolean>;
}
