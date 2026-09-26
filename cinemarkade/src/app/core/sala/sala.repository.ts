import { Injectable } from '@angular/core';

import { SalaInput, Sala, FormatoSala } from './sala.model';

@Injectable()
export abstract class SalaRepository {
    abstract listar(): Promise<Sala[]>;
    abstract obtenerPorId(id: number): Promise<Sala>;
    abstract crear(datos: SalaInput): Promise<Sala>;
    abstract actualizar(id: number, datos: SalaInput): Promise<Sala>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
    abstract buscarSalaAsignada(peliculaId: number, formato: FormatoSala): Promise<Sala | null>;
    abstract buscarSalaLibre(formato: FormatoSala): Promise<Sala | null>;
    abstract asignarPelicula(salaId: number, peliculaId: number): Promise<void>;
    abstract liberarSala(salaId: number): Promise<void>;
}