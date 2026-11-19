import { Inject, Injectable } from '@angular/core';
import { ReporteVentasDiario } from './reporte-ventas.model';
import { ReporteVentasRepository } from './reporte-ventas.repository';

@Injectable({ providedIn: 'root' })
export class ReporteVentasService {
    constructor(
        @Inject(ReporteVentasRepository)
        private readonly reporteVentasRepository: ReporteVentasRepository,
    ) {}

    obtenerPorDia(fecha: string): Promise<ReporteVentasDiario> {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            throw new Error('Seleccioná una fecha válida.');
        }

        const fechaValida = new Date(`${fecha}T00:00:00Z`);

        if (Number.isNaN(fechaValida.getTime()) || fechaValida.toISOString().slice(0, 10) !== fecha) {
            throw new Error('Seleccioná una fecha válida.');
        }

        return this.reporteVentasRepository.obtenerPorDia(fecha);
    }
}
