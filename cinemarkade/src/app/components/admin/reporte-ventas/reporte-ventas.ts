import { DatePipe, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ReporteVentasDiario } from '../../../core/reporte-ventas/reporte-ventas.model';
import { ReporteVentasService } from '../../../core/reporte-ventas/reporte-ventas.service';

@Component({
    selector: 'app-reporte-ventas',
    imports: [CurrencyPipe, DatePipe],
    templateUrl: './reporte-ventas.html',
    styleUrl: './reporte-ventas.scss',
})
export class ReporteVentas implements OnInit {
    private readonly reporteVentasService = inject(ReporteVentasService);

    readonly fechaSeleccionada = signal(this.fechaHoyEnArgentina());
    readonly reporte = signal<ReporteVentasDiario | null>(null);
    readonly cargando = signal(true);
    readonly error = signal('');

    constructor() { }

    ngOnInit(): void {
        void this.cargarReporte(this.fechaSeleccionada());
    }

    async cambiarFecha(evento: Event): Promise<void> {
        const campoFecha = evento.target as HTMLInputElement;
        const fecha = campoFecha.value;

        if (!fecha) {
            return;
        }

        this.fechaSeleccionada.set(fecha);
        await this.cargarReporte(fecha);
    }

    async cargarReporte(fecha = this.fechaSeleccionada()): Promise<void> {
        this.cargando.set(true);
        this.error.set('');

        try {
            this.reporte.set(await this.reporteVentasService.obtenerPorDia(fecha));
        } catch (error) {
            console.error('No se pudo cargar el reporte de ventas:', error);
            this.reporte.set(null);
            this.error.set(
                error instanceof Error ? error.message : 'No se pudo cargar el reporte de ventas.',
            );
        } finally {
            this.cargando.set(false);
        }
    }

    private fechaHoyEnArgentina(): string {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
    }
}
