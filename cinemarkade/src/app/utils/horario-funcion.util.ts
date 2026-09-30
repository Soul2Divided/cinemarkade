import { CINE_CONFIG } from '../config/cine.config';

export function calcularMaximoRepeticiones(duracionMinutos: number): number {
    const duracionTotal = duracionMinutos + CINE_CONFIG.BUFFER_LIMPIEZA_MINUTOS;
    const minutosOperativos =
        CINE_CONFIG.HORARIO_CIERRE_MINUTOS - CINE_CONFIG.HORARIO_APERTURA_MINUTOS;

    const maximoTeorico = Math.floor(minutosOperativos / duracionTotal);

    return Math.min(maximoTeorico, CINE_CONFIG.MAX_REPETICIONES_POR_DIA);
}

export function calcularHorariosDistribuidos(duracionMinutos: number, repeticiones: number): string[] {
    const duracionTotal = duracionMinutos + CINE_CONFIG.BUFFER_LIMPIEZA_MINUTOS;
    const apertura = CINE_CONFIG.HORARIO_APERTURA_MINUTOS;
    const ultimoInicio = CINE_CONFIG.HORARIO_CIERRE_MINUTOS - duracionTotal;

    const paso = repeticiones > 1 ? (ultimoInicio - apertura) / (repeticiones - 1) : 0;

    const horarios: string[] = [];
    for (let i = 0; i < repeticiones; i++) {
        const minutos = Math.floor((apertura + i * paso) / 5) * 5;
        const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
        const mm = String(minutos % 60).padStart(2, '0');
        horarios.push(`${hh}:${mm}`);
    }
    return horarios;
}