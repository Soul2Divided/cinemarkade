export type FormatoSala = '2D' | '3D' | '4D';

export interface Sala {
    id: number;
    formato: FormatoSala;
    activa: boolean;
    pelicula_id: number | null;
}

export type SalaInput = Omit<Sala, 'id' | 'activa' | 'pelicula_id'>;

export const FORMATOS_SALA: FormatoSala[] = ['2D', '3D', '4D'];
