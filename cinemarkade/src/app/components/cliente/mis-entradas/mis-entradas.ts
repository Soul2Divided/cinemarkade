import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { ButacaProyeccionService } from '../../../core/butaca-proyeccion/butaca-proyeccion.service';
import { CompraButacaService } from '../../../core/compra-butaca/compra-butaca.service';
import { Compra } from '../../../core/compra/compra.model';
import { CompraService } from '../../../core/compra/compra.service';
import { DetalleCompraService } from '../../../core/detalle-compra/detalle-compra.service';
import { Funcion, Proyeccion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { TicketPdfService } from '../../../core/compra/ticket-pdf.service';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';
import { Navbar } from '../../navbar/navbar';
import QRCode from 'qrcode';

interface EntradaPendiente {
  compra: Compra;
  pelicula: string;
  proyeccionId: number;
  fecha: string;
  horario: string;
  salaId: number;
  formato: string;
  idioma: string;
}

@Component({
  imports: [CommonModule, Navbar, Loader, Modal],
  selector: 'app-mis-entradas',
  styleUrl: './mis-entradas.scss',
  templateUrl: './mis-entradas.html',
})
export class MisEntradas implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly compraService = inject(CompraService);
  private readonly compraButacaService = inject(CompraButacaService);
  private readonly detalleCompraService = inject(DetalleCompraService);
  private readonly butacaProyeccionService = inject(ButacaProyeccionService);
  private readonly funcionService = inject(FuncionService);
  private readonly peliculaService = inject(PeliculaService);
  private readonly ticketPdfService = inject(TicketPdfService);

  readonly entradas = signal<EntradaPendiente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly qrVisible = signal(false);
  readonly qrImagen = signal<string | null>(null);
  readonly cargandoPdfId = signal<string | null>(null);
  readonly errorPdf = signal('');
  readonly cancelacionSeleccionada = signal<EntradaPendiente | null>(null);
  readonly cancelandoId = signal<string | null>(null);
  readonly puntosReintegrados = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const usuarioId = await this.authService.obtenerIdUsuarioSesion();
      if (!usuarioId) {
        await this.router.navigate(['/login']);
        return;
      }

      const [compras, funciones, peliculas] = await Promise.all([
        this.compraService.listarPorUsuario(usuarioId),
        this.funcionService.listarFunciones(),
        this.peliculaService.listarPeliculas(),
      ]);
      const peliculaPorId = new Map(peliculas.map(pelicula => [pelicula.id, pelicula.nombre]));
      const funcionPorProyeccion = new Map<number, { funcion: Funcion; proyeccion: Proyeccion }>();
      for (const funcion of funciones) {
        for (const proyeccion of funcion.proyecciones) {
          funcionPorProyeccion.set(proyeccion.id, { funcion, proyeccion });
        }
      }

      const ahora = Date.now();
      this.entradas.set(compras.flatMap(compra => {
        const asociacion = funcionPorProyeccion.get(compra.proyeccion_id);
        if (!asociacion || !compra.codigo_qr || compra.estado?.toLowerCase() !== 'confirmada') return [];

        const { funcion, proyeccion } = asociacion;
        const fechaHora = new Date(`${funcion.fecha.slice(0, 10)}T${proyeccion.horario}`).getTime();
        if (fechaHora <= ahora) return [];

        return [{
          compra,
          pelicula: peliculaPorId.get(funcion.pelicula_id) ?? 'Película',
          proyeccionId: proyeccion.id,
          fecha: funcion.fecha,
          horario: proyeccion.horario,
          salaId: funcion.sala_id,
          formato: funcion.formato,
          idioma: funcion.idioma,
        }];
      }).sort((a, b) => this.fechaHora(a).localeCompare(this.fechaHora(b))));
    } catch (error) {
      console.error('No se pudieron cargar las entradas:', error);
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar tus entradas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async mostrarQr(entrada: EntradaPendiente): Promise<void> {
    this.errorPdf.set('');
    try {
      this.qrImagen.set(await QRCode.toDataURL(entrada.compra.codigo_qr!, { width: 360, margin: 2 }));
      this.qrVisible.set(true);
    } catch (error) {
      this.errorPdf.set(error instanceof Error ? error.message : 'No se pudo generar el código QR.');
    }
  }

  cerrarQr(): void {
    this.qrVisible.set(false);
    this.qrImagen.set(null);
  }

  async descargarTicket(entrada: EntradaPendiente): Promise<void> {
    this.cargandoPdfId.set(entrada.compra.id);
    this.errorPdf.set('');
    try {
      const [filasButaca, detalles, butacasProyeccion] = await Promise.all([
        this.compraButacaService.listarPorCompra(entrada.compra.id),
        this.detalleCompraService.listarPorCompra(entrada.compra.id),
        this.butacaProyeccionService.listarPorProyeccion(entrada.proyeccionId),
      ]);
      const butacas = filasButaca
        .map(fila => butacasProyeccion.find(item => item.id === fila.butaca_proyeccion_id))
        .filter((item): item is NonNullable<typeof item> => !!item);
      const qr = await QRCode.toDataURL(entrada.compra.codigo_qr!, { width: 320, margin: 2 });
      const pdf = this.ticketPdfService.generar({
        compraId: entrada.compra.id,
        qrDataUrl: qr,
        pelicula: entrada.pelicula,
        fecha: this.formatearFecha(entrada.fecha),
        horario: entrada.horario.slice(0, 5),
        sala: entrada.salaId,
        formato: entrada.formato,
        idioma: entrada.idioma,
        butacas: butacas.map(item => `${item.butaca.fila}${item.butaca.columna}`),
        detalles: detalles.map(detalle => ({
          nombre: detalle.nombre_item ?? 'Producto',
          cantidad: detalle.cantidad ?? 1,
          total: (detalle.precio_unitario ?? 0) * (detalle.cantidad ?? 1),
        })),
        cupon: null,
        recargoVip: butacas.filter(item => item.butaca.tipo === 'vip').length * 5000,
        total: entrada.compra.total,
        puntos: entrada.compra.puntos_generados,
      });
      this.ticketPdfService.descargar(pdf, entrada.compra.id);
    } catch (error) {
      console.error('No se pudo preparar el ticket:', error);
      this.errorPdf.set(error instanceof Error ? error.message : 'No se pudo descargar el ticket.');
    } finally {
      this.cargandoPdfId.set(null);
    }
  }

  puedeCancelar(entrada: EntradaPendiente): boolean {
    const inicio = new Date(`${entrada.fecha.slice(0, 10)}T${entrada.horario.slice(0, 8)}-03:00`).getTime();
    return inicio - Date.now() >= 2 * 60 * 60 * 1000;
  }

  abrirCancelacion(entrada: EntradaPendiente): void {
    this.cancelacionSeleccionada.set(entrada);
    this.puntosReintegrados.set(null);
  }

  cerrarCancelacion(): void {
    if (this.cancelandoId()) return;
    this.cancelacionSeleccionada.set(null);
    this.puntosReintegrados.set(null);
  }

  async confirmarCancelacion(): Promise<void> {
    const entrada = this.cancelacionSeleccionada();
    if (!entrada || this.cancelandoId()) return;

    this.cancelandoId.set(entrada.compra.id);
    this.errorPdf.set('');
    try {
      const puntos = await this.compraService.cancelarCompra(entrada.compra.id);
      this.entradas.update(actuales => actuales.filter(item => item.compra.id !== entrada.compra.id));
      await this.authService.refrescarUsuarioActual();
      this.puntosReintegrados.set(puntos);
    } catch (error) {
      console.error('No se pudo cancelar la compra:', error);
      this.errorPdf.set(error instanceof Error ? error.message : 'No se pudo cancelar la compra.');
    } finally {
      this.cancelandoId.set(null);
    }
  }

  volverAlPerfil(): void {
    void this.router.navigate(['/perfil']);
  }

  private fechaHora(entrada: EntradaPendiente): string {
    return `${entrada.fecha.slice(0, 10)}T${entrada.horario}`;
  }

  formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return fecha;
    return new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}
