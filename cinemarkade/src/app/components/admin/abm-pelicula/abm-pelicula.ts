import { UpperCasePipe } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Pelicula } from '../../../core/pelicula/pelicula.model';
import { PeliculaRepository } from '../../../core/pelicula/pelicula.repository';

@Component({
  imports: [UpperCasePipe],
  selector: 'app-abm-pelicula',
  styleUrl: './abm-pelicula.scss',
  templateUrl: './abm-pelicula.html',
})

export class AbmPelicula implements OnInit {
  private peliculaRepository = inject(PeliculaRepository);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  peliculasCargadas = signal<boolean>(false);
  filtroBusqueda = signal<string>('');

  peliculasFiltradas = computed(() => {
    /*
     * computed forma parte del sistema de signals, pero en este caso sirve para declarar una variable
     * que depende del valor de otras signals.
     * actua como una reactividad automatica sin necesidad de las suscripciones (como sucede con los
     * observables).
     * en este caso, las signals que tengo son filtroBusqueda y peliculas, por lo que cada vez que
     * esas signals reciban un cambio, computed las va a detectar y va a recalcularse automaticamente.
     */
    const query = this.filtroBusqueda().toLowerCase().trim();
    if (!query) return this.peliculas();

    return this.peliculas().filter(p =>
      p.nombre.toLowerCase().includes(query) ||
      p.genero.toLowerCase().includes(query)
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.peliculaRepository.listar();
      this.peliculas.set(data || []);
    } catch (error) {
      console.error('Error al cargar catálogo de películas:', error);
    } finally {
      this.peliculasCargadas.set(true);
    }
  }

  onSearch(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.filtroBusqueda.set(valor);
  }

  irAAgregarPelicula(): void {
    this.router.navigate(['/admin/peliculas/nueva']);
  }

  modificarPelicula(id: string | number): void {
    console.log('Modificar película ID:', id);
    // Próximamente: navegar a edición o abrir modal
  }

  async cambiarEstadoPelicula(id: number, active: boolean): Promise<void> {
    const nuevoEstado = !active;

    try {
      await this.peliculaRepository.cambiarActiva(id, nuevoEstado);
      /*
       * Las Signals de Angular necesitan que se emita una nueva referencia de objeto/array mediante
       * update() para notificar a computed() (peliculasFiltradas()) que el estado ha cambiado.
       */
      this.peliculas.update(lista =>
        lista.map(pelicula =>
          pelicula.id === id ? { ...pelicula, activa: nuevoEstado } : pelicula
        )
      );
    } catch (error) {
      console.error('Error al cambiar el estado de la película:', error);
    }
  }
}
