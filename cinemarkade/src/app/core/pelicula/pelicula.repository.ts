import { Injectable } from '@angular/core';

import type { PeliculaInput, Pelicula, VentasPelicula } from './pelicula.model';

@Injectable()
export abstract class PeliculaRepository {
    abstract listar(): Promise<Pelicula[]>;
    abstract obtenerPorId(id: number): Promise<Pelicula>;
    abstract crear(datos: PeliculaInput): Promise<Pelicula>;
    abstract actualizar(id: number, datos: PeliculaInput): Promise<Pelicula>;
    abstract cambiarActiva(id: number, activa: boolean): Promise<void>;
    abstract obtenerVentasPorPelicula(): Promise<VentasPelicula[]>;
}
