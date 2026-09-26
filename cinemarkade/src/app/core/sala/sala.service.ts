import { Injectable, Inject } from '@angular/core';

import { SalaRepository } from './sala.repository';
import { Sala, SalaInput, FORMATOS_SALA, FormatoSala } from './sala.model';

@Injectable({ providedIn: 'root' })
export class SalaService {

    constructor(
        @Inject(SalaRepository) private salaRepository: SalaRepository
    ) { }

    async listarSalas(): Promise<Sala[]> {
        return this.salaRepository.listar();
    }

    async obtenerPorId(id: number): Promise<Sala> {
        return this.salaRepository.obtenerPorId(id);
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

    async buscarSala(formato: FormatoSala): Promise<Sala> {
        const sala = await this.salaRepository.buscarSalaLibre(formato);
        if (!sala) {
            throw new Error(`No hay salas libres de formato ${formato}`);
        }
        return sala;
    }

    async buscarSalaAsignada(peliculaId: number, formato: FormatoSala): Promise<Sala | null> {
        return this.salaRepository.buscarSalaAsignada(peliculaId, formato);
    }

    async asignarPelicula(salaId: number, peliculaId: number): Promise<void> {
        return this.salaRepository.asignarPelicula(salaId, peliculaId);
    }

    async liberarSala(salaId: number): Promise<void> {
        return this.salaRepository.liberarSala(salaId);
    }

    private validarDatosBasicos(datos: SalaInput): void {
        if (!FORMATOS_SALA.includes(datos.formato)) {
            throw new Error('Debe seleccionar un formato de sala válido');
        }
    }
}