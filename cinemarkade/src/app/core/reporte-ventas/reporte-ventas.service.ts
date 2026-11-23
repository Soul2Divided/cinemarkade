import { Inject, Injectable } from '@angular/core';
import { EstadisticasReporte, ReporteVentasDiario } from './reporte-ventas.model';
import { ReporteVentasRepository } from './reporte-ventas.repository';

@Injectable({ providedIn: 'root' })
export class ReporteVentasService {
    constructor(
        @Inject(ReporteVentasRepository)
        private readonly reporteVentasRepository: ReporteVentasRepository,
    ) {}

    obtenerPorDia(fecha: string): Promise<ReporteVentasDiario> {
        this.validarFecha(fecha);
        return this.reporteVentasRepository.obtenerPorDia(fecha);
    }

    obtenerEstadisticas(anio: number, mes: number, semana: number): Promise<EstadisticasReporte> {
        if (!Number.isInteger(anio) || anio < 2000 || anio > 9999) {
            throw new Error('Seleccioná un año válido.');
        }
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
            throw new Error('Seleccioná un mes entre 1 y 12.');
        }

        const semanasDelMes = Math.ceil(new Date(Date.UTC(anio, mes, 0)).getUTCDate() / 7);
        if (!Number.isInteger(semana) || semana < 1 || semana > semanasDelMes) {
            throw new Error(`Seleccioná una semana entre 1 y ${semanasDelMes}.`);
        }

        return this.reporteVentasRepository.obtenerEstadisticas(anio, mes, semana);
    }

    private validarFecha(fecha: string): void {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            throw new Error('Seleccioná una fecha válida.');
        }

        const fechaValida = new Date(`${fecha}T00:00:00Z`);
        if (Number.isNaN(fechaValida.getTime()) || fechaValida.toISOString().slice(0, 10) !== fecha) {
            throw new Error('Seleccioná una fecha válida.');
        }
    }
}
