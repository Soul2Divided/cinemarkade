import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { Compra } from '../../../core/compra/compra.model';
import { CompraService } from '../../../core/compra/compra.service';
import { Funcion, Proyeccion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import QRCode from 'qrcode';
import { TicketPdfService } from '../../../core/compra/ticket-pdf.service';
import { Navbar } from '../../navbar/navbar';
import { QrCompra } from '../../qr-compra/qr-compra';

interface CompraHistorial {
    compra: Compra;
    pelicula: string;
    imagen: string | null;
    fechaFuncion: string | null;
    horario: string | null;
    sala: number | null;
    formato: string | null;
    idioma: string | null;
}

@Component({
    selector: 'app-historial-compras',
    imports: [CommonModule, Navbar, QrCompra],
    templateUrl: './historial-compras.html',
    styleUrl: './historial-compras.scss',
})
export class HistorialCompras implements OnInit {
    private readonly router = inject(Router);
    private readonly ticketPdfService = inject(TicketPdfService);
    private readonly authService = inject(AuthService);
    private readonly compraService = inject(CompraService);
    private readonly funcionService = inject(FuncionService);
    private readonly peliculaService = inject(PeliculaService);

    readonly historial = signal<CompraHistorial[]>([]);
    readonly cargando = signal(true);
    readonly error = signal('');
    readonly aviso = signal('');
    readonly descargandoId = signal<string | null>(null);
    readonly errorTicket = signal('');
    readonly cargandoQrId = signal<string | null>(null);
    readonly qrImagen = signal<string | null>(null);
    readonly qrCompra = signal<Compra | null>(null);
    private consultaEnCurso = false;

    async ngOnInit(): Promise<void> {
        await this.cargarHistorial();
    }

    async cargarHistorial(): Promise<void> {
        if (this.consultaEnCurso) {
            return;
        }

        this.consultaEnCurso = true;
        this.cargando.set(true);
        this.error.set('');
        this.aviso.set('');

        try {
            const usuarioId = await this.authService.obtenerIdUsuarioSesion();

            if (!usuarioId) {
                await this.router.navigate(['/login']);

                return;
            }

            const compras = await this.compraService.listarPorUsuario(usuarioId);

            if (compras.length === 0) {
                this.historial.set([]);

                return;
            }

            const [resultadoFunciones, resultadoPeliculas] = await Promise.allSettled([
                this.funcionService.listarFunciones(),
                this.peliculaService.listarPeliculas(),
            ]);
            const funciones =
                resultadoFunciones.status === 'fulfilled' ? resultadoFunciones.value : [];
            const peliculas =
                resultadoPeliculas.status === 'fulfilled' ? resultadoPeliculas.value : [];

            for (const resultado of [resultadoFunciones, resultadoPeliculas]) {
                if (resultado.status === 'rejected') {
                    console.error(
                        'No se pudieron completar los datos del historial de compras:',
                        resultado.reason,
                    );
                    this.aviso.set(
                        'Algunos datos de las películas o funciones no están disponibles. Tus compras siguen visibles.',
                    );
                }
            }

            const peliculaPorId = new Map(peliculas.map((pelicula) => [pelicula.id, pelicula]));
            const funcionPorProyeccion = new Map<
                number,
                { funcion: Funcion; proyeccion: Proyeccion }
            >();

            for (const funcion of funciones) {
                for (const proyeccion of funcion.proyecciones) {
                    funcionPorProyeccion.set(proyeccion.id, { funcion, proyeccion });
                }
            }

            this.historial.set(
                compras.map((compra) => {
                    const asociacion = funcionPorProyeccion.get(compra.proyeccion_id ?? -1);
                    const pelicula = asociacion
                        ? peliculaPorId.get(asociacion.funcion.pelicula_id)
                        : null;

                    return {
                        compra,
                        pelicula:
                            compra.proyeccion_id === null
                                ? 'Pedido de candy'
                                : (pelicula?.nombre ?? 'Película no disponible'),
                        imagen: pelicula?.imagen ?? null,
                        fechaFuncion: asociacion?.funcion.fecha ?? null,
                        horario: asociacion?.proyeccion.horario.slice(0, 5) ?? null,
                        sala: asociacion?.funcion.sala_id ?? null,
                        formato: asociacion?.funcion.formato ?? null,
                        idioma: asociacion?.funcion.idioma ?? null,
                    };
                }),
            );
        } catch (error) {
            console.error('No se pudo cargar el historial de compras:', error);
            this.error.set('No pudimos cargar tus compras. Intentá nuevamente.');
        } finally {
            this.consultaEnCurso = false;
            this.cargando.set(false);
        }
    }

    async mostrarQr(compra: Compra): Promise<void> {
        if (this.cargandoQrId()) {
            return;
        }

        this.cargandoQrId.set(compra.id);
        this.errorTicket.set('');
        this.cerrarQr();

        try {
            const actual = await this.compraService.obtenerPorId(compra.id);
            this.historial.update(items => items.map(item =>
                item.compra.id === actual.id ? { ...item, compra: actual } : item
            ));

            if (actual.proyeccion_id !== null || actual.estado?.toLowerCase() !== 'confirmada' || !actual.codigo_qr) {
                throw new Error('Este pedido ya fue retirado o cancelado y no tiene un QR disponible.');
            }

            const imagen = await QRCode.toDataURL(actual.codigo_qr, { width: 480, margin: 4 });
            this.qrCompra.set(actual);
            this.qrImagen.set(imagen);
        } catch (error) {
            this.errorTicket.set(error instanceof Error ? error.message : 'No se pudo mostrar el QR del pedido.');
        } finally {
            this.cargandoQrId.set(null);
        }
    }

    cerrarQr(): void {
        this.qrImagen.set(null);
        this.qrCompra.set(null);
    }

    async descargarCandy(compra: Compra): Promise<void> {
        if (this.descargandoId()) {
            return;
        }

        this.descargandoId.set(compra.id);
        this.errorTicket.set('');

        try {
            if (!compra.solicitud_id) {
                throw new Error('No se encontró la solicitud para recuperar el ticket.');
            }

            const ticket = await this.compraService.obtenerTicketConfirmado(compra.solicitud_id);

            if (!ticket.compra.codigo_qr) {
                throw new Error('El pedido ya no tiene un código de retiro disponible.');
            }

            const qr = await QRCode.toDataURL(ticket.compra.codigo_qr, { width: 320, margin: 2 });
            this.ticketPdfService.descargar(
                this.ticketPdfService.generarDesdeCompra(ticket, qr),
                compra.id,
            );
        } catch (error) {
            this.errorTicket.set(
                error instanceof Error ? error.message : 'No se pudo descargar el ticket.',
            );
        } finally {
            this.descargandoId.set(null);
        }
    }

    estadoCompra(compra: Compra): string {
        const estados: Record<string, string> = {
            confirmada: 'CONFIRMADA',
            cancelada: 'CANCELADA',
            pendiente: 'PENDIENTE',
            utilizada: 'UTILIZADA',
            validada: 'VALIDADA',
        };

        return estados[compra.estado?.toLowerCase() ?? ''] ?? 'ESTADO NO DISPONIBLE';
    }

    esCancelada(compra: Compra): boolean {
        return compra.estado?.toLowerCase() === 'cancelada';
    }

    volverAlPerfil(): void {
        this.router.navigate(['/perfil']);
    }
}
