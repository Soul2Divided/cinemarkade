export type EstadoPeticionPelicula = 'pendiente' | 'aceptado' | 'rechazado';

export interface CrearPeticionPelicula {
    titulo: string;
    descripcion: string;
    motivo: string;
}

export interface PeticionPelicula extends CrearPeticionPelicula {
    id: string;
    usuario_id: string;
    estado: EstadoPeticionPelicula;
    created_at: string;
    usuario_nombre: string;
    usuario_apellido: string;
}
