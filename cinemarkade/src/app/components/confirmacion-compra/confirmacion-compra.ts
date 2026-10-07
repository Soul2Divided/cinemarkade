import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Loader } from '../loader/loader';
import { CompraService } from '../../core/compra/compra.service';
import { ConfirmarCompraInput } from '../../core/compra/compra.model';
import { ButacaProyeccionService } from '../../core/butaca-proyeccion/butaca-proyeccion.service';
import { ButacaProyeccionVista } from '../../core/butaca-proyeccion/butaca-proyeccion.model';
import { Pelicula } from '../../core/pelicula/pelicula.model';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { Producto } from '../../core/producto/producto.model';
import { ProductoService } from '../../core/producto/producto.service';
import { Combo } from '../../core/combo/combo.model';
import { ComboService } from '../../core/combo/combo.service';
import { Modal } from '../modal/modal';
import { TicketPdfService } from '../../core/compra/ticket-pdf.service';
import QRCode from 'qrcode';
import { AuthService } from '../../auth/auth.service';

interface ItemBorrador {
  id: number;
  cantidad: number;
}

interface BorradorCompra {
  proyeccion: {
    peliculaId: number;
    proyeccionId: number;
    fecha: string;
    horario: string;
    formato: string;
    idioma: string;
    salaId: number;
  };
  cantidadEntradas: number;
  entradas?: { precio_unitario: number; medio_pago: 'dinero' | 'puntos'; puntos_usados: number }[];
  productos: ItemBorrador[];
  combos: ItemBorrador[];
  cupon?: { codigo?: string; porcentaje_descuento?: number } | null;
  subtotal: number;
  total: number;
  puntosEstimados: number;
  butacaProyeccionIds?: number[];
  butacasSeleccionadas?: string[];
  recargoButacasVip?: number;
}

@Component({
  imports: [CommonModule, Navbar, Loader, Modal],
  selector: 'app-confirmacion-compra',
  styleUrl: './confirmacion-compra.scss',
  templateUrl: './confirmacion-compra.html',
})
export class ConfirmacionCompra implements OnInit {
  private readonly router = inject(Router);
  private readonly compraService = inject(CompraService);
  private readonly butacaProyeccionService = inject(ButacaProyeccionService);
  private readonly peliculaService = inject(PeliculaService);
  private readonly productoService = inject(ProductoService);
  private readonly comboService = inject(ComboService);
  private readonly ticketPdfService = inject(TicketPdfService);
  private readonly authService = inject(AuthService);
  readonly recargoPorButacaVip = 5000;

