import { Inject, Injectable } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import { CrearFuncionInput, Funcion, FuncionInput } from './funcion.model';
import { FORMATOS_SALA, FormatoSala, Sala } from '../sala/sala.model';
import { PeliculaService } from '../pelicula/pelicula.service';
import { SalaService } from '../sala/sala.service';
import { validarHorariosFuncion } from '../../utils/horario-funcion.util';

@Injectable({ providedIn: 'root' })
export class FuncionService {
    constructor(
        @Inject(FuncionRepository)
        private readonly funcionRepository: FuncionRepository,
        private readonly peliculaService: PeliculaService,
        private readonly salaService: SalaService
    ) { }

    listarFunciones(): Promise<Funcion[]> {
        return this.funcionRepository.listar();
    }

    async listarFuncionesActivas(): Promise<Funcion[]> {
        return (await this.funcionRepository.listar()).filter(funcion => funcion.activa);
    }

    async obtenerFuncionPorId(id: number): Promise<Funcion> {
        this.validarId(id);
        return this.funcionRepository.obtenerPorId(id);
    }

    listarFuncionesPorPelicula(peliculaId: number): Promise<Funcion[]> {
        this.validarId(peliculaId);
        return this.funcionRepository.listarPorPelicula(peliculaId);
    }

    async crearFunciones(datos: CrearFuncionInput): Promise<Funcion[]> {
        await this.validarDatos(datos);

        const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
        if (!pelicula.activa) {
            throw new Error('No se puede crear una función para una película inactiva.');
        }

        const salas = await this.salaService.listarSalas();
        const asignaciones: Array<{ fecha: string; formato: FormatoSala; salaId: number }> = [];
        const fechas = this.generarFechas(datos.fecha, datos.dias);
        
        for (const fecha of fechas) {
            const salasAsignadasEseDia: number[] = [];
            for (const formato of datos.formatos) {
                let salaDisponible: Sala | undefined;
                for (const candidata of salas.filter(item =>
                    item.activa && item.formato === formato && !salasAsignadasEseDia.includes(item.id)
                )) {
                    const ocupada = await this.funcionRepository.existeFuncionActivaEnSala(
                        candidata.id,
                        fecha
                    );
                    if (!ocupada) {
                        salaDisponible = candidata;
                        break;
                    }
                }

                if (!salaDisponible) {
                    throw new Error(`No hay una sala libre para ${formato} el ${fecha}.`);
                }
                salasAsignadasEseDia.push(salaDisponible.id);
                asignaciones.push({ fecha, formato, salaId: salaDisponible.id });
            }
        }

        const creadas: Funcion[] = [];
        try {
            for (const asignacion of asignaciones) {
                const fila: FuncionInput = {
                    pelicula_id: datos.peliculaId,
                    sala_id: asignacion.salaId,
                    fecha: asignacion.fecha,
                    formato: asignacion.formato,
                    idioma: datos.idioma,
                    es_preventa: datos.esPreventa,
                    activa: true,
                };
                creadas.push(await this.funcionRepository.crearConProyecciones(
                    fila,
                    datos.horariosSeleccionados
                ));
            }
            return creadas;
        } catch (error) {
            await Promise.allSettled(
                creadas.map(funcion => this.funcionRepository.cambiarActiva(funcion.id, false))
            );
            throw error;
        }
    }

    async actualizarFuncion(id: number, datos: CrearFuncionInput): Promise<Funcion> {
        this.validarId(id);
        await this.validarDatos(datos);

        if (datos.formatos.length !== 1) {
            throw new Error('Al editar una función, seleccioná un solo formato.');
        }

        const actual = await this.funcionRepository.obtenerPorId(id);
        const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
        if (!pelicula.activa) {
            throw new Error('No se puede asignar una película inactiva.');
        }

        const formato = datos.formatos[0];
        const salas = await this.salaService.listarSalas();
        const salaActual = salas.find(sala => sala.id === actual.sala_id);
        let salaId = actual.sala_id;

        if (!salaActual?.activa || salaActual.formato !== formato || actual.fecha !== datos.fecha) {
            const sala = await this.buscarSalaDisponible(formato, datos.fecha, id);
            salaId = sala.id;
        }

        const fila: FuncionInput = {
            pelicula_id: datos.peliculaId,
            sala_id: salaId,
            fecha: datos.fecha,
            formato,
            idioma: datos.idioma,
            es_preventa: datos.esPreventa,
            activa: actual.activa,
        };

        return this.funcionRepository.actualizarConProyecciones(
            id,
            fila,
            datos.horariosSeleccionados
        );
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        this.validarId(id);
        return this.funcionRepository.cambiarActiva(id, activa);
    }

