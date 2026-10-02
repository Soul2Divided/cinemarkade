import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SalaService } from '../../../core/sala/sala.service';
import { Sala } from '../../../core/sala/sala.model';
import { Modal } from '../../modal/modal';
import { FuncionService } from '../../../core/funcion/funcion.service';

@Component({
  imports: [Modal],
  selector: 'app-abm-sala',
  styleUrl: './abm-sala.scss',
  templateUrl: './abm-sala.html',
})
export class AbmSala {
  private salaService = inject(SalaService);
  private funcionService = inject(FuncionService);
  private router = inject(Router);

  salas = signal<Sala[]>([]);
  salasCargadas = signal<boolean>(false);
  filtroBusqueda = signal<string>('');
  mostrarModal = signal(false);
  salaPendiente = signal<Sala | null>(null);
  funcionesPendientes = signal(0);
  procesandoCambio = signal(false);
  errorCambio = signal('');

  salasFiltradas = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.salas();

    return this.salas().filter(s =>
      s.formato.toLowerCase().includes(query) ||
      s.id.toString().includes(query)
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.salaService.listarSalas();
      this.salas.set(data || []);
    } catch (error) {
      console.error('Error al cargar lista de salas:', error);
    } finally {
      this.salasCargadas.set(true);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroBusqueda.set(valor);
  }

  irAAgregarSala(): void {
    this.router.navigate(['/admin/nueva-sala']);
  }

  modificarSala(id: number): void {
    this.router.navigate(['/admin/editar-sala', id]);
  }

  async cambiarEstadoSala(sala: Sala): Promise<void> {
    this.errorCambio.set('');
    this.salaPendiente.set(sala);
    if (!sala.activa) {
      await this.aplicarCambioEstadoSala(sala.id, true);
      return;
    }

    try {
      const funciones = await this.funcionService.listarFunciones();
      this.funcionesPendientes.set(funciones.filter(f => f.sala_id === sala.id && f.activa).length);
      this.mostrarModal.set(true);
    } catch (error) {
      console.error('Error al revisar funciones de la sala:', error);
      this.errorCambio.set('No se pudo verificar si la sala tiene funciones activas.');
    }
  }

  async confirmarCambioEstado(): Promise<void> {
    const sala = this.salaPendiente();
    if (!sala || this.procesandoCambio()) return;
    this.procesandoCambio.set(true);
    this.errorCambio.set('');
    try {
      await this.funcionService.desactivarSalaConFunciones(sala.id);
      this.salas.update(lista => lista.map(item => item.id === sala.id ? { ...item, activa: false } : item));
      this.cancelarCambioEstado();
    } catch (error) {
      console.error('Error al dar de baja la sala y sus funciones:', error);
      this.errorCambio.set(error instanceof Error ? error.message : 'No se pudo completar la baja.');
    } finally {
      this.procesandoCambio.set(false);
    }
  }

  cancelarCambioEstado(): void {
    this.mostrarModal.set(false);
    this.salaPendiente.set(null);
    this.errorCambio.set('');
  }

  private async aplicarCambioEstadoSala(id: number, nuevoEstado: boolean): Promise<void> {
    try {
      await this.salaService.cambiarActiva(id, nuevoEstado);

      this.salas.update(lista =>
        lista.map(sala =>
          sala.id === id ? { ...sala, activa: nuevoEstado } : sala
        )
      );
    } catch (error) {
      console.error('Error al cambiar estado de la sala:', error);
      this.errorCambio.set(error instanceof Error ? error.message : 'No se pudo cambiar el estado de la sala.');
    }
  }
}
