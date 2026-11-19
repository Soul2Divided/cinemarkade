import { Injectable } from '@angular/core';
import { ReporteVentasDiario } from './reporte-ventas.model';

@Injectable()
export abstract class ReporteVentasRepository {
    abstract obtenerPorDia(fecha: string): Promise<ReporteVentasDiario>;
}
