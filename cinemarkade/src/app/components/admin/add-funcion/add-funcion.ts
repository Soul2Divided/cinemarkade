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
import { validarHorarioFuncion, validarHorarioIndividual, validarHorariosFuncion } from '../../../utils/horario-funcion.util';

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
  readonly fechaMinimaPreventa = this.sumarDias(this.fechaMinima, 7);

  peliculas = signal<Pelicula[]>([]);
  horariosSeleccionados = signal<string[]>([]);
  mostrarLoader = signal(false);
  mostrarModal = signal(false);
  resultado = signal('');
  errorMessage = '';
  funcionOriginal: Funcion | null = null;

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
    dias: new FormControl(1, { nonNullable: true, validators: Validators.required }),
    primerHorario: new FormControl('10:00', {
      nonNullable: true,
    }),
    idioma: new FormControl<IdiomaFuncion | null>(null, Validators.required),
    esEstreno: new FormControl(false, { nonNullable: true }),
    esPreventa: new FormControl(false, { nonNullable: true }),
    fechaDisponiblePreventa: new FormControl('', { nonNullable: true }),
    porcentajeRecargoPreventa: new FormControl<number | null>(null),
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
      this.funcionOriginal = funcion;
      const horarios = funcion.proyecciones
        .filter(proyeccion => proyeccion.activa)
        .map(proyeccion => proyeccion.horario.slice(0, 5))
        .sort();

      this.formFuncion.patchValue({
        peliculaId: funcion.pelicula_id,
        formatos: [funcion.formato],
        fecha: funcion.fecha,
        dias: 1,
        primerHorario: horarios[0] ?? '10:00',
        idioma: funcion.idioma,
        esEstreno: funcion.es_estreno,
        esPreventa: funcion.es_preventa,
        fechaDisponiblePreventa: funcion.fecha_disponible_preventa ?? '',
        porcentajeRecargoPreventa: funcion.porcentaje_recargo_preventa,
      });

      this.actualizarValidacionesPreventa();

      this.horariosSeleccionados.set(horarios);

      if (!funcion.activa) {
        this.errorMessage = 'Esta función está inactiva y no se puede editar.';
      }
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudo cargar la función.';
    }
  }

  agregarHorario(): void {
    this.errorMessage = '';
    const pelicula = this.peliculaSeleccionada;
    const horario = this.formFuncion.controls.primerHorario.value;
    if (!pelicula) {
      this.errorMessage = 'Seleccioná una película antes de agregar horarios.';
      return;
    }
    try {
      this.horariosSeleccionados.set(
        validarHorarioFuncion(pelicula.duracion, horario, this.horariosSeleccionados())
      );
      this.formFuncion.controls.primerHorario.setValue('');
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'El horario ingresado no es válido.';
    }
  }

  quitarHorario(horario: string): void {
    this.horariosSeleccionados.update(actuales => actuales.filter(actual => actual !== horario));
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

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.formFuncion.markAllAsTouched();

    if (this.formFuncion.invalid) {
      this.errorMessage = 'Completá los campos obligatorios.';
      return;
    }
    if (this.formFuncion.controls.esPreventa.value) {
      const fechaDisponible = this.formFuncion.controls.fechaDisponiblePreventa.value;
      const conservaFechaDeHabilitacion =
        this.funcionOriginal?.es_preventa &&
        this.funcionOriginal.fecha_disponible_preventa === fechaDisponible;

      if (!conservaFechaDeHabilitacion && fechaDisponible < this.fechaMinimaPreventa) {
        this.errorMessage = 'La fecha de habilitación debe estar a siete días o más de hoy.';
        return;
      }
      if (fechaDisponible >= this.formFuncion.controls.fecha.value) {
        this.errorMessage = 'La preventa debe habilitarse antes de la fecha de la función.';
        return;
      }
    }
    const pelicula = this.peliculaSeleccionada;
    if (this.horariosSeleccionados().length === 0 || !pelicula) {
      this.errorMessage = 'Agregá al menos un horario.';
      return;
    }

    let horariosOrdenados: string[];
    try {
      horariosOrdenados = validarHorariosFuncion(pelicula.duracion, this.horariosSeleccionados());
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Los horarios ingresados no son válidos.';
      return;
    }

    const valores = this.formFuncion.getRawValue();
    if (valores.peliculaId === null || valores.idioma === null) {
      this.errorMessage = 'Completá los campos obligatorios.';
      return;
    }

    const datos: CrearFuncionInput = {
      peliculaId: valores.peliculaId,
      formatos: valores.formatos,
      fecha: valores.fecha,
      dias: this.esEdicion ? 1 : valores.dias,
      primerHorario: horariosOrdenados[0],
      horariosSeleccionados: horariosOrdenados,
      idioma: valores.idioma,
      esEstreno: valores.esEstreno,
      esPreventa: valores.esPreventa,
      fechaDisponiblePreventa: valores.esPreventa
        ? valores.fechaDisponiblePreventa
        : null,
      porcentajeRecargoPreventa: valores.esPreventa
        ? valores.porcentajeRecargoPreventa
        : null,
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
          `Se crearon ${funciones.length} funciones: ${datos.dias} ${datos.dias === 1 ? 'día' : 'días'} por cada uno de los ${datos.formatos.length} formatos, con ${horariosOrdenados.length} horarios por día.`
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

  validarHorarioActual(): void {
    this.errorMessage = '';
    const pelicula = this.peliculaSeleccionada;
    const horario = this.formFuncion.controls.primerHorario.value;
    if (!pelicula || !horario) return;
    try {
      validarHorarioIndividual(pelicula.duracion, horario);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'El horario ingresado no es válido.';
    }
  }

  actualizarValidacionesPreventa(): void {
    const fechaControl = this.formFuncion.controls.fechaDisponiblePreventa;
    const recargoControl = this.formFuncion.controls.porcentajeRecargoPreventa;

    if (this.formFuncion.controls.esPreventa.value) {
      fechaControl.setValidators([Validators.required]);
      recargoControl.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(100),
      ]);
    } else {
      fechaControl.clearValidators();
      recargoControl.clearValidators();
    }

    fechaControl.updateValueAndValidity();
    recargoControl.updateValueAndValidity();
  }

  get fechaMinimaPreventaFormulario(): string {
    const fechaActual = this.formFuncion.controls.fechaDisponiblePreventa.value;

    if (
      this.funcionOriginal?.es_preventa &&
      this.funcionOriginal.fecha_disponible_preventa === fechaActual &&
      fechaActual < this.fechaMinimaPreventa
    ) {
      return fechaActual;
    }

    return this.fechaMinimaPreventa;
  }

  get fechaMaximaPreventaFormulario(): string {
    const fechaFuncion = this.formFuncion.controls.fecha.value;
    const ultimaFecha = new Date(`${fechaFuncion}T00:00:00Z`);
    ultimaFecha.setUTCDate(ultimaFecha.getUTCDate() - 1);

    return ultimaFecha.toISOString().slice(0, 10);
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

  private sumarDias(fecha: string, dias: number): string {
    const valor = new Date(`${fecha}T00:00:00Z`);
    valor.setUTCDate(valor.getUTCDate() + dias);

    return valor.toISOString().slice(0, 10);
  }
}
