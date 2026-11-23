import { Injectable } from '@angular/core';
import { EstadisticasReporte, ReporteVentasDiario } from './reporte-ventas.model';

@Injectable()
export abstract class ReporteVentasRepository {
    abstract obtenerPorDia(fecha: string): Promise<ReporteVentasDiario>;
    abstract obtenerEstadisticas(anio: number, mes: number, semana: number): Promise<EstadisticasReporte>;
}
