import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CarritoCandyService } from '../../core/candy/carrito-candy.service';
import { Navbar } from '../navbar/navbar';
import { Loader } from '../loader/loader';
import { Modal } from '../modal/modal';
import { CompraService } from '../../core/compra/compra.service';
import { BorradorCompra } from '../../core/compra/borrador-compra.model';
import {
    CatalogosConfirmacionCompra,
    PreparacionCompraService,
} from '../../core/compra/preparacion-compra.service';
import { TicketPdfService } from '../../core/compra/ticket-pdf.service';
import { AuthService } from '../../auth/auth.service';
import { CuponService } from '../../core/cupon/cupon.service';
import { DatosEntrada } from './components/datos-entrada/datos-entrada';
import { DetalleCompra } from './components/detalle-compra/detalle-compra';
import { TotalesCompra } from './components/totales-compra/totales-compra';
import { ResultadoCompra } from './components/resultado-compra/resultado-compra';
import QRCode from 'qrcode';
import { NotificacionService } from '../../core/notificacion/notificacion.service';
import { environment } from '../../../environments/environment';

@Component({
    imports: [Navbar, Loader, Modal, DatosEntrada, DetalleCompra, TotalesCompra, ResultadoCompra],
    selector: 'app-confirmacion-compra',
    styleUrl: './confirmacion-compra.scss',
    templateUrl: './confirmacion-compra.html',
})
export class ConfirmacionCompra implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly carrito = inject(CarritoCandyService);
    readonly esCandy = this.route.snapshot.queryParamMap.get('tipo') === 'candy';
    private readonly compraService = inject(CompraService);
    private readonly preparacionCompra = inject(PreparacionCompraService);
    private readonly ticketPdfService = inject(TicketPdfService);
    private readonly authService = inject(AuthService);
    private readonly cuponService = inject(CuponService);
    private readonly notificacionService = inject(NotificacionService);
    private readonly catalogos = signal<CatalogosConfirmacionCompra>({
        peliculas: [],
        productos: [],
        combos: [],
        butacas: [],
    });

    borrador = signal<BorradorCompra | null>(null);
    cargando = signal(true);
    confirmando = signal(false);
    compraId = signal('');
    codigoManual = signal('');
    preparandoTicket = signal(false);
    qrGenerado = signal<string | null>(null);
    ticketPdf = signal<Blob | null>(null);
    compraAnonima = signal(false);
    mostrarModalConfirmacion = signal(false);
    mostrarModalExito = signal(false);
    recordatorioPreventaActivo = signal(false);
    pushPreventaActivo = signal(false);
    error = signal('');

    readonly resumen = computed(() => {
        const borrador = this.borrador();

        return borrador ? this.preparacionCompra.crearResumen(borrador, this.catalogos()) : null;
    });

    async ngOnInit(): Promise<void> {
        try {
            const borrador = this.preparacionCompra.recuperarBorrador(this.esCandy);
            this.catalogos.set(await this.preparacionCompra.cargarCatalogos(borrador));
            const tieneSesion = await this.authService.haySesionActiva();
            const bienvenida = tieneSesion
                ? await this.cuponService.obtenerBienvenidaDisponible()
                : null;
            const actualizado = this.preparacionCompra.aplicarBienvenida(borrador, bienvenida);
            actualizado.puntosEstimados = tieneSesion ? Math.floor(actualizado.total) : 0;
            this.borrador.set(actualizado);
            sessionStorage.setItem('cinemarkade-compra-borrador', JSON.stringify(actualizado));
        } catch (error) {
            console.error('No se pudo preparar el ticket:', error);
            this.error.set(
                error instanceof Error
                    ? error.message
                    : 'No se pudo cargar el resumen de la compra.',
            );
        } finally {
            this.cargando.set(false);
        }
    }

    async confirmarCompra(): Promise<void> {
        const borrador = this.borrador();

        if (!borrador || this.confirmando() || this.compraId()) {
            return;
        }

        const catalogos = this.catalogos();

        try {
            this.preparacionCompra.validarButacas(borrador, catalogos.butacas);
        } catch (error) {
            this.error.set(
                error instanceof Error ? error.message : 'No se pudieron validar las butacas.',
            );
            return;
        }

        this.error.set('');
        this.mostrarModalConfirmacion.set(false);
        this.confirmando.set(true);

        try {
            const esPreventa = !this.esCandy && borrador.proyeccion?.esPreventa === true;
            const usuarioActualId = this.authService.usuarioActual()?.id;
            const promesaSuscripcionPush = esPreventa && usuarioActualId
                ? this.notificacionService.suscribirPush(
                      usuarioActualId,
                      environment.VAPID_PUBLIC_KEY,
                  )
                : null;
            const tieneSesion = await this.authService.haySesionActiva();
            this.compraAnonima.set(!tieneSesion);

            if (esPreventa && tieneSesion && promesaSuscripcionPush) {
                try {
                    await promesaSuscripcionPush;
                    this.pushPreventaActivo.set(true);
                } catch (error) {
                    console.info('La compra continuará sin activar push:', error);
                }
            }

            if (this.esCandy) {
                const usuarioId = await this.authService.obtenerIdUsuarioSesion();

                if (usuarioId !== borrador.usuarioId) {
                    throw new Error(
                        'La sesión cambió. Volvé a la tienda para revisar el carrito de tu usuario.',
                    );
                }
            }

            const datos = this.preparacionCompra.prepararSolicitud(
                borrador,
                catalogos,
                tieneSesion,
            );

            const id = await this.compraService.confirmarCompra(datos);
            this.compraId.set(id);

            if (esPreventa && tieneSesion && borrador.proyeccion?.proyeccionId) {
                try {
                    await this.notificacionService.activarRecordatorioPorCompra(
                        borrador.proyeccion.proyeccionId,
                    );
                    this.recordatorioPreventaActivo.set(true);
                } catch (error) {
                    console.error('La compra quedó confirmada, pero falló el recordatorio:', error);
                }
            }

            if (this.esCandy) {
                this.carrito.vaciar();
            }

            if (tieneSesion) {
                try {
                    await this.authService.refrescarUsuarioActual();
                } catch (e) {
                    console.error('La compra se confirmó; no se pudo refrescar el saldo:', e);
                }
            }

            sessionStorage.removeItem('cinemarkade-compra-borrador');

            try {
                await this.prepararTicket();
            } catch (error) {
                console.error('La compra se confirmó, pero no se pudo preparar el PDF:', error);
                this.error.set(
                    'La compra quedó confirmada, pero no se pudo generar el ticket. Usá Reintentar descarga.',
                );
            }

            if (!tieneSesion && this.ticketPdf()) {
                await this.descargarTicket();
            }

            this.mostrarModalExito.set(true);
        } catch (error) {
            console.error('No se pudo confirmar la compra:', error);
            this.error.set(
                error instanceof Error
                    ? error.message
                    : 'No se pudo confirmar la compra. Intentá nuevamente.',
            );
        } finally {
            this.confirmando.set(false);
        }
    }

    cancelar(): void {
        sessionStorage.removeItem('cinemarkade-compra-borrador');
        void this.router.navigate([this.esCandy ? '/tienda' : '/']);
    }

    abrirModalConfirmacion(): void {
        this.mostrarModalConfirmacion.set(true);
    }

    cerrarModalConfirmacion(): void {
        this.mostrarModalConfirmacion.set(false);
    }

    cerrarModalExito(): void {
        this.mostrarModalExito.set(false);
    }

    irAMisEntradas(): void {
        this.mostrarModalExito.set(false);
        void this.router.navigate([this.esCandy ? '/historial-compras' : '/mis-entradas']);
    }

    volverAlInicio(): void {
        this.mostrarModalExito.set(false);
        void this.router.navigate(['/']);
    }

    async descargarTicket(): Promise<void> {
        if (this.preparandoTicket() || !this.compraId()) {
            return;
        }

        this.preparandoTicket.set(true);
        this.error.set('');

        try {
            if (!this.ticketPdf()) {
                await this.prepararTicket();
            }

            this.ticketPdfService.descargar(this.ticketPdf()!, this.compraId());
        } catch (error) {
            this.error.set(
                error instanceof Error ? error.message : 'No se pudo descargar el ticket.',
            );
        } finally {
            this.preparandoTicket.set(false);
        }
    }

    private async prepararTicket(): Promise<void> {
        const borrador = this.borrador();

        if (!borrador?.solicitudId || !this.compraId()) {
            throw new Error('No se encontró la solicitud de la compra confirmada.');
        }

        const ticket = await this.compraService.obtenerTicketConfirmado(borrador.solicitudId);

        if (ticket.compra.id !== this.compraId() || !ticket.compra.codigo_qr) {
            throw new Error('El ticket recuperado no corresponde a una compra disponible.');
        }

        const qrDataUrl = await QRCode.toDataURL(ticket.compra.codigo_qr, {
            width: 320,
            margin: 2,
        });
        this.qrGenerado.set(qrDataUrl);
        this.codigoManual.set(ticket.compra.codigo_manual ?? '');
        this.borrador.set({
            ...borrador,
            total: Number(ticket.compra.total),
            puntosEstimados: Number(ticket.compra.puntos_generados),
        });
        this.ticketPdf.set(
            this.ticketPdfService.generarDesdeCompra(
                ticket,
                qrDataUrl,
                borrador.cupon?.codigo ?? null,
            ),
        );
    }
}
