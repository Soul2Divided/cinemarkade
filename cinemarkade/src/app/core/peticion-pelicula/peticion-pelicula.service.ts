import { Injectable, inject } from '@angular/core';
import {
    CrearPeticionPelicula,
    EstadoPeticionPelicula,
    PeticionPelicula,
} from './peticion-pelicula.model';
import { PeticionPeliculaRepository } from './peticion-pelicula.repository';

@Injectable({ providedIn: 'root' })
export class PeticionPeliculaService {
    private readonly repository = inject(PeticionPeliculaRepository);

    async crear(peticion: CrearPeticionPelicula): Promise<void> {
        const normalizada = {
            titulo: peticion.titulo.trim(),
            descripcion: peticion.descripcion.trim(),
            motivo: peticion.motivo.trim(),
        };
        this.validarPeticion(normalizada);

        try {
            await this.repository.crear(normalizada);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Ya tenés una petición pendiente')) {
                throw new Error('Ya tenés una propuesta pendiente de revisión.');
            }

            throw error;
        }
    }

    listarPendientes(): Promise<PeticionPelicula[]> {
        return this.repository.listarPendientes();
    }

    resolver(id: string, estado: Exclude<EstadoPeticionPelicula, 'pendiente'>): Promise<void> {
        if (!this.esUuid(id)) {
            throw new Error('El identificador de la petición no es válido.');
        }

        if (estado !== 'aceptado' && estado !== 'rechazado') {
            throw new Error('El estado de resolución no es válido.');
        }

        return this.repository.resolver(id, estado, new Date().toISOString());
    }

    private validarPeticion(peticion: CrearPeticionPelicula): void {
        if (!peticion.titulo || peticion.titulo.length > 150) {
            throw new Error('El título debe tener entre 1 y 150 caracteres.');
        }

        if (!peticion.descripcion || peticion.descripcion.length > 3000) {
            throw new Error('La descripción debe tener entre 1 y 3000 caracteres.');
        }

        if (!peticion.motivo || peticion.motivo.length > 2000) {
            throw new Error('La explicación debe tener entre 1 y 2000 caracteres.');
        }
    }

    private esUuid(valor: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
    }
}
