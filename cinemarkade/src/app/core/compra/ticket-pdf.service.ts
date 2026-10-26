import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { CompraValidadaQr } from './compra.model';

export interface TicketPdfDetalle {
    nombre: string;
    cantidad: number;
    total: number;
}

export interface TicketPdfDatos {
    tipoCompra?: 'entradas' | 'candy';
    compraId: string;
    codigoManual?: string;
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
    puntosUsados?: number;
}

@Injectable({ providedIn: 'root' })
export class TicketPdfService {
    generarDesdeCompra(ticket: CompraValidadaQr, qrDataUrl: string, cupon: string | null = null): Blob {
        const [anio, mes, dia] = ticket.fecha.slice(0, 10).split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return this.generar({
            tipoCompra: ticket.compra.proyeccion_id === null ? 'candy' : 'entradas',
            compraId: ticket.compra.id,
            codigoManual: ticket.compra.codigo_manual,
            qrDataUrl,
            pelicula: ticket.compra.proyeccion_id === null ? 'PEDIDO DE CANDY' : ticket.pelicula,
            fecha,
            horario: ticket.horario.slice(0, 5),
            sala: ticket.sala_id,
            formato: ticket.formato,
            idioma: ticket.idioma,
            butacas: ticket.butacas.map(butaca => `${butaca.fila}${butaca.columna}`),
            detalles: ticket.detalles.map(detalle => ({
                nombre: `${detalle.nombre_item}${detalle.puntos_usados ? ` (${detalle.puntos_usados} PTS)` : ''}`,
                cantidad: detalle.cantidad,
                total: detalle.precio_unitario * detalle.cantidad
            })),
            cupon,
            recargoVip: ticket.butacas.filter(butaca => butaca.tipo === 'vip').length * 5000,
            total: Number(ticket.compra.total),
            puntos: Number(ticket.compra.puntos_generados),
            puntosUsados: ticket.butacas.reduce((total, butaca) => total + Number(butaca.puntos_usados ?? 0), 0) +
                ticket.detalles.reduce((total, detalle) => total + Number(detalle.puntos_usados ?? 0), 0)
        });
    }

    generar(datos: TicketPdfDatos): Blob {
        if (datos.tipoCompra !== 'candy' && datos.butacas.length === 0) {
            throw new Error('No se puede generar un ticket sin butacas.');
        }

        if (!datos.codigoManual || !/^[0-9A-F]{10}$/.test(datos.codigoManual)) {
            throw new Error('La compra no tiene un código manual válido.');
        }

        const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
        const ancho = pdf.internal.pageSize.getWidth();
        const alto = pdf.internal.pageSize.getHeight();
        const margen = 15;
        const anchoTexto = ancho - margen * 2;
        let y = 18;

        const dibujarPagina = (): void => {
            pdf.setFillColor(10, 10, 12);
            pdf.rect(0, 0, ancho, alto, 'F');
            pdf.setDrawColor(255, 204, 0);
            pdf.setLineWidth(0.6);
            pdf.rect(8, 8, ancho - 16, alto - 16);
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(220, 220, 220);
        };

        const reservar = (altura: number): void => {
            if (y + altura > alto - 18) {
                pdf.addPage('a5');
                dibujarPagina();
                y = 20;
            }
        };

        const texto = (contenido: string, color: number[] = [220, 220, 220]): void => {
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(10);
            const lineas: string[] = pdf.splitTextToSize(contenido, anchoTexto);

            for (const linea of lineas) {
                reservar(6);
                pdf.setTextColor(color[0], color[1], color[2]);
                pdf.text(linea, margen, y);
                y += 5;
            }

            y += 2;
        };

        const seccion = (titulo: string): void => {
            reservar(16);
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 255, 255);
            pdf.text(titulo, margen, y);
            y += 8;
        };

