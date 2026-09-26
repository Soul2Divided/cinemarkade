import { CINE_CONFIG } from '../config/cine.config';

export function calcularMaximoRepeticiones(duracionMinutos: number): number {
    const duracionTotal = duracionMinutos + CINE_CONFIG.BUFFER_LIMPIEZA_MINUTOS;
    const minutosOperativos =
        CINE_CONFIG.HORARIO_CIERRE_MINUTOS - CINE_CONFIG.HORARIO_APERTURA_MINUTOS;

    const maximoTeorico = Math.floor(minutosOperativos / duracionTotal);

    return Math.min(maximoTeorico, CINE_CONFIG.MAX_REPETICIONES_POR_DIA);
}