import { Injectable, Inject } from '@angular/core';

import { SalaRepository } from './sala.repository';
import { Sala, SalaInput, FORMATOS_SALA } from './sala.model';

@Injectable({ providedIn: 'root' })
export class SalaService {

    constructor(
        @Inject(SalaRepository) private salaRepository: SalaRepository
    ) { }

    async listarSalas(): Promise<Sala[]> {
        return this.salaRepository.listar();
    }

    async crearSala(datos: SalaInput): Promise<Sala> {
        this.validarDatosBasicos(datos);
        return this.salaRepository.crear(datos);
    }

    async actualizarSala(id: number, datos: SalaInput): Promise<Sala> {
        this.validarDatosBasicos(datos);
        return this.salaRepository.actualizar(id, datos);
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        return this.salaRepository.cambiarActiva(id, activa);
    }

    private validarDatosBasicos(datos: SalaInput): void {
        if (!FORMATOS_SALA.includes(datos.formato)) {
            throw new Error('Debe seleccionar un formato de sala válido');
        }
    }
}