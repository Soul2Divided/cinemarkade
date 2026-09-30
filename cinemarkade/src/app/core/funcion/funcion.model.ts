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
    activa: boolean;
}

export interface CrearFuncionInput {
    peliculaId: number;
    formato: FormatoSala;
    fecha: string;
    horario: string;
    idioma: IdiomaFuncion;
    precio: number;
}

export type FuncionInput = Omit<Funcion, 'id' | 'activa'>;