import { Injectable, Inject } from '@angular/core';
import { FuncionRepository } from './funcion.repository';
import { Funcion, FuncionInput, IdiomaFuncion } from './funcion.model';
import { PeliculaService } from '../pelicula/pelicula.service';
import { SalaService } from '../sala/sala.service';
import { FormatoSala } from '../sala/sala.model';
// import { calcularHorariosDistribuidos } from '../../utils/horario-funcion.util';

// TODAVIA NO TENGO LA FUNCION, CONSULTAR

export interface CrearFuncionesInput {
    peliculaId: number;
    formatos: FormatoSala[];
    fecha: string;
    idioma: IdiomaFuncion;
    precio: number;
    esPreventa: boolean;
    repeticiones: number;
}

export interface ResultadoCreacionFunciones {
    funciones: Funcion[];
    formatosOmitidos: FormatoSala[];
}

@Injectable({ providedIn: 'root' })
export class FuncionService {

    constructor(
        @Inject(FuncionRepository) private funcionRepository: FuncionRepository,
        private peliculaService: PeliculaService,
        private salaService: SalaService
    ) { }

    // async crearFunciones(datos: CrearFuncionesInput): Promise<ResultadoCreacionFunciones> {
    //     const pelicula = await this.peliculaService.obtenerPorId(datos.peliculaId);
    //     const horarios = calcularHorariosDistribuidos(pelicula.duracion, datos.repeticiones);

    //     const funcionesAInsertar: FuncionInput[] = [];
    //     const formatosOmitidos: FormatoSala[] = [];

    //     for (const formato of datos.formatos) {
    //         let sala = await this.salaService.buscarSalaAsignada(datos.peliculaId, formato);

    //         if (!sala) {
    //             sala = await this.salaService.buscarSala(formato).catch(() => null);
    //             if (sala) {
    //                 await this.salaService.asignarPelicula(sala.id, datos.peliculaId);
    //             }
    //         }

    //         if (!sala) {
    //             formatosOmitidos.push(formato);
    //             continue;
    //         }

    //         for (const horario of horarios) {
    //             funcionesAInsertar.push({
    //                 pelicula_id: datos.peliculaId,
    //                 sala_id: sala.id,
    //                 fecha: datos.fecha,
    //                 horario,
    //                 formato,
    //                 idioma: datos.idioma,
    //                 precio: datos.precio,
    //                 es_preventa: datos.esPreventa,
    //             });
    //         }
    //     }

    //     const funciones = funcionesAInsertar.length > 0
    //         ? await this.funcionRepository.crearMuchas(funcionesAInsertar)
    //         : [];

    //     return { funciones, formatosOmitidos };
    // }
}