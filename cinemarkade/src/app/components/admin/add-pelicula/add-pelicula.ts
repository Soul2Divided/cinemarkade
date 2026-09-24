import { Component, ChangeDetectorRef, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
export class AddPelicula {
  imagePreviewUrl: string | null = null;
  bannerPreviewUrl: string | null = null;
  errorMessage: string = '';
  mostrarModal = signal<boolean>(false);
  mostrarLoader = signal<boolean>(false);

  formMovie = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    genero: new FormControl('', [Validators.required]),
    duracion: new FormControl(null, [Validators.required, Validators.min(1)]),
    imagen: new FormControl('', [Validators.required]),
    banner: new FormControl('',),
    sinopsis: new FormControl('', [Validators.required]),
    restriccionEdad: new FormControl('ATP', [Validators.required])
  });

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private peliculaService: PeliculaService,
  ) { }

  onPosterFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.formMovie.get('imagen')?.setValue(this.imagePreviewUrl);
        this.formMovie.get('imagen')?.markAsTouched();
        this.cdr.detectChanges(); // <--- FORZA LA ACTUALIZACIÓN INMEDIATA EN PANTALLA
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
      await this.peliculaService.crearPelicula(datos);
      this.mostrarModal.set(true);
    } catch (error) {
      this.triggerError(error instanceof Error
        ? error.message
        : 'No se pudo crear la pelicula');
    } finally {
      this.mostrarLoader.set(false);
    }
  }

  triggerError(msg: string): void {
    this.errorMessage = msg;
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.router.navigate(['/admin']);
  }

  cancelar(): void {
    this.router.navigate(['/']);
  }
}