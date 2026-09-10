import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  selector: 'app-home-page',
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})
export class HomePage {
  isAuthModalOpen: boolean = false;
  modalView: 'options' | 'guest' = 'options';

  movies: Movie[] = [
    {
      id: 1,
      title: 'INTERSTELLAR',
      genre: 'SCI-FI',
      duration: '169 MIN',
      hall: 'SALA 1 - IMAX',
      price: 4500,
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
    },
    {
      id: 2,
      title: 'THE BATMAN',
      genre: 'ACCIÓN',
      duration: '176 MIN',
      hall: 'SALA 2 - 3D',
      price: 4000,
      posterUrl: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9325a3S.jpg'
    }
  ];

  openAuthModal(): void {
    this.modalView = 'options';
    this.isAuthModalOpen = true;
  }

  closeAuthModal(): void {
    this.isAuthModalOpen = false;
  }

  selectMovie(movie: Movie): void {
    // Si el usuario intenta comprar sin autenticarse, despliega el modal
    this.openAuthModal();
  }
}
