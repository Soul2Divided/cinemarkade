import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Loader } from '../loader/loader';
import { ButacaProyeccionService } from '../../core/butaca-proyeccion/butaca-proyeccion.service';
import { ButacaProyeccionVista, EstadoButaca } from '../../core/butaca-proyeccion/butaca-proyeccion.model';
import { SupabaseService } from '../../core/services/supabase.service';
import { Combo } from '../../core/combo/combo.model';
import { ComboService } from '../../core/combo/combo.service';
import { Producto } from '../../core/producto/producto.model';
import { ProductoService } from '../../core/producto/producto.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';
import { PeliculaService } from '../../core/pelicula/pelicula.service';

interface SeleccionProyeccion {
  peliculaId: number;
  funcionId: number;
  proyeccionId: number;
  fecha: string;
  horario: string;
  formato: string;
  idioma: string;
  salaId: number;
}

interface ItemBorrador {
  id: number;
  cantidad: number;
}

interface BorradorCompra {
  proyeccion: SeleccionProyeccion;
  cantidadEntradas: number;
  productos: ItemBorrador[];
  combos: ItemBorrador[];
  subtotal: number;
  total: number;
  recargoButacasVip?: number;
  puntosEstimados: number;
  butacaProyeccionIds?: number[];
  butacasSeleccionadas?: string[];
}

interface BloqueButacas {
  nombre: string;
  butacas: ButacaProyeccionVista[];
}

interface FilaButacas {
  nombre: string;
  bloques: BloqueButacas[];
}

@Component({
  imports: [CommonModule, Navbar, Loader],
  selector: 'app-seleccion-butacas',
  styleUrl: './seleccion-butacas.scss',
  templateUrl: './seleccion-butacas.html',
})

