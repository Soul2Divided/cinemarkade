import { registrarErrorUsuario } from '../../../core/services/error-usuario';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { CancelarProyeccionResultado, Funcion, Proyeccion } from '../../../core/funcion/funcion.model';
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

interface ProyeccionSeleccionada {
  funcion: Funcion;
  proyeccion: Proyeccion;
}

@Component({
  imports: [DecimalPipe, SlicePipe, UpperCasePipe, Modal, Loader],
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
  vistaProyecciones = signal<'programadas' | 'historial'>('programadas');
  grupoAbierto = signal<number | null>(null);
  proyeccionCancelacion = signal<ProyeccionSeleccionada | null>(null);
  resultadoCancelacion = signal<CancelarProyeccionResultado | null>(null);
  cancelandoProyeccion = signal(false);
  errorCancelacion = signal('');
  readonly formatos = FORMATOS_SALA;

  nombresPeliculas = signal<NombreIdPelicula[]>([]);

  private accionCambioEstadoPendiente: (() => Promise<void>) | null = null;

  funcionesFiltradas = computed(() => {
    const query = this.filtroBusqueda().toLowerCase().trim();
    return this.funciones().filter(funcion => {
      if (this.formatoFiltro() && funcion.formato !== this.formatoFiltro()) return false;
      const proyeccionesDeVista = funcion.proyecciones.filter(proyeccion =>
        this.vistaProyecciones() === 'historial'
          ? this.esProyeccionPasada(funcion, proyeccion)
          : proyeccion.activa && this.esProyeccionFutura(funcion, proyeccion)
      );

      if (proyeccionesDeVista.length === 0) return false;
      if (!query) return true;
      return (
      funcion.fecha.includes(query) ||
      funcion.sala_id.toString().includes(query) ||
      funcion.pelicula_id.toString().includes(query) ||
      (this.nombrePelicula(funcion.pelicula_id)?.toLowerCase().includes(query) ?? false) ||
      funcion.formato.toLowerCase().includes(query) ||
      funcion.idioma.toLowerCase().includes(query) ||
      proyeccionesDeVista.some(proyeccion => proyeccion.horario.includes(query))
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
      this.errorMessage.set(registrarErrorUsuario('Error en abm-funcion.ts:', error));
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
      .filter(proyeccion => this.esProyeccionDeVista(funcion, proyeccion))
      .map(proyeccion => proyeccion.horario.slice(0, 5))
      .sort()
      .join(' · ') || 'SIN HORARIOS';
  }

  cambiarVistaProyecciones(vista: 'programadas' | 'historial'): void {
    this.vistaProyecciones.set(vista);
    this.grupoAbierto.set(null);
  }

  esProyeccionDeVista(funcion: Funcion, proyeccion: Proyeccion): boolean {
    return this.vistaProyecciones() === 'historial'
      ? this.esProyeccionPasada(funcion, proyeccion)
      : proyeccion.activa && this.esProyeccionFutura(funcion, proyeccion);
  }

  private esProyeccionPasada(funcion: Funcion, proyeccion: Proyeccion): boolean {
    return proyeccion.activa && !this.esProyeccionFutura(funcion, proyeccion);
  }

  proyeccionesCancelables(funcion: Funcion): Proyeccion[] {
    if (!funcion.activa) {
      return [];
    }

    return funcion.proyecciones.filter(proyeccion =>
      proyeccion.activa && this.esProyeccionFutura(funcion, proyeccion)
    );
  }

  solicitarCancelacionProyeccion(funcion: Funcion, proyeccion: Proyeccion): void {
    this.errorCancelacion.set('');
    this.resultadoCancelacion.set(null);
    this.proyeccionCancelacion.set({ funcion, proyeccion });
  }

  async confirmarCancelacionProyeccion(): Promise<void> {
    const seleccion = this.proyeccionCancelacion();
    if (!seleccion || this.cancelandoProyeccion()) {
      return;
    }

    this.cancelandoProyeccion.set(true);
    this.errorCancelacion.set('');

    try {
      const resultado = await this.funcionService.cancelarProyeccion(seleccion.proyeccion.id);
      this.funciones.update(funciones => funciones.map(funcion => {
        if (funcion.id !== seleccion.funcion.id) {
          return funcion;
        }

        return {
          ...funcion,
          proyecciones: funcion.proyecciones.map(proyeccion =>
            proyeccion.id === seleccion.proyeccion.id
              ? { ...proyeccion, activa: false }
              : proyeccion
          ),
        };
      }));
      this.resultadoCancelacion.set(resultado);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : '';

      if (mensaje.includes('compras de invitados')) {
        console.error('No se puede cancelar una proyección con compras de invitados:', error);
        this.errorCancelacion.set(
          'No se puede cancelar esta proyección porque tiene compras de invitados sin una cuenta para acreditar puntos y enviar el aviso.'
        );
      } else {
        this.errorCancelacion.set(registrarErrorUsuario('Error al cancelar la proyección:', error));
      }
    } finally {
      this.cancelandoProyeccion.set(false);
    }
  }

  cerrarCancelacionProyeccion(): void {
    if (this.cancelandoProyeccion()) {
      return;
    }

    this.proyeccionCancelacion.set(null);
    this.resultadoCancelacion.set(null);
    this.errorCancelacion.set('');
  }

  private esProyeccionFutura(funcion: Funcion, proyeccion: Proyeccion): boolean {
    const ahora = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const valor = (tipo: string) => ahora.find(parte => parte.type === tipo)?.value ?? '';
    const fechaHoraActual = `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
    const fechaHoraProyeccion = `${funcion.fecha.slice(0, 10)}T${proyeccion.horario.slice(0, 5)}`;

    return fechaHoraProyeccion > fechaHoraActual;
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
      this.errorMessage.set(registrarErrorUsuario('Error en abm-funcion.ts:', error));
    }
  }
}
