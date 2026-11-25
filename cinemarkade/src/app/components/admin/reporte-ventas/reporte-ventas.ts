import { registrarErrorUsuario } from '../../../core/services/error-usuario';
import { DatePipe, CurrencyPipe } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    ViewChild,
    inject,
    signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Chart as ChartInstance } from 'chart.js';
import { EstadisticasReporte, ReporteVentasDiario } from '../../../core/reporte-ventas/reporte-ventas.model';
import { ReporteVentasService } from '../../../core/reporte-ventas/reporte-ventas.service';
import { ReporteExportacionService } from '../../../core/reporte-ventas/reporte-exportacion.service';

@Component({
    selector: 'app-reporte-ventas',
    imports: [CurrencyPipe, DatePipe],
    templateUrl: './reporte-ventas.html',
    styleUrl: './reporte-ventas.scss',
})
export class ReporteVentas implements OnInit, AfterViewInit, OnDestroy {
    private readonly reporteVentasService = inject(ReporteVentasService);
    private readonly reporteExportacionService = inject(ReporteExportacionService);
    private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
    private vistaLista = false;
    private cargaActual = 0;
    private cargaEstadisticasActual = 0;
    private graficoSemana: ChartInstance | null = null;
    private graficoMes: ChartInstance | null = null;
    private graficoCandy: ChartInstance | null = null;

    @ViewChild('graficoSemanaCanvas') private graficoSemanaCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('graficoMesCanvas') private graficoMesCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('graficoCandyCanvas') private graficoCandyCanvas?: ElementRef<HTMLCanvasElement>;

    readonly fechaSeleccionada = signal(this.fechaHoyEnArgentina());
    readonly anioSeleccionado = signal(Number(this.fechaHoyEnArgentina().slice(0, 4)));
    readonly mesSeleccionado = signal(Number(this.fechaHoyEnArgentina().slice(5, 7)));
    readonly semanaSeleccionada = signal(this.semanaDelMes(this.fechaHoyEnArgentina()));
    readonly reporte = signal<ReporteVentasDiario | null>(null);
    readonly estadisticas = signal<EstadisticasReporte | null>(null);
    readonly cargando = signal(true);
    readonly cargandoEstadisticas = signal(true);
    readonly error = signal('');
    readonly errorEstadisticas = signal('');
    readonly errorExportacion = signal('');

    constructor() { }

    ngOnInit(): void {
        void this.cargarReporte(this.fechaSeleccionada());
        void this.cargarEstadisticas();
    }

    ngAfterViewInit(): void {
        this.vistaLista = true;
        void this.actualizarGraficos();
    }

