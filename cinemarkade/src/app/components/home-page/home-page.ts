import { Navbar } from "../navbar/navbar";
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Pelicula } from '../../core/models/pelicula';
import { HeroItem } from '../../core/models/hero-item';
import { ELEMENTOS_HERO_MOCK, LISTA_PELICULAS_MOCK, PELICULA_INTERSTELLAR_MOCK } from '../../data/movies.mock';


interface Movie {
  id: number;
  title: string;
  genre: string;
  duration: string;
  hall: string;
  price: number;
  posterUrl: string;
}

@Component({
  imports: [Navbar],
  selector: 'app-home-page',
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})
export class HomePage {
  indiceHeroActual: number = 0;
  private intervaloAutoPlay: any;

  elementosHero: HeroItem[] = ELEMENTOS_HERO_MOCK;
  peliculaDestacada: Pelicula = PELICULA_INTERSTELLAR_MOCK;
  listaPrueba: Pelicula[] = LISTA_PELICULAS_MOCK;
  generos: string[] = ['CIENCIA FICCIÓN', 'THRILLER', 'DRAMA', 'ACCIÓN'];

  ngOnInit(): void {
    this.iniciarAutoPlay();
  }

  ngOnDestroy(): void {
    this.detenerAutoPlay();
  }

  iniciarAutoPlay(): void {
    this.intervaloAutoPlay = setInterval(() => {
      this.siguienteHero();
    }, 5000);
  }

  detenerAutoPlay(): void {
    if (this.intervaloAutoPlay) {
      clearInterval(this.intervaloAutoPlay);
    }
  }

  siguienteHero(): void {
    this.indiceHeroActual = (this.indiceHeroActual + 1) % this.elementosHero.length;
  }

  seleccionarHero(indice: number): void {
    this.indiceHeroActual = indice;
    this.detenerAutoPlay();
    this.iniciarAutoPlay();
  }

  seleccionarPelicula(pelicula: Pelicula): void {
    console.log('Película seleccionada:', pelicula.nombre);
  }

  ejecutarAccionHero(item: HeroItem): void {
    console.log('Acción ejecutada:', item.titulo);
  }
}