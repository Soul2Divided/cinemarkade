export interface Pelicula {
    id: number;
    nombre: string;
    genero: string;
    duracion: number;
    imagen: string;
    sinopsis: string;
    restriccion_edad: string;
    banner: string | null;
    activa: boolean;
    created_at?: string;
}

export type PeliculaInput = Omit<Pelicula, 'id' | 'created_at' | 'activa'>;

export const GENEROS = [
    'Acción', 'Ciencia Ficción', 'Terror', 'Aventura', 'Comedia', 'Drama', 'Animación',
];

export const RESTRICCIONES_EDAD = ['ATP', '+13', '+16', '+18'];