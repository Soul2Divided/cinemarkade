import { Inject, Injectable } from '@angular/core';
import { ButacaProyeccionVista } from './butaca-proyeccion.model';
import { ButacaProyeccionRepository } from './butaca-proyeccion.repository';

@Injectable({ providedIn: 'root' })
export class ButacaProyeccionService {
    constructor(
        @Inject(ButacaProyeccionRepository)
        private readonly butacaProyeccionRepository: ButacaProyeccionRepository
    ) {}

    async listarPorProyeccion(proyeccionId: number): Promise<ButacaProyeccionVista[]> {
        if (!Number.isInteger(proyeccionId) || proyeccionId <= 0) {
            throw new Error('El identificador de la proyección no es válido.');
        }

        return this.butacaProyeccionRepository.listarPorProyeccion(proyeccionId);
    }
}
