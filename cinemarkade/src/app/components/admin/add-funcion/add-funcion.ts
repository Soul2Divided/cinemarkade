import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';
import { CrearFuncionInput, Funcion, IdiomaFuncion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { Pelicula } from '../../../core/pelicula/pelicula.model';
import { FORMATOS_SALA, FormatoSala } from '../../../core/sala/sala.model';
import { calcularHorariosDisponibles } from '../../../utils/horario-funcion.util';

@Component({
  selector: 'app-add-funcion',
  standalone: true,
  imports: [ReactiveFormsModule, Loader, Modal],
  templateUrl: './add-funcion.html',
  styleUrls: ['./add-funcion.scss'],
})
export class AddFuncion implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly funcionService = inject(FuncionService);
  private readonly peliculaService = inject(PeliculaService);

  readonly formatosDisponibles = FORMATOS_SALA;
  readonly idiomasDisponibles: IdiomaFuncion[] = ['Subtitulada', 'Doblada'];
  readonly fechaMinima = this.fechaActualDelCine();

  peliculas = signal<Pelicula[]>([]);
  horariosDisponibles = signal<string[]>([]);
  horariosSeleccionados = signal<string[]>([]);
  mostrarLoader = signal(false);
  mostrarModal = signal(false);
  resultado = signal('');
  errorMessage = '';

  esEdicion = false;
  funcionId: number | null = null;

  formFuncion = new FormGroup({
    peliculaId: new FormControl<number | null>(null, Validators.required),
    formatos: new FormControl<FormatoSala[]>([], {
      nonNullable: true,
      validators: Validators.required,
    }),
    fecha: new FormControl(this.fechaMinima, {
      nonNullable: true,
      validators: Validators.required,
    }),
    primerHorario: new FormControl('10:00', {
      nonNullable: true,
      validators: Validators.required,
    }),
    idioma: new FormControl<IdiomaFuncion | null>(null, Validators.required),
    esPreventa: new FormControl(false, { nonNullable: true }),
  });

  get peliculaSeleccionada(): Pelicula | undefined {
    const id = this.formFuncion.controls.peliculaId.value;
    return this.peliculas().find(pelicula => pelicula.id === id);
  }

  get formatosSeleccionadosTexto(): string {
    return this.formFuncion.controls.formatos.value.join(' / ') || 'FORMATO';
  }

  async ngOnInit(): Promise<void> {
    await this.cargarPeliculas();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion = true;
      this.funcionId = Number(id);
      await this.cargarFuncion(this.funcionId);
    }
  }

  private async cargarPeliculas(): Promise<void> {
    try {
      const peliculas = await this.peliculaService.listarPeliculas();
      this.peliculas.set((peliculas ?? []).filter(pelicula => pelicula.activa));
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las películas.';
    }
  }

  private async cargarFuncion(id: number): Promise<void> {
    try {
      const funcion = await this.funcionService.obtenerFuncionPorId(id);
      const horarios = funcion.proyecciones
        .filter(proyeccion => proyeccion.activa)
        .map(proyeccion => proyeccion.horario.slice(0, 5))
        .sort();

      this.formFuncion.patchValue({
        peliculaId: funcion.pelicula_id,
        formatos: [funcion.formato],
        fecha: funcion.fecha,
        primerHorario: horarios[0] ?? '10:00',
        idioma: funcion.idioma,
        esPreventa: funcion.es_preventa,
      });

      this.recalcularHorarios(false);
      this.horariosSeleccionados.set(
        horarios.filter(horario => this.horariosDisponibles().includes(horario))
      );

      if (!funcion.activa) {
        this.errorMessage = 'Esta función está inactiva y no se puede editar.';
      }
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar la función.';
    }
  }

  recalcularHorarios(limpiarSeleccion = true): void {
    const pelicula = this.peliculaSeleccionada;
    const primerHorario = this.formFuncion.controls.primerHorario.value;

    if (!pelicula || !primerHorario) {
      this.horariosDisponibles.set([]);
      this.horariosSeleccionados.set([]);
      return;
    }

    try {
      this.horariosDisponibles.set(
        calcularHorariosDisponibles(pelicula.duracion, primerHorario)
      );
      if (limpiarSeleccion) this.horariosSeleccionados.set([]);
      else {
        this.horariosSeleccionados.update(actuales =>
          actuales.filter(horario => this.horariosDisponibles().includes(horario))
        );
      }
    } catch {
      this.horariosDisponibles.set([]);
      this.horariosSeleccionados.set([]);
    }
  }

  seleccionarFormato(formato: FormatoSala): void {
    const formatosActuales = this.formFuncion.controls.formatos.value;
    const formatosNuevos = this.esEdicion
      ? [formato]
      : formatosActuales.includes(formato)
        ? formatosActuales.filter(actual => actual !== formato)
        : [...formatosActuales, formato];

    this.formFuncion.controls.formatos.setValue(formatosNuevos);
    this.formFuncion.controls.formatos.markAsTouched();
  }

  alternarHorario(horario: string): void {
    this.horariosSeleccionados.update(actuales =>
      actuales.includes(horario)
        ? actuales.filter(actual => actual !== horario)
        : [...actuales, horario].sort()
    );
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.formFuncion.markAllAsTouched();

    if (this.formFuncion.invalid) {
      this.errorMessage = 'Completá los campos obligatorios.';
      return;
    }
    if (this.horariosSeleccionados().length === 0) {
      this.errorMessage = 'Seleccioná al menos un horario disponible.';
      return;
    }

    const valores = this.formFuncion.getRawValue();
    if (valores.peliculaId === null || valores.idioma === null) {
      this.errorMessage = 'Completá los campos obligatorios.';
      return;
    }

    const horariosOrdenados = this.horariosDisponibles().filter(horario =>
      this.horariosSeleccionados().includes(horario)
    );
    const datos: CrearFuncionInput = {
      peliculaId: valores.peliculaId,
      formatos: valores.formatos,
      fecha: valores.fecha,
      primerHorario: valores.primerHorario,
      horariosSeleccionados: horariosOrdenados,
      idioma: valores.idioma,
      esPreventa: valores.esPreventa,
    };

    this.mostrarLoader.set(true);
    try {
      if (this.esEdicion && this.funcionId !== null) {
        const funcion = await this.funcionService.actualizarFuncion(this.funcionId, datos);
        this.resultado.set(
          `Función actualizada en la sala #${funcion.sala_id} con ${funcion.proyecciones.length} horarios.`
        );
      } else {
        const funciones = await this.funcionService.crearFunciones(datos);
        this.resultado.set(
          `Se crearon ${funciones.length} funciones, una por formato, con ${horariosOrdenados.length} horarios cada una.`
        );
      }
      this.mostrarModal.set(true);
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo guardar la función.';
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/funciones']);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/funciones']);
  }

  private fechaActualDelCine(): string {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const valor = (tipo: string) => partes.find(parte => parte.type === tipo)!.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }
}
