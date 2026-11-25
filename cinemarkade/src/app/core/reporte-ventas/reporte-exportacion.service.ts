import { Injectable } from '@angular/core';
import { ReporteVentasDiario } from './reporte-ventas.model';

@Injectable({ providedIn: 'root' })
export class ReporteExportacionService {
    async exportarPdf(reporte: ReporteVentasDiario): Promise<void> {
        const { jsPDF } = await import('jspdf');
        const documento = new jsPDF({ unit: 'mm', format: 'a4' });
        const fecha = this.formatearFecha(reporte.fecha);
        const facturacion = this.formatearMoneda(reporte.facturacionPesos);
        const porcentajeEntradas = this.porcentaje(reporte.facturacionEntradasPesos, reporte.facturacionPesos);
        const porcentajeCandy = this.porcentaje(reporte.facturacionCandyPesos, reporte.facturacionPesos);

        documento.setFont('helvetica', 'bold');
        documento.setFontSize(20);
        documento.text('CINEMARKADE', 20, 24);

        documento.setFontSize(14);
        documento.text('REPORTE DE FACTURACIÓN', 20, 35);

        documento.setFont('helvetica', 'normal');
        documento.setFontSize(11);
        documento.text(`Día del reporte: ${fecha}`, 20, 44);
        documento.setDrawColor(40, 40, 40);
        documento.line(20, 50, 190, 50);

        documento.setFont('helvetica', 'bold');
        documento.setFontSize(12);
        documento.text('DESGLOSE DE RECAUDACIÓN', 20, 65);

        this.dibujarGrupoPdf(
            documento,
            'ENTRADAS',
            `${reporte.entradasVendidas} entradas vendidas`,
            this.formatearMoneda(reporte.facturacionEntradasPesos),
            porcentajeEntradas,
            77,
            [0, 180, 220],
        );
        this.dibujarGrupoPdf(
            documento,
            'CANDY',
            'Ventas de productos del candy',
            this.formatearMoneda(reporte.facturacionCandyPesos),
            porcentajeCandy,
            113,
            [255, 190, 35],
        );

        documento.setFillColor(245, 245, 245);
        documento.roundedRect(20, 157, 170, 34, 3, 3, 'F');
        documento.setTextColor(30, 30, 30);
        documento.setFont('helvetica', 'normal');
        documento.setFontSize(10);
        documento.text('TOTAL DEL DÍA', 28, 170);
        documento.setFont('helvetica', 'bold');
        documento.setFontSize(18);
        documento.text(facturacion, 28, 183);

        documento.setFont('helvetica', 'normal');
        documento.setFontSize(9);
        documento.setTextColor(100, 100, 100);
        documento.text(`Generado el ${this.formatearFechaHora(new Date())}`, 20, 278);

        documento.save(`reporte-facturacion_${reporte.fecha}.pdf`);
    }

    exportarCsv(reporte: ReporteVentasDiario): void {
        const filas = [
            ['CINEMARKADE - REPORTE DE FACTURACIÓN'],
            ['Fecha', this.formatearFecha(reporte.fecha)],
            ['Entradas vendidas', String(reporte.entradasVendidas)],
            ['Facturación de entradas (ARS)', this.formatearNumero(reporte.facturacionEntradasPesos)],
            ['Facturación de candy (ARS)', this.formatearNumero(reporte.facturacionCandyPesos)],
            ['Total del día (ARS)', this.formatearNumero(reporte.facturacionPesos)],
        ];
        const contenido = '\uFEFF' + filas
            .map(fila => fila.map(valor => this.escaparCsv(valor)).join(';'))
            .join('\r\n');
        const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.download = `reporte-facturacion_${reporte.fecha}.csv`;
        enlace.click();
        URL.revokeObjectURL(url);
    }

    private formatearFecha(fecha: string): string {
        return new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'long',
            timeZone: 'UTC',
        }).format(new Date(`${fecha}T00:00:00Z`));
    }

    private formatearFechaHora(fecha: Date): string {
        return new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Argentina/Buenos_Aires',
        }).format(fecha);
    }

    private formatearMoneda(valor: number): string {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
        }).format(valor);
    }

    private formatearNumero(valor: number): string {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: false,
        }).format(valor);
    }

    private porcentaje(valor: number, total: number): number {
        return total > 0 ? valor / total : 0;
    }

    private dibujarGrupoPdf(
        documento: import('jspdf').jsPDF,
        titulo: string,
        detalle: string,
        importe: string,
        porcentaje: number,
        posicionY: number,
        color: [number, number, number],
    ): void {
        documento.setTextColor(35, 35, 35);
        documento.setFont('helvetica', 'bold');
        documento.setFontSize(11);
        documento.text(titulo, 20, posicionY);
        documento.text(importe, 190, posicionY, { align: 'right' });
        documento.setFont('helvetica', 'normal');
        documento.setFontSize(9);
        documento.setTextColor(100, 100, 100);
        documento.text(detalle, 20, posicionY + 7);

        documento.setFillColor(230, 230, 230);
        documento.roundedRect(20, posicionY + 11, 170, 7, 2, 2, 'F');
        if (porcentaje > 0) {
            documento.setFillColor(...color);
            documento.roundedRect(20, posicionY + 11, 170 * porcentaje, 7, 2, 2, 'F');
        }
    }

    private escaparCsv(valor: string): string {
        return `"${valor.replaceAll('"', '""')}"`;
    }
}
