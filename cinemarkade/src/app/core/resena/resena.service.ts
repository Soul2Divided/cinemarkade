import { Inject, Injectable } from '@angular/core';
import { Resena, ResenaInput } from './resena.model';
import { ResenaRepository } from './resena.repository';

@Injectable({ providedIn: 'root' })
export class ResenaService {
    constructor(@Inject(ResenaRepository) private readonly repository: ResenaRepository) {}

    listarPorPelicula(peliculaId: number): Promise<Resena[]> {
        this.validarId(peliculaId);

        return this.repository.listarPorPelicula(peliculaId);
    }

    listarPropias(): Promise<Resena[]> {
        return this.repository.listarPropias();
    }

    crear(peliculaId: number, datos: ResenaInput): Promise<Resena> {
        this.validarId(peliculaId);

        return this.repository.crear(peliculaId, this.validarDatos(datos));
    }

    actualizar(id: number, datos: ResenaInput): Promise<Resena> {
        this.validarId(id);

        return this.repository.actualizar(id, this.validarDatos(datos));
    }

    eliminar(id: number): Promise<void> {
        this.validarId(id);

        return this.repository.eliminar(id);
    }

    private validarDatos(datos: ResenaInput): ResenaInput {
        if (!Number.isInteger(datos.estrellas) || datos.estrellas < 1 || datos.estrellas > 5) {
            throw new Error('Elegí una puntuación de 1 a 5 estrellas.');
        }

        const comentario = datos.comentario?.trim() ?? '';

        if (!comentario || comentario.length > 300) {
            throw new Error('Escribí un comentario de entre 1 y 300 caracteres.');
        }

        return { estrellas: datos.estrellas, comentario };
    }

    private validarId(id: number): void {
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error('El identificador de la película o reseña no es válido.');
        }
    }
}
