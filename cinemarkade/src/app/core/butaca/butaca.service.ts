import { Inject, Injectable } from '@angular/core';
import { Butaca } from './butaca.model';
import { ButacaRepository } from './butaca.repository';

@Injectable({ providedIn: 'root' })
export class ButacaService {
    constructor(
        @Inject(ButacaRepository)
        private readonly butacaRepository: ButacaRepository
    ) {}

    async listarPorSala(salaId: number): Promise<Butaca[]> {
        if (!Number.isInteger(salaId) || salaId <= 0) {
            throw new Error('El identificador de la sala no es válido.');
        }

        return this.butacaRepository.listarPorSala(salaId);
    }
}
