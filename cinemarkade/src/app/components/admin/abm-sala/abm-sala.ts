import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SalaRepository } from '../../../core/sala/sala.repository';
import { Sala } from '../../../core/sala/sala.model';

@Component({
  imports: [],
  selector: 'app-abm-sala',
  styleUrl: './abm-sala.scss',
  templateUrl: './abm-sala.html',
})
export class AbmSala {
  private salaRepository = inject(SalaRepository);
  private router = inject(Router);

  salas = signal<Sala[]>([]);
  salasCargadas = signal<boolean>(false);
  filtroBusqueda = signal<string>('');

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
      const data = await this.salaRepository.listar();
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

  async cambiarEstadoSala(id: number, active: boolean): Promise<void> {
    const nuevoEstado = !active;

    try {
      await this.salaRepository.cambiarActiva(id, nuevoEstado);

      this.salas.update(lista =>
        lista.map(sala =>
          sala.id === id ? { ...sala, activa: nuevoEstado } : sala
        )
      );
    } catch (error) {
      console.error('Error al cambiar estado de la sala:', error);
    }
  }
}