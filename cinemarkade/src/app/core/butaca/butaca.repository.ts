import { Injectable } from '@angular/core';
import { Butaca } from './butaca.model';

@Injectable()
export abstract class ButacaRepository {
    abstract listarPorSala(salaId: number): Promise<Butaca[]>;
}
