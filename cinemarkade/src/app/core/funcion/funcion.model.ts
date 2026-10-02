import { FormatoSala } from '../sala/sala.model';

export type IdiomaFuncion = 'Subtitulada' | 'Doblada';

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
    semanas: number;
    primerHorario: string;
    horariosSeleccionados: string[];
    idioma: IdiomaFuncion;
    esPreventa: boolean;
}
