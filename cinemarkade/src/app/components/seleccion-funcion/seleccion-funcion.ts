import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Funcion, Proyeccion } from '../../core/funcion/funcion.model';
import { FuncionService } from '../../core/funcion/funcion.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';
import { PeliculaService } from '../../core/pelicula/pelicula.service';

interface OpcionFecha { fecha: string; etiqueta: string; }
interface OpcionHorario { funcion: Funcion; proyeccion: Proyeccion; }

@Component({
  selector: 'app-seleccion-funcion',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './seleccion-funcion.html',
  styleUrl: './seleccion-funcion.scss',
})
export class SeleccionFuncion implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private peliculaService = inject(PeliculaService);
  private funcionService = inject(FuncionService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  cargando = signal(true);
  error = signal('');
  fechaSeleccionada = signal('');
  formatoSeleccionado = signal('');
  idiomaSeleccionado = signal('');
  horarioSeleccionado = signal<OpcionHorario | null>(null);
  paginaFechas = signal(0);

  fechas = computed<OpcionFecha[]>(() => {
    const fechas = [...new Set(this.funciones()
      .filter(f => f.activa && f.fecha >= this.hoy() && f.fecha <= this.ultimoDiaVisible() && f.proyecciones.some(p =>
        p.activa && (f.fecha > this.hoy() || p.horario.slice(0, 5) > this.horaActual())
      ))
      .map(f => f.fecha))].sort();
    return fechas.map(fecha => ({ fecha, etiqueta: this.etiquetaFecha(fecha) }));
  });

  fechasVisibles = computed(() => this.fechas().slice(this.paginaFechas() * 4, this.paginaFechas() * 4 + 4));
  hayPaginaAnterior = computed(() => this.paginaFechas() > 0);
  hayPaginaSiguiente = computed(() => (this.paginaFechas() + 1) * 4 < this.fechas().length);

  formatos = computed(() => [...new Set(this.funciones()
    .filter(f => f.fecha === this.fechaSeleccionada() && f.activa && f.proyecciones.some(p => p.activa))
    .map(f => f.formato))].sort());

  idiomas = computed(() => [...new Set(this.funciones()
    .filter(f => f.fecha === this.fechaSeleccionada() && f.activa &&
      (!this.formatoSeleccionado() || f.formato === this.formatoSeleccionado()) && f.proyecciones.some(p => p.activa))
    .map(f => f.idioma))].sort());

  horarios = computed<OpcionHorario[]>(() => this.funciones()
    .filter(f => f.activa && f.fecha === this.fechaSeleccionada() &&
      (!this.formatoSeleccionado() || f.formato === this.formatoSeleccionado()) &&
      (!this.idiomaSeleccionado() || f.idioma === this.idiomaSeleccionado()))
    .flatMap(funcion => funcion.proyecciones
      .filter(proyeccion => proyeccion.activa && (funcion.fecha !== this.hoy() || proyeccion.horario.slice(0, 5) > this.horaActual()))
      .map(proyeccion => ({ funcion, proyeccion })))
    .sort((a, b) => a.proyeccion.horario.localeCompare(b.proyeccion.horario)));

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error.set('La película solicitada no es válida.');
      this.cargando.set(false);
      return;
    }
    try {
      const [pelicula, funciones] = await Promise.all([
        this.peliculaService.obtenerPorId(id),
        this.funcionService.listarFuncionesPorPelicula(id),
      ]);
      this.pelicula.set(pelicula);
      this.funciones.set(funciones);
      const primeraFecha = this.fechas()[0]?.fecha ?? '';
      this.fechaSeleccionada.set(primeraFecha);
      this.formatoSeleccionado.set('');
      this.idiomaSeleccionado.set('');
    } catch (e) {
      console.error('No se pudo cargar la cartelera de la película:', e);
      this.error.set('No se pudo cargar la información de la película y sus funciones.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.formatoSeleccionado.set('');
    this.idiomaSeleccionado.set('');
    this.horarioSeleccionado.set(null);
  }

  paginaAnterior(): void {
    if (this.hayPaginaAnterior()) this.paginaFechas.update(pagina => pagina - 1);
  }

  paginaSiguiente(): void {
    if (this.hayPaginaSiguiente()) this.paginaFechas.update(pagina => pagina + 1);
  }

  cambiarFormato(event: Event): void {
    this.formatoSeleccionado.set((event.target as HTMLSelectElement).value);
    this.idiomaSeleccionado.set('');
    this.horarioSeleccionado.set(null);
  }

  cambiarIdioma(event: Event): void {
    this.idiomaSeleccionado.set((event.target as HTMLSelectElement).value);
    this.horarioSeleccionado.set(null);
  }

  seleccionarHorario(opcion: OpcionHorario): void { this.horarioSeleccionado.set(opcion); }

  continuarCompra(): void {
    const seleccion = this.horarioSeleccionado();
    if (!seleccion) return;
    sessionStorage.setItem('cinemarkade-proyeccion-seleccionada', JSON.stringify({
      peliculaId: this.pelicula()?.id,
      funcionId: seleccion.funcion.id,
      proyeccionId: seleccion.proyeccion.id,
      fecha: seleccion.funcion.fecha,
      horario: seleccion.proyeccion.horario,
      formato: seleccion.funcion.formato,
      idioma: seleccion.funcion.idioma,
      salaId: seleccion.funcion.sala_id,
    }));
    void this.router.navigate(['/compra']);
  }

  volver(): void { void this.router.navigate(['/']); }
  formatoHora(horario: string): string { return horario.slice(0, 5); }
  hoy(): string { return this.partesFechaHora().fecha; }
  private horaActual(): string { return this.partesFechaHora().hora; }

  private ultimoDiaVisible(): string {
    const ultimoDia = new Date(`${this.hoy()}T00:00:00Z`);
    ultimoDia.setUTCDate(ultimoDia.getUTCDate() + 6);
    return ultimoDia.toISOString().slice(0, 10);
  }

  private partesFechaHora(): { fecha: string; hora: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)!.value;
    return { fecha: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` };
  }

  private etiquetaFecha(fecha: string): string {
    if (fecha === this.hoy()) return 'HOY';
    const date = new Date(`${fecha}T12:00:00-03:00`);
    const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
      .format(date).replace('.', '').toUpperCase();
    const dayMonth = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(date);
    return `${weekday} ${dayMonth}`;
  }
}
