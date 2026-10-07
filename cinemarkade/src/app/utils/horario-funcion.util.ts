import { CINE_CONFIG } from '../config/cine.config';

export function validarHorariosFuncion(duracionMinutos: number, horarios: string[]): string[] {
    if (!Number.isFinite(duracionMinutos) || duracionMinutos <= 0) {
        throw new Error('La duración de la película debe ser mayor a cero.');
    }
    if (!Array.isArray(horarios) || horarios.length === 0) {
        throw new Error('Agregá al menos un horario.');
    }

    const duracion = Math.ceil(duracionMinutos);
    const apertura = CINE_CONFIG.HORARIO_APERTURA_MINUTOS;
    const cierre = CINE_CONFIG.HORARIO_CIERRE_MINUTOS;
    const limpieza = CINE_CONFIG.BUFFER_LIMPIEZA_MINUTOS;
    const horariosOrdenados = horarios
        .map(horario => ({ horario, inicio: convertirHorarioAMinutos(horario) }))
        .sort((a, b) => (a.inicio ?? -1) - (b.inicio ?? -1));

    for (let i = 0; i < horariosOrdenados.length; i++) {
        const actual = horariosOrdenados[i];
        if (actual.inicio === null) {
            throw new Error('Cada horario debe tener formato HH:mm.');
        }
        const fin = actual.inicio + duracion;
        if (actual.inicio < apertura || actual.inicio >= cierre || fin > cierre) {
            throw new Error(`El horario ingresado es invalido. Los horarios operativos son de (${formatearHorario(apertura)}) a (${formatearHorario(cierre)}).`);
        }

        const siguiente = horariosOrdenados[i + 1];
        if (siguiente) {
            const siguienteInicio = siguiente.inicio!;
            const finConLimpieza = fin === cierre ? cierre : fin + limpieza;
            if (siguienteInicio < finConLimpieza) {
                throw new Error(`No se pueden superponer funciones. ${actual.horario} no puede ir seguido por ${siguiente.horario}.`);
            }
        }
    }

    return horariosOrdenados.map(item => item.horario);
}

export function validarHorarioFuncion(duracionMinutos: number, horario: string, horariosExistentes: string[]): string[] {
    if (horariosExistentes.includes(horario)) {
        throw new Error('Ese horario ya fue agregado.');
    }
    return validarHorariosFuncion(duracionMinutos, [...horariosExistentes, horario]);
}

export function validarHorarioIndividual(duracionMinutos: number, horario: string): void {
    validarHorariosFuncion(duracionMinutos, [horario]);
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