export class SeleccionButacas implements OnInit, OnDestroy {
  readonly recargoPorButacaVip = 5000;
  private readonly router = inject(Router);
  private readonly butacaProyeccionService = inject(ButacaProyeccionService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly comboService = inject(ComboService);
  private readonly productoService = inject(ProductoService);
  private readonly peliculaService = inject(PeliculaService);

  borrador = signal<BorradorCompra | null>(null);
  butacas = signal<ButacaProyeccionVista[]>([]);
  seleccionadas = signal<number[]>([]);
  peliculas = signal<Pelicula[]>([]);
  combos = signal<Combo[]>([]);
  productos = signal<Producto[]>([]);
  mostrarLoader = signal(true);
  error = signal('');
  mensaje = signal('');
  filas = computed(() => this.construirFilas(this.butacas()));
  cantidadRequerida = computed(() => this.borrador()?.cantidadEntradas ?? 0);
  puedeContinuar = computed(() => this.seleccionadas().length === this.cantidadRequerida());
  cantidadButacasVip = computed(() => this.seleccionadas().filter(id =>
    this.butacas().find(butaca => butaca.id === id)?.butaca.tipo === 'vip'
  ).length);
  recargoVip = computed(() => this.cantidadButacasVip() * this.recargoPorButacaVip);

  private canalRealtime: ReturnType<typeof this.supabaseService.supabaseClient.channel> | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const borradorGuardado = sessionStorage.getItem('cinemarkade-compra-borrador');
      if (!borradorGuardado) {
        this.error.set('No encontramos una compra en curso. Volvé a elegir una función.');
        return;
      }

      const borrador = JSON.parse(borradorGuardado) as BorradorCompra;
      if (!borrador.proyeccion?.proyeccionId || !Number.isInteger(borrador.cantidadEntradas) || borrador.cantidadEntradas < 1) {
        this.error.set('La compra no tiene una función o cantidad de entradas válida.');
        return;
      }
      this.borrador.set(borrador);

      const [butacas, peliculas, combos, productos] = await Promise.all([
        this.butacaProyeccionService.listarPorProyeccion(borrador.proyeccion.proyeccionId),
        this.peliculaService.listarPeliculas(),
        this.comboService.listarCombos(),
        this.productoService.listarProductos(),
      ]);

      if (!butacas?.length) {
        this.error.set('Esta proyección no tiene butacas cargadas. Revisá la generación de butaca_proyeccion y su política SELECT de RLS en Supabase.');
        return;
      }

      this.butacas.set(butacas ?? []);
      this.peliculas.set(peliculas ?? []);
      this.combos.set(combos ?? []);
      this.productos.set(productos ?? []);

      const idsGuardados = (borrador.butacaProyeccionIds ?? []).filter(id =>
        butacas.some(butaca => butaca.id === id && butaca.estado === 'libre')
      );
      this.seleccionadas.set(idsGuardados.slice(0, borrador.cantidadEntradas));
      this.suscribirRealtime(borrador.proyeccion.proyeccionId);
    } catch (error) {
      console.error('No se pudo cargar la grilla de butacas:', error);
      this.error.set('No se pudo cargar la grilla. Intentá volver a la compra.');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.canalRealtime) {
      void this.supabaseService.supabaseClient.removeChannel(this.canalRealtime);
      this.canalRealtime = null;
    }
  }

  nombrePelicula(): string {
    const peliculaId = this.borrador()?.proyeccion.peliculaId;
    return this.peliculas().find(pelicula => pelicula.id === peliculaId)?.nombre ?? 'Película seleccionada';
  }

  butacaSeleccionada(id: number): boolean {
    return this.seleccionadas().includes(id);
  }

  etiquetasSeleccionadas(): string {
    return this.seleccionadas()
      .map(id => this.butacas().find(butaca => butaca.id === id))
      .filter((butaca): butaca is ButacaProyeccionVista => !!butaca)
      .map(butaca => this.etiquetaButaca(butaca))
      .join(', ');
  }

  butacaDeshabilitada(butaca: ButacaProyeccionVista): boolean {
    return butaca.estado !== 'libre' && !this.butacaSeleccionada(butaca.id);
  }

  etiquetaButaca(butaca: ButacaProyeccionVista): string {
    return `${butaca.butaca.fila ?? ''}${butaca.butaca.columna ?? ''}`;
  }

  columnaVisual(fila: string, bloque: string, butaca: ButacaProyeccionVista): number | null {
    if (fila !== 'K') return null;
    const columna = butaca.butaca.columna ?? 0;
    if (bloque === 'Izquierdo') return columna + 1;
    if (bloque === 'Central') return columna + 3;
    return columna - 11;
  }

  alternarButaca(butaca: ButacaProyeccionVista): void {
    if (butaca.estado !== 'libre' && !this.butacaSeleccionada(butaca.id)) return;
    this.mensaje.set('');
    /**
     * El update le hace saber al computed que la señal se modifico de alguna manera y
     * le permite reaccionar
     */
    this.seleccionadas.update(actuales => {
      if (actuales.includes(butaca.id)) return actuales.filter(id => id !== butaca.id);
      if (actuales.length >= this.cantidadRequerida()) {
        this.mensaje.set(`Ya seleccionaste las ${this.cantidadRequerida()} butacas correspondientes a tus entradas.`);
        return actuales;
      }
      return [...actuales, butaca.id];
    });
  }

  cantidadProducto(id: number): number {
    return this.borrador()?.productos.find(item => item.id === id)?.cantidad ?? 0;
  }

  cantidadCombo(id: number): number {
    return this.borrador()?.combos.find(item => item.id === id)?.cantidad ?? 0;
  }

  nombreProducto(id: number): string {
    return this.productos().find(item => item.id === id)?.nombre ?? 'Producto';
  }

  precioProducto(id: number): number {
    return this.productos().find(item => item.id === id)?.precio ?? 0;
  }

  nombreCombo(id: number): string {
    return this.combos().find(item => item.id === id)?.nombre ?? 'Combo';
  }

  precioCombo(id: number): number {
    return this.combos().find(item => item.id === id)?.precio ?? 0;
  }

  total(): number {
    const borrador = this.borrador();
    return borrador ? borrador.total - (borrador.recargoButacasVip ?? 0) + this.recargoVip() : 0;
  }

  subtotalLineaEntradas(): number {
    const seleccion = this.borrador();
    return seleccion ? seleccion.subtotal - this.subtotalCandy() : 0;
  }

  subtotalCandy(): number {
    const borrador = this.borrador();
    if (!borrador) return 0;
    const totalCombos = borrador.combos.reduce((total, item) => total + this.precioCombo(item.id) * item.cantidad, 0);
    const totalProductos = borrador.productos.reduce((total, item) => total + this.precioProducto(item.id) * item.cantidad, 0);
    return totalCombos + totalProductos;
  }

  volver(): void {
    void this.router.navigate(['/compra']);
  }

  confirmarSeleccion(): void {
    const borrador = this.borrador();
    if (!borrador || !this.puedeContinuar()) {
      this.mensaje.set(`Seleccioná ${this.cantidadRequerida()} butaca(s) para continuar.`);
      return;
    }

    const etiquetas = this.seleccionadas().map(id => {
      const butaca = this.butacas().find(item => item.id === id);
      return butaca ? this.etiquetaButaca(butaca) : '';
    }).filter(Boolean);
    const actualizado: BorradorCompra = {
      ...borrador,
      butacaProyeccionIds: this.seleccionadas(),
      butacasSeleccionadas: etiquetas,
      recargoButacasVip: this.recargoVip(),
      total: this.total(),
      puntosEstimados: Math.floor(this.total()),
    };
    sessionStorage.setItem('cinemarkade-compra-borrador', JSON.stringify(actualizado));
    this.borrador.set(actualizado);
    void this.router.navigate(['/confirmacion-compra']);
  }

  private construirFilas(registros: ButacaProyeccionVista[]): FilaButacas[] {
    const ordenFilas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    return ordenFilas.map(nombre => {
      const butacasFila = registros
        .filter(registro => registro.butaca.fila === nombre)
        .sort((a, b) => (a.butaca.columna ?? 0) - (b.butaca.columna ?? 0));
      const tamanios = nombre === 'K' ? [2, 10, 2] : [4, 20, 4];
      let indice = 0;
      const bloques = tamanios.map((cantidad, posicion) => {
        const butacas = butacasFila.slice(indice, indice + cantidad);
        indice += cantidad;
        return { nombre: ['Izquierdo', 'Central', 'Derecho'][posicion], butacas };
      });
      return { nombre, bloques };
    });
  }

  private suscribirRealtime(proyeccionId: number): void {
    this.canalRealtime = this.supabaseService.supabaseClient
      .channel(`butacas-proyeccion-${proyeccionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'butaca_proyeccion',
        filter: `proyeccion_id=eq.${proyeccionId}`,
      }, payload => this.actualizarEstadoDesdeRealtime(payload))
      .subscribe();
  }

  private actualizarEstadoDesdeRealtime(payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }): void {
    const registro = payload.eventType === 'DELETE' ? payload.old : payload.new;
    const id = Number(registro['id']);
    if (!id) return;

    if (payload.eventType === 'DELETE') {
      this.butacas.update(actuales => actuales.filter(butaca => butaca.id !== id));
      this.seleccionadas.update(actuales => actuales.filter(butacaId => butacaId !== id));
      return;
    }

    const estado = registro['estado'] as EstadoButaca | null;
    this.butacas.update(actuales => actuales.map(butaca => butaca.id === id ? { ...butaca, estado } : butaca));
    if (estado !== 'libre') {
      this.seleccionadas.update(actuales => actuales.filter(butacaId => butacaId !== id));
    }
  }
}
