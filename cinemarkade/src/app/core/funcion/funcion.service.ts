import { Inject, Injectable } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import {
    CrearFuncionInput,
    Funcion,
    FuncionInput,
} from './funcion.model';
import { FORMATOS_SALA, FormatoSala } from '../sala/sala.model';
import { PeliculaService } from '../pelicula/pelicula.service';
import { SalaService } from '../sala/sala.service';

@Injectable({ providedIn: 'root' })
export class FuncionService {
    constructor(
        @Inject(FuncionRepository)
        private funcionRepository: FuncionRepository,
        private peliculaService: PeliculaService,
        private salaService: SalaService
    ) { }

    listarFunciones(): Promise<Funcion[]> {
        return this.funcionRepository.listar();
    }

    async listarFuncionesActivas(): Promise<Funcion[]> {
        const funciones = await this.funcionRepository.listar();
        return funciones.filter(funcion => funcion.activa);
    }

    async obtenerFuncionPorId(id: number): Promise<Funcion> {
        this.validarId(id);
        return this.funcionRepository.obtenerPorId(id);
    }

    listarFuncionesPorPelicula(peliculaId: number): Promise<Funcion[]> {
        this.validarId(peliculaId);
        return this.funcionRepository.listarPorPelicula(peliculaId);
    }

    async crearFuncion(datos: CrearFuncionInput): Promise<Funcion> {
        this.validarDatos(datos);

        const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
        if (!pelicula.activa) {
            throw new Error('No se puede crear una función para una película inactiva.');
        }

        const sala = await this.buscarSalaDisponible(datos.formato);

        const fila: FuncionInput = {
            pelicula_id: datos.peliculaId,
            sala_id: sala.id,
            fecha: datos.fecha,
            horario: datos.horario,
            formato: datos.formato,
            idioma: datos.idioma,
            precio: datos.precio,
            es_preventa: datos.fecha > this.fechaActualDelCine(),
        };

        return this.funcionRepository.crear(fila);
    }

    async actualizarFuncion(
        id: number,
        datos: CrearFuncionInput
    ): Promise<Funcion> {
        this.validarId(id);
        this.validarDatos(datos);

        const actual = await this.funcionRepository.obtenerPorId(id);
        if (!actual.activa) {
            throw new Error('No se puede editar una función inactiva.');
        }

        const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
        if (!pelicula.activa) {
            throw new Error('No se puede asignar una película inactiva.');
        }

        let salaId = actual.sala_id;

        if (actual.formato !== datos.formato) {
            const sala = await this.buscarSalaDisponible(datos.formato, id);
            salaId = sala.id;
        }

        const fila: FuncionInput = {
            pelicula_id: datos.peliculaId,
            sala_id: salaId,
            fecha: datos.fecha,
            horario: datos.horario,
            formato: datos.formato,
            idioma: datos.idioma,
            precio: datos.precio,
            es_preventa: datos.fecha > this.fechaActualDelCine(),
        };

        return this.funcionRepository.actualizar(id, fila);
    }

    async eliminarFuncion(id: number): Promise<void> {
        this.validarId(id);

        const funcion = await this.funcionRepository.obtenerPorId(id);
        if (!funcion.activa) return;

        await this.funcionRepository.cambiarActiva(id, false);
    }

    private async buscarSalaDisponible(
        formato: FormatoSala,
        excluirFuncionId?: number
    ) {
        const salas = await this.salaService.listarSalas();
        const candidatas = salas.filter(
            sala => sala.activa && sala.formato === formato
        );

        for (const sala of candidatas) {
            const ocupada =
                await this.funcionRepository.existeFuncionActivaEnSala(
                    sala.id,
                    excluirFuncionId
                );

            if (!ocupada) return sala;
        }

        throw new Error(`No hay salas disponibles de formato ${formato}.`);
    }

    private validarDatos(datos: CrearFuncionInput): void {
        this.validarId(datos.peliculaId);

        if (!FORMATOS_SALA.includes(datos.formato)) {
            throw new Error('El formato seleccionado no es válido.');
        }

        if (!datos.fecha || datos.fecha < this.fechaActualDelCine()) {
            throw new Error('La fecha debe ser hoy o una fecha futura.');
        }

        if (!/^\d{2}:\d{2}$/.test(datos.horario)) {
            throw new Error('El horario debe tener formato HH:mm.');
        }

        if (!Number.isFinite(datos.precio) || datos.precio <= 0) {
            throw new Error('El precio debe ser mayor que cero.');
        }

        if (
            datos.idioma !== 'Subtitulada' &&
            datos.idioma !== 'Doblada'
        ) {
            throw new Error('El idioma seleccionado no es válido.');
        }
    }

    private validarId(id: number): void {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('El identificador debe ser un entero positivo.');
        }
    }

    private fechaActualDelCine(): string {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date());

        const valor = (tipo: string) =>
            partes.find(parte => parte.type === tipo)!.value;

        return `${valor('year')}-${valor('month')}-${valor('day')}`;
    }
}