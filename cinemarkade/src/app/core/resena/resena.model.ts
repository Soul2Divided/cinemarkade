export interface Resena {
    id: number;
    pelicula_id: number;
    usuario_id: string;
    estrellas: number;
    comentario: string;
    fecha: string;
    autor_nombre: string;
    pelicula_nombre: string;
    pelicula_imagen: string;
}

export interface ResenaInput {
    estrellas: number;
    comentario: string;
}

export interface GuardarResenaEvento extends ResenaInput {
    id: number | null;
}
