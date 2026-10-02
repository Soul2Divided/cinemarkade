import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Combo, ComboItem } from '../../../core/combo/combo.model';
import { ComboService } from '../../../core/combo/combo.service';
import { Producto } from '../../../core/producto/producto.model';
import { ProductoService } from '../../../core/producto/producto.service';
import { Modal } from '../../modal/modal';

@Component({
  selector: 'app-abm-combo',
  imports: [CommonModule, Modal],
  templateUrl: './abm-combo.html',
  styleUrl: './abm-combo.scss',
})
export class AbmCombo implements OnInit {
  private readonly comboService = inject(ComboService);
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);

  readonly combos = signal<Combo[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly errorMessage = signal('');
  readonly filtroBusqueda = signal('');
  readonly mostrarModal = signal(false);
  private accionCambioEstadoPendiente: (() => Promise<void>) | null = null;

  readonly combosFiltrados = computed(() => {
    const query = this.filtroBusqueda().trim().toLocaleLowerCase();
    if (!query) return this.combos();

    return this.combos().filter(combo => {
      const productos = this.descripcionProductos(combo.items ?? []).toLocaleLowerCase();
      return combo.nombre.toLocaleLowerCase().includes(query) ||
        (combo.descripcion ?? '').toLocaleLowerCase().includes(query) ||
        combo.precio.toString().includes(query) || productos.includes(query);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.errorMessage.set('');
    try {
      const [combos, productos] = await Promise.all([
        this.comboService.listarCombos(),
        this.productoService.listarProductos(),
      ]);
      this.combos.set(combos ?? []);
      this.productos.set(productos ?? []);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudieron cargar los combos.');
    } finally {
      this.cargando.set(false);
    }
  }

  onSearch(event: Event): void {
    this.filtroBusqueda.set((event.target as HTMLInputElement).value);
  }

  descripcionProductos(items: ComboItem[]): string {
    return items.map(item => {
      const producto = this.productos().find(candidate => candidate.id === item.producto_id);
      return `${item.cantidad}× ${producto?.nombre ?? 'Producto'}`;
    }).join(', ');
  }

  obtenerProducto(id: number): Producto | undefined {
    return this.productos().find(producto => producto.id === id);
  }

  totalPrecioLista(combo: Combo): number {
    return (combo.items ?? []).reduce((total, item) => {
      const producto = this.productos().find(candidate => candidate.id === item.producto_id);
      return total + (producto?.precio ?? 0) * item.cantidad;
    }, 0);
  }

  irAAgregarCombo(): void {
    this.router.navigate(['/admin/nuevo-combo']);
  }

  modificarCombo(id: number): void {
    this.router.navigate(['/admin/editar-combo', id]);
  }

  async cambiarEstadoCombo(combo: Combo): Promise<void> {
    this.accionCambioEstadoPendiente = () => this.aplicarCambioEstadoCombo(combo);
    this.mostrarModal.set(true);
  }

  async confirmarCambioEstado(): Promise<void> {
    const accion = this.accionCambioEstadoPendiente;
    this.cancelarCambioEstado();
    await accion?.();
  }

  cancelarCambioEstado(): void {
    this.mostrarModal.set(false);
    this.accionCambioEstadoPendiente = null;
  }

  private async aplicarCambioEstadoCombo(combo: Combo): Promise<void> {
    const nuevoEstado = !combo.activo;
    this.errorMessage.set('');
    try {
      await this.comboService.cambiarActivo(combo.id, nuevoEstado);
      this.combos.update(lista => lista.map(item =>
        item.id === combo.id ? { ...item, activo: nuevoEstado } : item
      ));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado del combo.');
    }
  }
}
