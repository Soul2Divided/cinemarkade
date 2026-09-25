import { Component, ChangeDetectorRef, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PeliculaInput } from '../../../core/pelicula/pelicula.model';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { Loader } from '../../loader/loader';
import { Modal } from '../../modal/modal';

@Component({
  imports: [ReactiveFormsModule, Loader, Modal],
  selector: 'app-add-pelicula',
  styleUrl: './add-pelicula.scss',
  templateUrl: './add-pelicula.html',
})
export class AddPelicula implements OnInit {
  imagePreviewUrl: string | null = null;
  bannerPreviewUrl: string | null = null;
  errorMessage: string = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);
  esEdicion: boolean = false;
  peliculaId: number | null = null;

  formMovie = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    genero: new FormControl('', [Validators.required]),
    duracion: new FormControl(0, [Validators.required, Validators.min(1)]),
    imagen: new FormControl('', [Validators.required]),
    banner: new FormControl(''),
    sinopsis: new FormControl('', [Validators.required]),
    restriccionEdad: new FormControl('ATP', [Validators.required])
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private peliculaService: PeliculaService,
  ) { }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.esEdicion = true;
      this.peliculaId = Number(idParam);
      await this.cargarPeliculaParaEditar(this.peliculaId);
    }
  }

  onPosterFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.formMovie.get('imagen')?.setValue(this.imagePreviewUrl);
        this.formMovie.get('imagen')?.markAsTouched();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onBannerFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.bannerPreviewUrl = reader.result as string;
        this.formMovie.get('banner')?.setValue(this.bannerPreviewUrl);
        this.formMovie.get('banner')?.markAsTouched();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removerPoster(event: Event): void {
    event.stopPropagation();
    this.imagePreviewUrl = null;
    this.formMovie.get('imagen')?.setValue('');
  }

  removerBanner(event: Event): void {
    event.stopPropagation();
    this.bannerPreviewUrl = null;
    this.formMovie.get('banner')?.setValue('');
  }

  onPosterUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    this.imagePreviewUrl = url && (url.startsWith('http') || url.startsWith('data:image')) ? url : null;
  }

  onBannerUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    this.bannerPreviewUrl = url && (url.startsWith('http') || url.startsWith('data:image')) ? url : null;
  }

  async cargarPeliculaParaEditar(id: number): Promise<void> {
    try {
      const peli = await this.peliculaService.obtenerPorId(id);
      if (peli) {
        this.formMovie.patchValue({
          nombre: peli.nombre,
          genero: peli.genero,
          duracion: peli.duracion,
          imagen: peli.imagen,
          banner: peli.banner ?? '',
          sinopsis: peli.sinopsis,
          restriccionEdad: peli.restriccion_edad ?? 'ATP'
        });

        this.imagePreviewUrl = peli.imagen;
        this.bannerPreviewUrl = peli.banner ?? null;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al cargar película para editar:', error);
    }
  }

  seleccionarRestriccion(rating: string): void {
    this.formMovie.get('restriccionEdad')?.setValue(rating);
  }

  async onSubmit(): Promise<void> {
    if (!this.formMovie.valid) {
      this.formMovie.markAllAsTouched();
      this.triggerError('POR FAVOR COMPLETÁ TODOS LOS CAMPOS');
      return;
    }

    this.errorMessage = '';
    this.mostrarLoader.set(true);

    try {
      const valores = this.formMovie.getRawValue();
      const datos: PeliculaInput = {
        nombre: valores.nombre ?? '',
        genero: valores.genero ?? '',
        duracion: valores.duracion ?? 0,
        imagen: valores.imagen ?? '',
        sinopsis: valores.sinopsis ?? '',
        restriccion_edad: valores.restriccionEdad ?? '',
        banner: valores.banner || null,
      };

      if (this.esEdicion && this.peliculaId) {
        await this.peliculaService.actualizarPelicula(this.peliculaId, datos);
      } else {
        await this.peliculaService.crearPelicula(datos);
      }

      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo guardar la película');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.formMovie.get(field);
    return !!(control && control.touched && control.invalid);
  }

  getFieldError(field: string): string {
    const control = this.formMovie.get(field);

    if (!control?.touched) {
      return '';
    }

    if (control.hasError('required')) {
      const requiredMessages: Record<string, string> = {
        nombre: 'El título de la película es obligatorio',
        genero: 'Debes seleccionar un género',
        duracion: 'La duración es obligatoria',
        imagen: 'Debes seleccionar un poster para la película',
        sinopsis: 'La sinopsis es obligatoria',
        restriccionEdad: 'Debes seleccionar la restricción de edad'
      };

      return requiredMessages[field] ?? 'Este campo es obligatorio';
    }

    if (field === 'duracion' && control.hasError('min')) {
      return 'La duración debe ser mayor a 0 minutos';
    }

    return '';
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin/peliculas']);
  }

  cancelar(): void {
    this.router.navigate(['/admin/peliculas']);
  }
}