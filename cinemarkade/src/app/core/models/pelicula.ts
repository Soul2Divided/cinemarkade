export interface Pelicula {
    id: number;
    nombre: string;
    genero: string;
    duracion: string;
    imagen: string;
    sinopsis: string;
    restriccionEdad: string;
    banner?: string;
    precio?: number;
    sala?: string;
}
