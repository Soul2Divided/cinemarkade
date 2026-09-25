import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe, CurrencyPipe } from '@angular/common';
import { Producto } from '../../../core/producto/producto.model';
import { ProductoRepository } from '../../../core/producto/producto.repository';

@Component({
  imports: [UpperCasePipe, CurrencyPipe],
  selector: 'app-abm-producto',
  styleUrl: './abm-producto.scss',
  templateUrl: './abm-producto.html',
})
export class AbmProducto {
  private productoRepository = inject(ProductoRepository);
  private router = inject(Router);

  productos = signal<Producto[]>([]);
  productosCargados = signal<boolean>(false);
  filtroBusqueda = signal<string>('');

  productosFiltrados = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.productos();

    return this.productos().filter(p =>
      p.nombre.toLowerCase().includes(query) ||
      p.categoria.toLowerCase().includes(query)
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.productoRepository.listar();
      this.productos.set(data || []);
    } catch (error) {
      console.error('Error al cargar catálogo del candybar:', error);
    } finally {
      this.productosCargados.set(true);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroBusqueda.set(valor);
  }

  irAAgregarProducto(): void {
    this.router.navigate(['/admin/nuevo-producto']);
  }

  modificarProducto(id: number): void {
    console.log('Modificar producto ID:', id);
    this.router.navigate(['/admin/productos/editar', id]);
  }

  async cambiarEstadoProducto(id: number, active: boolean): Promise<void> {
    const nuevoEstado = !active;

    try {
      await this.productoRepository.cambiarActiva(id, nuevoEstado);

      this.productos.update(lista =>
        lista.map(prod =>
          prod.id === id ? { ...prod, activa: nuevoEstado } : prod
        )
      );
    } catch (error) {
      console.error('Error al cambiar el estado del producto:', error);
    }
  }
}