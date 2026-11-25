import { FormatoSala } from '../sala/sala.model';

export type IdiomaFuncion = 'Subtitulada' | 'Doblada';

export interface Funcion {
    id: number;
    pelicula_id: number;
    sala_id: number;
    fecha: string;
    formato: FormatoSala;
    idioma: IdiomaFuncion;
    es_estreno: boolean;
    es_preventa: boolean;
    fecha_disponible_preventa: string | null;
    porcentaje_recargo_preventa: number | null;
    activa: boolean;
    proyecciones: Proyeccion[];
}

export interface Proyeccion {
    id: number;
    funcion_id: number;
    horario: string;
    activa: boolean;
}

export interface CancelarProyeccionResultado {
    proyeccion_id: number;
    compras_canceladas: number;
    puntos_reintegrados: number;
    notificaciones_creadas: number;
}

export interface FuncionInput {
    pelicula_id: number;
    sala_id: number;
    fecha: string;
    formato: FormatoSala;
    idioma: IdiomaFuncion;
    es_estreno: boolean;
    es_preventa: boolean;
    fecha_disponible_preventa: string | null;
    porcentaje_recargo_preventa: number | null;
    activa: boolean;
}

export interface CrearFuncionInput {
    peliculaId: number;
    formatos: FormatoSala[];
    fecha: string;
    dias: number;
    primerHorario: string;
    horariosSeleccionados: string[];
    idioma: IdiomaFuncion;
    esEstreno: boolean;
    esPreventa: boolean;
    fechaDisponiblePreventa: string | null;
    porcentajeRecargoPreventa: number | null;
}
