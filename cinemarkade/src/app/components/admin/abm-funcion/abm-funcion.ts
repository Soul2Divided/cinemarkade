import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { Funcion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';

@Component({
  imports: [UpperCasePipe],
  selector: 'app-abm-funcion',
  styleUrl: './abm-funcion.scss',
  templateUrl: './abm-funcion.html',
})
export class AbmFuncion implements OnInit {
  private funcionService = inject(FuncionService);
  private router = inject(Router);

  funciones = signal<Funcion[]>([]);
  funcionesCargadas = signal<boolean>(true);
  filtroBusqueda = signal<string>('');

  funcionesFiltradas = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.funciones();

    return this.funciones().filter(f =>
      f.fecha.includes(query) ||
      f.horario.includes(query) ||
      f.sala_id.toString().includes(query) ||
      f.pelicula_id.toString().includes(query) ||
      f.formato.toLowerCase().includes(query) ||
      f.idioma.toLowerCase().includes(query)
    );
  });

  async ngOnInit(): Promise<void> {
    await this.cargarFunciones();
  }

  async cargarFunciones(): Promise<void> {
    this.funcionesCargadas.set(true);
    try {
      const data = await this.funcionService.listarFunciones();
      this.funciones.set(data || []);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
    } finally {
      this.funcionesCargadas.set(false);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroBusqueda.set(valor);
  }

  irAAgregarFuncion(): void {
    this.router.navigate(['/admin/nueva-funcion']);
  }

  modificarFuncion(id: number): void {
    this.router.navigate(['/admin/editar-funcion', id]);
  }

  async eliminarFuncion(id: number): Promise<void> {
    // if (confirm('¿Estás seguro de eliminar esta función?')) {
    //   try {
    //     await this.funcionService.eliminarFuncion(id);
    //     this.funciones.update(lista => lista.filter(f => f.id !== id));
    //   } catch (error) {
    //     console.error('Error al eliminar función:', error);
    //   }
    // }
  }
}