        dibujarPagina();
        pdf.setTextColor(255, 204, 0);
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(18);
        pdf.text('CINEMARKADE', margen, y);
        y += 7;
        pdf.setFontSize(8);
        pdf.setTextColor(0, 255, 255);
        pdf.text('TICKET DE COMPRA', margen, y);
        y += 7;
        pdf.setDrawColor(80, 80, 86);
        pdf.line(margen, y, ancho - margen, y);
        y += 6;

        pdf.setFontSize(14);
        const titulo: string[] = pdf.splitTextToSize(datos.pelicula.toUpperCase(), anchoTexto);

        for (const linea of titulo) {
            reservar(8);
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(255, 255, 255);
            pdf.text(linea, margen, y);
            y += 7;
        }

        y += 1;
        if (datos.tipoCompra === 'candy') {
            texto(`Fecha de compra: ${datos.fecha}`);
        } else {
            texto(`${datos.fecha} · ${datos.horario}`);
            texto(`SALA ${datos.sala} · ${datos.formato} · ${datos.idioma}`);
            seccion('ENTRADAS Y BUTACAS');
            texto(`${datos.butacas.length} entrada(s)`);
            texto(`Butacas: ${datos.butacas.join(', ')}`);
        }
        seccion('PRODUCTOS Y RECOMPENSAS');

        if (datos.detalles.length === 0) {
            texto('Sin productos ni combos');
        }

        for (const detalle of datos.detalles) {
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(10);
            const importe = this.formatearPrecio(detalle.total);
            const anchoImporte = pdf.getTextWidth(importe) + 6;
            const lineas: string[] = pdf.splitTextToSize(
                `${detalle.cantidad} x ${detalle.nombre}`,
                Math.max(35, anchoTexto - anchoImporte)
            );

            for (let indice = 0; indice < lineas.length; indice++) {
                reservar(7);
                pdf.setFont('courier', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(220, 220, 220);
                pdf.text(lineas[indice], margen, y);

                if (indice === 0) {
                    pdf.text(importe, ancho - margen, y, { align: 'right' });
                }

                y += 5;
            }

            y += 3;
        }

        if (datos.cupon) {
            texto(`Cupón aplicado: ${datos.cupon}`);
        }

        if (datos.recargoVip > 0) {
            texto(`Recargo butacas VIP: ${this.formatearPrecio(datos.recargoVip)}`);
        }

        reservar(32);
        y += 3;
        pdf.setDrawColor(255, 204, 0);
        pdf.line(margen, y, ancho - margen, y);
        y += 10;
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(255, 204, 0);
        pdf.text('TOTAL', margen, y);
        pdf.text(this.formatearPrecio(datos.total), ancho - margen, y, { align: 'right' });
        y += 9;
        texto(`Puntos generados: ${datos.puntos.toLocaleString('es-AR')}`);

        if (datos.puntosUsados) {
            texto(`Puntos usados: ${datos.puntosUsados.toLocaleString('es-AR')}`);
        }

        // El bloque de acceso ocupa su propio espacio debajo del total.
        reservar(57);
        y += 4;
        pdf.setDrawColor(80, 80, 86);
        pdf.line(margen, y, ancho - margen, y);
        y += 8;
        const codigo = `${datos.codigoManual.slice(0, 5)}-${datos.codigoManual.slice(5)}`;
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 255, 255);
        pdf.text('CÓDIGO MANUAL', margen, y);
        pdf.setFontSize(13);
        pdf.setTextColor(255, 255, 255);
        pdf.text(codigo, margen, y + 9);
        pdf.addImage(datos.qrDataUrl, 'PNG', ancho - margen - 32, y - 3, 32, 32);
        y += 34;
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(175, 175, 180);
        pdf.text(`Compra: ${datos.compraId}`, margen, y);
        y += 5;
        pdf.text(datos.tipoCompra === 'candy' ? 'Presentá el QR o el código manual para retirar tu candy.' : 'Presentá el QR o el código manual al ingresar.', margen, y);

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
