import { FormatoSala } from '../sala/sala.model';

export type IdiomaFuncion = 'Subtitulada' | 'Doblada';

/** Una programación diaria de una película en una sala y formato. */
export interface Funcion {
    id: number;
    pelicula_id: number;
    sala_id: number;
    fecha: string;
    formato: FormatoSala;
    idioma: IdiomaFuncion;
    es_preventa: boolean;
    activa: boolean;
    proyecciones: Proyeccion[];
}

/** Un horario concreto dentro de una función diaria. */
export interface Proyeccion {
    id: number;
    funcion_id: number;
    horario: string;
    activa: boolean;
}

export interface FuncionInput {
    pelicula_id: number;
    sala_id: number;
    fecha: string;
    formato: FormatoSala;
    idioma: IdiomaFuncion;
    es_preventa: boolean;
    activa: boolean;
}

export interface CrearFuncionInput {
    peliculaId: number;
    formatos: FormatoSala[];
    fecha: string;
    primerHorario: string;
    horariosSeleccionados: string[];
    idioma: IdiomaFuncion;
    esPreventa: boolean;
}