    ngOnDestroy(): void {
        this.vistaLista = false;
        this.graficoSemana?.destroy();
        this.graficoMes?.destroy();
        this.graficoCandy?.destroy();
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

    async cambiarPeriodoEstadisticas(): Promise<void> {
        const semanasDisponibles = this.semanasDelMes();
        if (this.semanaSeleccionada() > semanasDisponibles) {
            this.semanaSeleccionada.set(semanasDisponibles);
        }

        await this.cargarEstadisticas();
    }

    async exportarPdf(): Promise<void> {
        const reporte = this.reporte();
        if (!reporte) {
            return;
        }

        this.errorExportacion.set('');

        try {
            await this.reporteExportacionService.exportarPdf(reporte);
        } catch (error) {
            this.errorExportacion.set(registrarErrorUsuario('Error al exportar el reporte a PDF:', error));
        }
    }

    exportarCsv(): void {
        const reporte = this.reporte();
        if (!reporte) {
            return;
        }

        this.errorExportacion.set('');

        try {
            this.reporteExportacionService.exportarCsv(reporte);
        } catch (error) {
            this.errorExportacion.set(registrarErrorUsuario('Error al exportar el reporte a CSV:', error));
        }
    }

    async cargarReporte(fecha = this.fechaSeleccionada()): Promise<void> {
        const carga = ++this.cargaActual;
        this.cargando.set(true);
        this.error.set('');
        const resultadoDiario = await Promise.resolve()
            .then(() => this.reporteVentasService.obtenerPorDia(fecha))
            .then(value => ({ status: 'fulfilled' as const, value }))
            .catch(reason => ({ status: 'rejected' as const, reason }));

        if (carga !== this.cargaActual) {
            return;
        }

        if (resultadoDiario.status === 'fulfilled') {
            this.reporte.set(resultadoDiario.value);
        } else {
            this.reporte.set(null);
            this.error.set(registrarErrorUsuario('Error al cargar el reporte diario:', resultadoDiario.reason));
        }

        this.cargando.set(false);
    }

    async cargarEstadisticas(): Promise<void> {
        const carga = ++this.cargaEstadisticasActual;
        this.cargandoEstadisticas.set(true);
        this.errorEstadisticas.set('');
        this.estadisticas.set(null);
        this.destruirGraficos();

        try {
            const datos = await this.reporteVentasService.obtenerEstadisticas(
                this.anioSeleccionado(),
                this.mesSeleccionado(),
                this.semanaSeleccionada(),
            );

            if (carga !== this.cargaEstadisticasActual) {
                return;
            }

            this.estadisticas.set(datos);
            this.cargandoEstadisticas.set(false);
            void this.actualizarGraficos();
        } catch (error) {
            if (carga !== this.cargaEstadisticasActual) {
                return;
            }

            this.errorEstadisticas.set(
                registrarErrorUsuario('Error en reporte-ventas.ts:', error),
            );
            this.cargandoEstadisticas.set(false);
        }
    }

    private async actualizarGraficos(): Promise<void> {
        if (!this.esNavegador || !this.vistaLista) {
            return;
        }

        const estadisticas = this.estadisticas();
        if (!estadisticas) {
            this.destruirGraficos();
            return;
        }

        const { default: Chart } = await import('chart.js/auto');

        if (!this.vistaLista || this.estadisticas() !== estadisticas) {
            return;
        }

        this.destruirGraficos();
        const colores = ['#00e5ff', '#ffcc00', '#ff477e', '#8d6bff', '#59e391', '#ff914d'];
        const opcionesTorta = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: { color: '#f5f5f5', padding: 18 },
                },
            },
        };

        if (this.graficoSemanaCanvas) {
            this.graficoSemana = new Chart(this.graficoSemanaCanvas.nativeElement, {
                type: 'pie',
                data: {
                    labels: estadisticas.peliculasSemana.map(item => item.etiqueta),
                    datasets: [{
                        data: estadisticas.peliculasSemana.map(item => item.cantidad),
                        backgroundColor: colores,
                        borderColor: '#111',
                        borderWidth: 2,
                    }],
                },
                options: opcionesTorta,
            });
        }

        if (this.graficoMesCanvas) {
            this.graficoMes = new Chart(this.graficoMesCanvas.nativeElement, {
                type: 'pie',
                data: {
                    labels: estadisticas.peliculasMes.map(item => item.etiqueta),
                    datasets: [{
                        data: estadisticas.peliculasMes.map(item => item.cantidad),
                        backgroundColor: colores,
                        borderColor: '#111',
                        borderWidth: 2,
                    }],
                },
                options: opcionesTorta,
            });
        }

        if (this.graficoCandyCanvas) {
            this.graficoCandy = new Chart(this.graficoCandyCanvas.nativeElement, {
                type: 'bar',
                data: {
                    labels: estadisticas.productosCandy.map(item => item.etiqueta),
                    datasets: [{
                        label: 'Unidades vendidas',
                        data: estadisticas.productosCandy.map(item => item.cantidad),
                        backgroundColor: '#ffcc00',
                        borderColor: '#00e5ff',
                        borderWidth: 1,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                    },
                    scales: {
                        x: {
                            ticks: { color: '#f5f5f5' },
                            grid: { display: false },
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#f5f5f5', precision: 0 },
                            grid: { color: '#34343a' },
                        },
                    },
                },
            });
        }
    }

    private destruirGraficos(): void {
        this.graficoSemana?.destroy();
        this.graficoMes?.destroy();
        this.graficoCandy?.destroy();
        this.graficoSemana = null;
        this.graficoMes = null;
        this.graficoCandy = null;
    }

    private fechaHoyEnArgentina(): string {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
    }

    semanasDelMes(): number {
        return Math.ceil(new Date(Date.UTC(this.anioSeleccionado(), this.mesSeleccionado(), 0)).getUTCDate() / 7);
    }

    ultimoDiaSemana(): number {
        return Math.min(this.semanaSeleccionada() * 7, new Date(Date.UTC(this.anioSeleccionado(), this.mesSeleccionado(), 0)).getUTCDate());
    }

    porcentajeFacturacionEntradas(reporte: ReporteVentasDiario): number {
        return this.porcentajeFacturacion(reporte.facturacionEntradasPesos, reporte.facturacionPesos);
    }

    porcentajeFacturacionCandy(reporte: ReporteVentasDiario): number {
        return this.porcentajeFacturacion(reporte.facturacionCandyPesos, reporte.facturacionPesos);
    }

    private semanaDelMes(fecha: string): number {
        return Math.ceil(Number(fecha.slice(8, 10)) / 7);
    }

    private porcentajeFacturacion(valor: number, total: number): number {
        return total > 0 ? (valor / total) * 100 : 0;
    }
}
