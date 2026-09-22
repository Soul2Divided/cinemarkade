import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '../../navbar/navbar';

@Component({
  imports: [Navbar, ReactiveFormsModule],
  selector: 'app-add-pelicula',
  styleUrl: './add-pelicula.scss',
  templateUrl: './add-pelicula.html',
})
export class AddPelicula {
  imagePreviewUrl: string | null = null;

  formMovie = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    genero: new FormControl('', [Validators.required]),
    duracion: new FormControl(null, [Validators.required, Validators.min(1)]),
    imagen: new FormControl('', [Validators.required]),
    sinopsis: new FormControl('', [Validators.required]),
    restriccionEdad: new FormControl('ATP', [Validators.required])
  });

  constructor(private router: Router) {}

  // Permite subir un archivo local y mostrar la vista previa
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.formMovie.get('imagen')?.setValue(this.imagePreviewUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  // Si el usuario pega una URL directa, la carga en la vista previa
  onUrlInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
      this.imagePreviewUrl = url;
    } else if (!url) {
      this.imagePreviewUrl = null;
    }
  }

  seleccionarRestriccion(rating: string): void {
    this.formMovie.get('restriccionEdad')?.setValue(rating);
  }

  onSubmit(): void {
    if (this.formMovie.valid) {
      console.log('Pelicula a registrar:', this.formMovie.value);
    }
  }

  cancelar(): void {
    this.router.navigate(['/']);
  }
}
