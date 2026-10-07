import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface TicketPdfDetalle {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface TicketPdfDatos {
  compraId: string;
  qrDataUrl: string;
  pelicula: string;
  fecha: string;
  horario: string;
  sala: number;
  formato: string;
  idioma: string;
  butacas: string[];
  detalles: TicketPdfDetalle[];
  cupon: string | null;
  recargoVip: number;
  total: number;
  puntos: number;
}

@Injectable({ providedIn: 'root' })
export class TicketPdfService {
  generar(datos: TicketPdfDatos): Blob {
    const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 15;

    pdf.setFillColor(10, 10, 12);
    pdf.rect(0, 0, ancho, alto, 'F');
    pdf.setDrawColor(255, 204, 0);
    pdf.setLineWidth(1.2);
    pdf.rect(8, 8, ancho - 16, alto - 16);

    pdf.setTextColor(255, 204, 0);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(18);
    pdf.text('CINEMARKADE', margen, 23);
    pdf.setTextColor(0, 255, 255);
    pdf.setFontSize(8);
    pdf.text('TICKET DE COMPRA', ancho - margen, 22, { align: 'right' });

    pdf.setDrawColor(80, 80, 86);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(margen, 30, ancho - margen, 30);
    pdf.setLineDashPattern([], 0);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(16);
    const titulo = pdf.splitTextToSize(datos.pelicula.toUpperCase(), ancho - margen * 2);
    pdf.text(titulo, margen, 41);
    let y = 41 + titulo.length * 7;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(175, 175, 180);
    pdf.text(`${datos.fecha} · ${datos.horario}`, margen, y);
    y += 7;
    pdf.text(`SALA ${datos.sala} · ${datos.formato} · ${datos.idioma}`, margen, y);
    y += 10;

    pdf.setTextColor(0, 255, 255);
    pdf.setFont('courier', 'bold');
    pdf.text('ENTRADAS Y BUTACAS', margen, y);
    y += 7;
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('courier', 'normal');
    pdf.text(`${datos.butacas.length} entrada(s) general`, margen, y);
    y += 6;
    pdf.text(`Butacas: ${datos.butacas.join(', ')}`, margen, y);
    y += 10;

    pdf.setTextColor(0, 255, 255);
    pdf.setFont('courier', 'bold');
    pdf.text('CANDY BAR', margen, y);
    y += 6;
    pdf.setFont('courier', 'normal');
    pdf.setTextColor(220, 220, 220);
    if (datos.detalles.length === 0) {
      pdf.text('Sin productos ni combos', margen, y);
      y += 6;
    } else {
      for (const detalle of datos.detalles) {
        const linea = `${detalle.cantidad} x ${detalle.nombre}`;
        const lineas = pdf.splitTextToSize(linea, ancho - margen * 2 - 30);
        pdf.text(lineas, margen, y);
        pdf.text(this.formatearPrecio(detalle.total), ancho - margen, y, { align: 'right' });
        y += lineas.length * 5 + 2;
        if (y > alto - 65) {
          pdf.addPage('a5');
          pdf.setFillColor(10, 10, 12);
          pdf.rect(0, 0, ancho, alto, 'F');
          pdf.setTextColor(220, 220, 220);
          y = 20;
        }
      }
    }

    if (datos.cupon) {
      y += 3;
      pdf.setTextColor(0, 255, 255);
      pdf.text(`Cupon aplicado: ${datos.cupon}`, margen, y);
      y += 6;
    }
    if (datos.recargoVip > 0) {
      pdf.setTextColor(220, 220, 220);
      pdf.text(`Recargo butacas VIP: ${this.formatearPrecio(datos.recargoVip)}`, margen, y);
      y += 7;
    }

    const pie = Math.min(Math.max(y + 8, alto - 48), alto - 48);
    pdf.setDrawColor(255, 204, 0);
    pdf.setLineDashPattern([], 0);
    pdf.line(margen, pie, ancho - margen, pie);
    pdf.setTextColor(255, 204, 0);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(13);
    pdf.text('TOTAL', margen, pie + 10);
    pdf.text(this.formatearPrecio(datos.total), ancho - margen, pie + 10, { align: 'right' });
    pdf.setTextColor(175, 175, 180);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Puntos generados: ${datos.puntos.toLocaleString('es-AR')}`, margen, pie + 19);
    pdf.text(`Compra: ${datos.compraId}`, margen, pie + 27);
    pdf.setTextColor(110, 110, 116);
    pdf.setFontSize(7);
    pdf.setTextColor(0, 255, 255);
    pdf.text('QR DE VALIDACIÓN', ancho - margen, alto - 58, { align: 'right' });
    pdf.addImage(datos.qrDataUrl, 'PNG', ancho - margen - 32, alto - 54, 32, 32);
    pdf.setTextColor(110, 110, 116);
    pdf.text('Presentá este código al ingresar.', ancho / 2, alto - 14, { align: 'center' });

    return pdf.output('blob');
  }

  descargar(blob: Blob, compraId: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `ticket-cinemarkade-${compraId}.pdf`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private formatearPrecio(valor: number): string {
    return `$ ${valor.toLocaleString('es-AR')}`;
  }
}
