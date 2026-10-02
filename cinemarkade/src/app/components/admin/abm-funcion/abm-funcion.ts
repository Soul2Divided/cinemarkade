import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { Funcion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { Modal } from '../../modal/modal';

@Component({
  imports: [UpperCasePipe, Modal],
  selector: 'app-abm-funcion',
  styleUrl: './abm-funcion.scss',
  templateUrl: './abm-funcion.html',
})
export class AbmFuncion implements OnInit {
  private readonly funcionService = inject(FuncionService);
  private readonly router = inject(Router);

  funciones = signal<Funcion[]>([]);
  funcionesCargadas = signal(true);
  filtroBusqueda = signal('');
  errorMessage = signal('');
  mostrarModal = signal(false);
  private accionCambioEstadoPendiente: (() => Promise<void>) | null = null;

  funcionesFiltradas = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.funciones();

    return this.funciones().filter(funcion =>
      funcion.fecha.includes(query) ||
      funcion.sala_id.toString().includes(query) ||
      funcion.pelicula_id.toString().includes(query) ||
      funcion.formato.toLowerCase().includes(query) ||
      funcion.idioma.toLowerCase().includes(query) ||
      funcion.proyecciones.some(proyeccion => proyeccion.horario.includes(query))
    );
  });

  async ngOnInit(): Promise<void> {
    await this.cargarFunciones();
  }

  async cargarFunciones(): Promise<void> {
    this.funcionesCargadas.set(true);
    this.errorMessage.set('');
    try {
      this.funciones.set(await this.funcionService.listarFunciones());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudieron cargar las funciones.');
    } finally {
      this.funcionesCargadas.set(false);
    }
  }

  onSearch(event: Event): void {
    this.filtroBusqueda.set((event.target as HTMLInputElement).value);
  }

  irAAgregarFuncion(): void {
    this.router.navigate(['/admin/nueva-funcion']);
  }

  modificarFuncion(id: number): void {
    this.router.navigate(['/admin/editar-funcion', id]);
  }

  horariosFuncion(funcion: Funcion): string {
    return funcion.proyecciones
      .filter(proyeccion => proyeccion.activa)
      .map(proyeccion => proyeccion.horario.slice(0, 5))
      .sort()
      .join(' · ') || 'SIN HORARIOS';
  }

  async alternarActiva(funcion: Funcion): Promise<void> {
    this.accionCambioEstadoPendiente = () => this.aplicarCambioEstadoFuncion(funcion);
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

  private async aplicarCambioEstadoFuncion(funcion: Funcion): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.funcionService.cambiarActiva(funcion.id, !funcion.activa);
      this.funciones.update(lista => lista.map(item =>
        item.id === funcion.id ? { ...item, activa: !item.activa } : item
      ));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado de la función.');
    }
  }
}
