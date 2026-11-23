import { Injectable } from '@angular/core';
import { CrearPeticionPelicula, EstadoPeticionPelicula, PeticionPelicula } from './peticion-pelicula.model';

@Injectable()
export abstract class PeticionPeliculaRepository {
    abstract crear(peticion: CrearPeticionPelicula): Promise<void>;
    abstract listarPendientes(): Promise<PeticionPelicula[]>;
    abstract resolver(
        id: string,
        estado: Exclude<EstadoPeticionPelicula, 'pendiente'>,
        resueltaEn: string,
    ): Promise<void>;
}
