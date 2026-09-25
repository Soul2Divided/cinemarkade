export type FormatoSala = '2D' | '3D' | '4D';

export interface Sala {
    id: number;
    formato: FormatoSala;
    activa: boolean;
}

export type SalaInput = Omit<Sala, 'id' | 'activa'>;

export const FORMATOS_SALA: FormatoSala[] = ['2D', '3D', '4D'];