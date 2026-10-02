import { CINE_CONFIG } from '../config/cine.config';

const INTERVALO_HORARIO_MINUTOS = 5;

export function calcularHorariosDisponibles(
    duracionMinutos: number,
    primerHorario: string
): string[] {
    if (!Number.isFinite(duracionMinutos) || duracionMinutos <= 0) {
        throw new Error('La duración de la película debe ser mayor a cero.');
    }

    const inicioIngresado = convertirHorarioAMinutos(primerHorario);

    if (inicioIngresado === null) {
        throw new Error('El horario inicial debe tener formato HH:mm.');
    }

    const duracion = Math.ceil(duracionMinutos);
    const apertura = CINE_CONFIG.HORARIO_APERTURA_MINUTOS;
    const cierre = CINE_CONFIG.HORARIO_CIERRE_MINUTOS;
    const limpieza = CINE_CONFIG.BUFFER_LIMPIEZA_MINUTOS;
    const primerInicio = redondearHorarioHaciaArriba(inicioIngresado);

    if (primerInicio < apertura || primerInicio >= cierre) {
        throw new Error('El horario inicial debe estar dentro del horario del cine.');
    }

    if (primerInicio + duracion > cierre) {
        throw new Error('La película no alcanza a terminar antes del cierre.');
    }

    const horarios: string[] = [];
    let inicioActual = primerInicio;

    while (inicioActual + duracion <= cierre) {
        horarios.push(formatearHorario(inicioActual));

        const siguienteInicioMinimo = inicioActual + duracion + limpieza;
        inicioActual = redondearHorarioHaciaArriba(siguienteInicioMinimo);
    }

    return horarios;
}

function redondearHorarioHaciaArriba(minutos: number): number {
    return Math.ceil(minutos / INTERVALO_HORARIO_MINUTOS) *
        INTERVALO_HORARIO_MINUTOS;
}

function convertirHorarioAMinutos(horario: string): number | null {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario);
    if (!coincidencia) return null;

    return Number(coincidencia[1]) * 60 + Number(coincidencia[2]);
}

function formatearHorario(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return `${String(horas).padStart(2, '0')}:${String(minutosRestantes).padStart(2, '0')}`;
}