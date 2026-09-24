import { Injectable, Inject } from '@angular/core';

import { PeliculaRepository } from './pelicula.repository';
import { Pelicula, PeliculaInput, RESTRICCIONES_EDAD } from './pelicula.model';

@Injectable({ providedIn: 'root' })
export class PeliculaService {

    constructor(
        @Inject(PeliculaRepository) private peliculaRepository: PeliculaRepository
    ) { }

    async listarPeliculas(): Promise<Pelicula[]> {
        return this.peliculaRepository.listar();
    }

    async crearPelicula(datos: PeliculaInput): Promise<Pelicula> {
        this.validarDatosBasicos(datos);
        return this.peliculaRepository.crear(datos);
    }

    async actualizarPelicula(id: number, datos: PeliculaInput): Promise<Pelicula> {
        this.validarDatosBasicos(datos);
        return this.peliculaRepository.actualizar(id, datos);
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        return this.peliculaRepository.cambiarActiva(id, activa);
    }

    private validarDatosBasicos(datos: PeliculaInput): void {
        if (!datos.nombre || !datos.nombre.trim()) {
            throw new Error('El nombre de la película es obligatorio');
        }
        if (!datos.genero) {
            throw new Error('Debe seleccionar un género');
        }
        if (!datos.duracion || datos.duracion < 1) {
            throw new Error('La duración debe ser mayor a 0 minutos');
        }
        if (!datos.imagen || !datos.imagen.trim()) {
            throw new Error('La imagen es obligatoria');
        }
        if (!datos.sinopsis || !datos.sinopsis.trim()) {
            throw new Error('La sinopsis es obligatoria');
        }
        if (!RESTRICCIONES_EDAD.includes(datos.restriccion_edad)) {
            throw new Error('Debe seleccionar una restricción de edad válida');
        }
    }
}