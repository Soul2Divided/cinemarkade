import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { Cupon } from '../../../core/cupon/cupon.model';
import { CuponService } from '../../../core/cupon/cupon.service';

@Component({
  imports: [UpperCasePipe],
  selector: 'app-abm-cupon',
  styleUrl: './abm-cupon.scss',
  templateUrl: './abm-cupon.html',
})
export class AbmCupon implements OnInit {
  private cuponService = inject(CuponService);
  private router = inject(Router);

  cupones = signal<Cupon[]>([]);
  cargando = signal<boolean>(true);
  filtroBusqueda = signal<string>('');

  cuponesFiltrados = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.cupones();

    return this.cupones().filter(c =>
      c.codigo.toLowerCase().includes(query) ||
      c.porcentajeDescuento.toString().includes(query) ||
      c.fechaInicio.includes(query) ||
      c.fechaFin.includes(query)
    );
  });

  async ngOnInit(): Promise<void> {
    await this.cargarCupones();
  }

  async cargarCupones(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await this.cuponService.listarCupones();
      this.cupones.set(data || []);
    } catch (error) {
      console.error('Error al cargar cupones:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroBusqueda.set(valor);
  }

  irAAgregarCupon(): void {
    this.router.navigate(['/admin/nuevo-cupon']);
  }

  modificarCupon(id: number): void {
    this.router.navigate(['/admin/editar-cupon', id]);
  }

  async eliminarCupon(id: number): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este cupón?')) {
      try {
        await this.cuponService.eliminarCupon(id);
        this.cupones.update(lista => lista.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error al eliminar cupón:', error);
      }
    }
  }
}