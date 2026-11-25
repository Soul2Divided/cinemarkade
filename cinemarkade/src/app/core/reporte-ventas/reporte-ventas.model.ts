export interface ReporteVentasDiario {
    fecha: string;
    facturacionEntradasPesos: number;
    facturacionCandyPesos: number;
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
