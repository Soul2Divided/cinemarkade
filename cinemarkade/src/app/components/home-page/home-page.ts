import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';

@Component({
  imports: [Navbar, CommonModule, UpperCasePipe],
  selector: 'app-home-page',
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})

export class HomePage implements OnInit {
  private peliculaService = inject(PeliculaService);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  peliculaSeleccionada = signal<Pelicula | null>(null);
  peliculaDestacada = computed(() => this.peliculas()[0] ?? null);

  generos: string[] = ['Acción', 'Ciencia Ficción', 'Terror', 'Aventura', 'Comedia', 'Animación'];

  elementosHero = computed(() => {
    return this.peliculas().filter(p => p.activa && p.banner && p.banner.trim() !== '');
  });

  indiceHeroActual: number = 0;

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.peliculaService.listarPeliculas();
      this.peliculas.set((data || []).filter(p => p.activa));
    } catch (error) {
      console.error('Error al cargar la cartelera:', error);
    }
  }

  seleccionarHero(index: number): void {
    this.indiceHeroActual = index;
  }

  ejecutarAccionHero(pelicula: Pelicula): void {
    this.seleccionarPelicula(pelicula);
  }

  seleccionarPelicula(pelicula: Pelicula): void {
    this.peliculaSeleccionada.set(pelicula);
  }

  cerrarDetalle(): void {
    this.peliculaSeleccionada.set(null);
  }

  irAFunciones(peliculaId: number): void {
    this.cerrarDetalle();
    this.router.navigate(['/funciones', peliculaId]);
  }
}