    /** Da de baja la programación de una sala y luego la sala. */
    async desactivarSalaConFunciones(salaId: number): Promise<void> {
        this.validarId(salaId);
        const funciones = (await this.funcionRepository.listar()).filter(
            funcion => funcion.sala_id === salaId && funcion.activa
        );
        const desactivadas: Funcion[] = [];

        try {
            for (const funcion of funciones) {
                await this.funcionRepository.cambiarActiva(funcion.id, false);
                desactivadas.push(funcion);
            }

            await this.salaService.cambiarActiva(salaId, false);
        } catch (error) {
            await Promise.allSettled(
                desactivadas.map(funcion => this.funcionRepository.cambiarActiva(funcion.id, true))
            );
            throw error;
        }
    }

    async eliminarFuncion(id: number): Promise<void> {
        return this.cambiarActiva(id, false);
    }

    private async buscarSalaDisponible(
        formato: FormatoSala,
        fecha: string,
        excluirFuncionId?: number
    ) {
        const salas = await this.salaService.listarSalas();
        for (const sala of salas.filter(item => item.activa && item.formato === formato)) {
            const ocupada = await this.funcionRepository.existeFuncionActivaEnSala(
                sala.id,
                fecha,
                excluirFuncionId
            );
            if (!ocupada) return sala;
        }
        throw new Error(`No hay una sala disponible para el formato ${formato} en la fecha seleccionada.`);
    }

    private async validarDatos(datos: CrearFuncionInput): Promise<void> {
        this.validarId(datos.peliculaId);

        if (!Array.isArray(datos.formatos) || datos.formatos.length === 0) {
            throw new Error('Seleccioná al menos un formato.');
        }
        if (datos.formatos.some(formato => !FORMATOS_SALA.includes(formato))) {
            throw new Error('Uno de los formatos seleccionados no es válido.');
        }
        if (new Set(datos.formatos).size !== datos.formatos.length) {
            throw new Error('No repitas formatos.');
        }
        if (!datos.fecha || datos.fecha < this.fechaActualDelCine()) {
            throw new Error('La fecha debe ser hoy o una fecha futura.');
        }
        if (![1, 7, 14, 21, 28].includes(datos.dias)) {
            throw new Error('La duración debe ser de un día o de una a cuatro semanas.');
        }
        if (datos.idioma !== 'Subtitulada' && datos.idioma !== 'Doblada') {
            throw new Error('El idioma seleccionado no es válido.');
        }
        if (typeof datos.esPreventa !== 'boolean') {
            throw new Error('Indicá si la función estará en preventa.');
        }
        if (!Array.isArray(datos.horariosSeleccionados) || datos.horariosSeleccionados.length === 0) {
            throw new Error('Seleccioná al menos un horario disponible.');
        }
        if (new Set(datos.horariosSeleccionados).size !== datos.horariosSeleccionados.length) {
            throw new Error('No repitas horarios.');
        }

        const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
        validarHorariosFuncion(pelicula.duracion, datos.horariosSeleccionados);
        if (datos.fecha === this.fechaActualDelCine()) {
            const ahora = this.horaActualDelCine();
            if (datos.horariosSeleccionados.some(horario => horario <= ahora)) {
                throw new Error('No podés programar horarios que ya pasaron.');
            }
        }
    }

    private generarFechas(fechaInicio: string, cantidadDias: number): string[] {
        const fecha = new Date(`${fechaInicio}T00:00:00Z`);
        return Array.from({ length: cantidadDias }, (_, indice) => {
            const dia = new Date(fecha);
            dia.setUTCDate(fecha.getUTCDate() + indice);
            return dia.toISOString().slice(0, 10);
        });
    }

    private validarId(id: number): void {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El identificador debe ser un entero positivo.');
        }
    }

    private fechaActualDelCine(): string {
        return this.partesFechaHoraDelCine().fecha;
    }

    private horaActualDelCine(): string {
        return this.partesFechaHoraDelCine().hora;
    }

    private partesFechaHoraDelCine(): { fecha: string; hora: string } {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date());
        const valor = (tipo: string) => partes.find(parte => parte.type === tipo)!.value;

        return {
            fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
            hora: `${valor('hour')}:${valor('minute')}`,
        };
    }
}
