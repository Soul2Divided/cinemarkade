import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { Funcion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { FORMATOS_SALA, FormatoSala } from '../../../core/sala/sala.model';
import { Modal } from '../../modal/modal';
import { Loader } from '../../loader/loader';

interface NombreIdPelicula {
  id: number;
  nombre: string;
}

interface GrupoFunciones {
  peliculaId: number;
  nombre: string;
  funciones: Funcion[];
}

@Component({
  imports: [UpperCasePipe, Modal, Loader],
  selector: 'app-abm-funcion',
  styleUrl: './abm-funcion.scss',
  templateUrl: './abm-funcion.html',
})

export class AbmFuncion implements OnInit {
  private readonly funcionService = inject(FuncionService);
  private readonly peliculaService = inject(PeliculaService);
  private readonly router = inject(Router);

  funciones = signal<Funcion[]>([]);
  funcionesCargadas = signal(true);
  filtroBusqueda = signal('');
  errorMessage = signal('');
  mostrarModal = signal(false);
  mostrarLoader = signal(false);
  formatoFiltro = signal<FormatoSala | ''>('');
  grupoAbierto = signal<number | null>(null);
  readonly formatos = FORMATOS_SALA;

  nombresPeliculas = signal<NombreIdPelicula[]>([]);

  private accionCambioEstadoPendiente: (() => Promise<void>) | null = null;

  funcionesFiltradas = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    return this.funciones().filter(funcion => {
      if (this.formatoFiltro() && funcion.formato !== this.formatoFiltro()) return false;
      if (!query) return true;
      return (
      funcion.fecha.includes(query) ||
      funcion.sala_id.toString().includes(query) ||
      funcion.pelicula_id.toString().includes(query) ||
      (this.nombrePelicula(funcion.pelicula_id)?.toLowerCase().includes(query) ?? false) ||
      funcion.formato.toLowerCase().includes(query) ||
      funcion.idioma.toLowerCase().includes(query) ||
      funcion.proyecciones.some(proyeccion => proyeccion.horario.includes(query))
      );
    });
  });

  peliculasAgrupadas = computed<GrupoFunciones[]>(() => {
    const grupos = new Map<number, Funcion[]>();
    for (const funcion of this.funcionesFiltradas()) {
      const actuales = grupos.get(funcion.pelicula_id) ?? [];
      actuales.push(funcion);
      grupos.set(funcion.pelicula_id, actuales);
    }
    return [...grupos.entries()]
      .map(([peliculaId, funciones]) => ({
        peliculaId,
        nombre: this.nombrePelicula(peliculaId) ?? `PELÍCULA #${peliculaId}`,
        funciones: [...funciones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.formato.localeCompare(b.formato)),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  async ngOnInit(): Promise<void> {
    /**
     * Promise.all sirve para esperar varias operaciones asíncronas en paralelo.
     * Angular inicia ambas cargas a la vez y espera a que las dos terminen.
     * Si cualquiera de las promesas falla, Promise.all también falla; por eso cada método captura sus propios errores.
     */
    await Promise.all([this.cargarFunciones(), this.cargarNombresPeliculas()]);
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

  async cargarNombresPeliculas(): Promise<void> {
    this.mostrarLoader.set(true);
    try {
      const peliculas = await this.peliculaService.listarPeliculas();
      const nombresId: NombreIdPelicula[] = peliculas.map(pelicula => ({
        id: pelicula.id,
        nombre: pelicula.nombre
      }));
      this.nombresPeliculas.set(nombresId);
    } catch (error) {
      console.error('Error al cargar los nombres de las películas:', error);
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  nombrePelicula(id: number): string | undefined {
    return this.nombresPeliculas().find(pelicula => pelicula.id === id)?.nombre;
  }

  cambiarFormatoFiltro(event: Event): void {
    this.formatoFiltro.set((event.target as HTMLSelectElement).value as FormatoSala | '');
  }

  alternarGrupo(peliculaId: number): void {
    this.grupoAbierto.update(actual => actual === peliculaId ? null : peliculaId);
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
