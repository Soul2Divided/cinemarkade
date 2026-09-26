import { FormatoSala } from '../sala/sala.model';

export type IdiomaFuncion = 'Subtitulada' | 'Doblada';

export interface Funcion {
    id: number;
    pelicula_id: number;
    sala_id: number;
    fecha: string;
    horario: string;
    formato: FormatoSala;
    idioma: IdiomaFuncion;
    precio: number;
    es_preventa: boolean;
}

export type FuncionInput = Omit<Funcion, 'id'>;

export const IDIOMAS_FUNCION: IdiomaFuncion[] = ['Subtitulada', 'Doblada'];