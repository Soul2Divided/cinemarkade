export interface ReporteVentasDiario {
    fecha: string;
    facturacionPesos: number;
    entradasVendidas: number;
}

export interface DatoGraficoReporte {
    etiqueta: string;
    cantidad: number;
}

export interface EstadisticasReporte {
    peliculasSemana: DatoGraficoReporte[];
    peliculasMes: DatoGraficoReporte[];
    productosCandy: DatoGraficoReporte[];
}