  borrador = signal<BorradorCompra | null>(null);
  peliculas = signal<Pelicula[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  butacas = signal<ButacaProyeccionVista[]>([]);
  cargando = signal(true);
  confirmando = signal(false);
  compraId = signal('');
  qrGenerado = signal<string | null>(null);
  ticketPdf = signal<Blob | null>(null);
  compraAnonima = signal(false);
  mostrarModalConfirmacion = signal(false);
  mostrarModalExito = signal(false);
  error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const guardado = sessionStorage.getItem('cinemarkade-compra-borrador');
      if (!guardado) {
        this.error.set('No encontramos una compra para confirmar. Volvé a iniciar la compra.');
        return;
      }

      const borrador = JSON.parse(guardado) as BorradorCompra;
      if (!borrador.proyeccion?.proyeccionId || !borrador.butacaProyeccionIds?.length ||
        borrador.butacaProyeccionIds.length !== borrador.cantidadEntradas) {
        this.error.set('Faltan datos de la función o no se seleccionó una butaca por cada entrada.');
        return;
      }
      this.borrador.set(borrador);

      const [peliculas, productos, combos, butacas] = await Promise.all([
        this.peliculaService.listarPeliculas(),
        this.productoService.listarProductos(),
        this.comboService.listarCombos(),
        this.butacaProyeccionService.listarPorProyeccion(borrador.proyeccion.proyeccionId),
      ]);
      this.peliculas.set(peliculas ?? []);
      this.productos.set(productos ?? []);
      this.combos.set(combos ?? []);
      this.butacas.set(butacas ?? []);
    } catch (error) {
      console.error('No se pudo preparar el ticket:', error);
      this.error.set('No se pudo cargar el resumen de la compra. Volvé a la selección de butacas e intentá nuevamente.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombrePelicula(): string {
    const id = this.borrador()?.proyeccion.peliculaId;
    return this.peliculas().find(pelicula => pelicula.id === id)?.nombre ?? 'Película';
  }

  cantidadProducto(id: number): number {
    return this.productos().find(item => item.id === id)?.precio ?? 0;
  }

  nombreProducto(id: number): string {
    return this.productos().find(item => item.id === id)?.nombre ?? 'Producto';
  }

  nombreCombo(id: number): string {
    return this.combos().find(item => item.id === id)?.nombre ?? 'Combo';
  }

  precioCombo(id: number): number {
    return this.combos().find(item => item.id === id)?.precio ?? 0;
  }

  precioTicketBase(): number {
    const borrador = this.borrador();
    return borrador?.entradas?.[0]?.precio_unitario ?? 0;
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return fecha;

    return new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  async confirmarCompra(): Promise<void> {
    const borrador = this.borrador();
    if (!borrador || this.confirmando() || this.compraId()) return;

    const butacasSeleccionadas = borrador.butacaProyeccionIds
      ?.map(id => this.butacas().find(butaca => butaca.id === id))
      .filter((butaca): butaca is ButacaProyeccionVista => !!butaca);
    if (!butacasSeleccionadas || butacasSeleccionadas.length !== borrador.cantidadEntradas) {
      this.error.set('No encontramos todas las butacas seleccionadas. Volvé a elegirlas.');
      return;
    }
    if (butacasSeleccionadas.some(butaca => butaca.estado !== 'libre')) {
      this.error.set('Alguna butaca ya no está disponible. Volvé a la grilla y elegí otras.');
      return;
    }

    this.error.set('');
    this.mostrarModalConfirmacion.set(false);
    this.confirmando.set(true);
    try {
      const tieneSesion = await this.authService.haySesionActiva();
      this.compraAnonima.set(!tieneSesion);
      const detalles: ConfirmarCompraInput['detalles'] = [
        ...borrador.productos.map(item => {
          const producto = this.productos().find(actual => actual.id === item.id);
          if (!producto) throw new Error('Uno de los productos ya no está disponible.');
          return {
            producto_id: producto.id,
            combo_id: null,
            tipo_item: 'producto' as const,
            nombre_item: producto.nombre,
            cantidad: item.cantidad,
            precio_unitario: producto.precio,
            medio_pago: 'dinero' as const,
            puntos_usados: 0,
            puntos_generados: Math.floor(producto.precio * item.cantidad),
          };
        }),
        ...borrador.combos.map(item => {
          const combo = this.combos().find(actual => actual.id === item.id);
          if (!combo) throw new Error('Uno de los combos ya no está disponible.');
          return {
            producto_id: null,
            combo_id: combo.id,
            tipo_item: 'combo' as const,
            nombre_item: combo.nombre,
            cantidad: item.cantidad,
            precio_unitario: combo.precio,
            medio_pago: 'dinero' as const,
            puntos_usados: 0,
            puntos_generados: Math.floor(combo.precio * item.cantidad),
          };
        }),
      ];
      const butacas = butacasSeleccionadas.map((butaca, index) => ({
        butaca_proyeccion_id: butaca.id,
        medio_pago: 'dinero' as const,
        precio_unitario: (borrador.entradas?.[index]?.precio_unitario ?? this.precioTicketBase()) +
          (butaca.butaca.tipo === 'vip' ? this.recargoPorButacaVip : 0),
        puntos_usados: 0,
      }));
      const datos: ConfirmarCompraInput = {
        proyeccion_id: borrador.proyeccion.proyeccionId,
        total: borrador.total,
        creditos_usados: 0,
        puntos_generados: Math.floor(borrador.total),
        butacas,
        detalles,
      };

      const id = await this.compraService.confirmarCompra(datos);
      this.compraId.set(id);
      sessionStorage.removeItem('cinemarkade-compra-borrador');
      try {
        this.qrGenerado.set(await QRCode.toDataURL(id, { width: 320, margin: 2 }));
      } catch (error) {
        console.error('La compra se confirmó, pero no se pudo generar la imagen QR:', error);
      }
      try {
        const qrDataUrl = this.qrGenerado();
        if (!qrDataUrl) throw new Error('No se generó el QR de la compra.');
        this.ticketPdf.set(this.ticketPdfService.generar({
          compraId: id,
          qrDataUrl,
          pelicula: this.nombrePelicula(),
          fecha: this.formatearFecha(borrador.proyeccion.fecha),
          horario: borrador.proyeccion.horario.slice(0, 5),
          sala: borrador.proyeccion.salaId,
          formato: borrador.proyeccion.formato,
          idioma: borrador.proyeccion.idioma,
          butacas: butacasSeleccionadas.map(butaca => `${butaca.butaca.fila}${butaca.butaca.columna}`),
          detalles: [
            ...borrador.combos.map(item => ({
              nombre: this.nombreCombo(item.id),
              cantidad: item.cantidad,
              total: this.precioCombo(item.id) * item.cantidad,
            })),
            ...borrador.productos.map(item => ({
              nombre: this.nombreProducto(item.id),
              cantidad: item.cantidad,
              total: this.cantidadProducto(item.id) * item.cantidad,
            })),
          ],
          cupon: borrador.cupon?.codigo ?? null,
          recargoVip: borrador.recargoButacasVip ?? 0,
          total: borrador.total,
          puntos: borrador.puntosEstimados,
        }));
      } catch (error) {
        console.error('La compra se confirmó, pero no se pudo preparar el PDF:', error);
      }
      if (!tieneSesion && this.ticketPdf()) this.descargarTicket();
      this.mostrarModalExito.set(true);
    } catch (error) {
      console.error('No se pudo confirmar la compra:', error);
      this.error.set(error instanceof Error ? error.message : 'No se pudo confirmar la compra. Intentá nuevamente.');
    } finally {
      this.confirmando.set(false);
    }
  }

  cancelar(): void {
    sessionStorage.removeItem('cinemarkade-compra-borrador');
    void this.router.navigate(['/']);
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
    void this.router.navigate(['/mis-entradas']);
  }

  volverAlInicio(): void {
    this.mostrarModalExito.set(false);
    void this.router.navigate(['/']);
  }

  descargarTicket(): void {
    const pdf = this.ticketPdf();
    const id = this.compraId();
    if (pdf && id) this.ticketPdfService.descargar(pdf, id);
  }
}
