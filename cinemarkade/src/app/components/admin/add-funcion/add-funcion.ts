import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';
import { CrearFuncionInput, Funcion, IdiomaFuncion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { Pelicula } from '../../../core/pelicula/pelicula.model';
import { FORMATOS_SALA, FormatoSala } from '../../../core/sala/sala.model';

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
  mostrarLoader = signal(false);
  mostrarModal = signal(false);
  resultado = signal('');
  errorMessage = '';

  esEdicion = false;
  funcionId: number | null = null;

  formFuncion = new FormGroup({
    peliculaId: new FormControl<number | null>(null, Validators.required),
    formato: new FormControl<FormatoSala | null>(null, Validators.required),
    fecha: new FormControl(this.fechaMinima, Validators.required),
    horario: new FormControl('', Validators.required),
    idioma: new FormControl<IdiomaFuncion | null>(null, Validators.required),
    precio: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
  });

  get peliculaSeleccionada(): Pelicula | undefined {
    const id = this.formFuncion.controls.peliculaId.value;
    return this.peliculas().find(pelicula => pelicula.id === id);
  }

  get esPreventaPreview(): boolean {
    const fecha = this.formFuncion.controls.fecha.value;
    return !!fecha && fecha > this.fechaMinima;
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
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudieron cargar las películas.';
    }
  }

  private async cargarFuncion(id: number): Promise<void> {
    try {
      const funcion = await this.funcionService.obtenerFuncionPorId(id);

      this.formFuncion.patchValue({
        peliculaId: funcion.pelicula_id,
        formato: funcion.formato,
        fecha: funcion.fecha,
        horario: funcion.horario.slice(0, 5),
        idioma: funcion.idioma,
        precio: funcion.precio,
      });

      if (!funcion.activa) {
        this.errorMessage = 'Esta función está inactiva y no se puede editar.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo cargar la función.';
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';

    if (this.formFuncion.invalid) {
      this.formFuncion.markAllAsTouched();
      this.errorMessage = 'Revisá los campos obligatorios.';
      return;
    }

    const valores = this.formFuncion.getRawValue();

    if (
      valores.peliculaId === null ||
      valores.formato === null ||
      valores.idioma === null ||
      valores.precio === null
    ) {
      this.errorMessage = 'Completá todos los campos obligatorios.';
      return;
    }

    const datos: CrearFuncionInput = {
      peliculaId: valores.peliculaId,
      formato: valores.formato,
      fecha: valores.fecha!,
      horario: valores.horario!,
      idioma: valores.idioma,
      precio: valores.precio,
    };

    this.mostrarLoader.set(true);

    try {
      let funcion: Funcion;

      if (this.esEdicion && this.funcionId !== null) {
        funcion = await this.funcionService.actualizarFuncion(
          this.funcionId,
          datos
        );
      } else {
        funcion = await this.funcionService.crearFuncion(datos);
      }

      this.resultado.set(
        `Función ${this.esEdicion ? 'actualizada' : 'creada'} en la sala ${funcion.sala_id}.`
      );
      this.mostrarModal.set(true);
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo guardar la función.';
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  isFieldInvalid(
    field: keyof typeof this.formFuncion.controls
  ): boolean {
    const control = this.formFuncion.controls[field];
    return control.touched && control.invalid;
  }

  seleccionarFormato(formato: FormatoSala): void {
    this.formFuncion.controls.formato.setValue(formato);
    this.formFuncion.controls.formato.markAsTouched();
  }

  seleccionarIdioma(idioma: IdiomaFuncion): void {
    this.formFuncion.controls.idioma.setValue(idioma);
    this.formFuncion.controls.idioma.markAsTouched();
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

    const valor = (tipo: string) =>
      partes.find(parte => parte.type === tipo)!.value;

    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }
}