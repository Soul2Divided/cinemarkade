import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Loader } from '../loader/loader';
import { CatalogoCandyService } from '../../core/candy/catalogo-candy.service';
import { CarritoCandyService } from '../../core/candy/carrito-candy.service';
import { CabeceraCandy } from './components/cabecera-candy/cabecera-candy';
import { CatalogoCandy } from './components/catalogo-candy/catalogo-candy';
import { RecompensasCandy } from './components/recompensas-candy/recompensas-candy';
import { ResumenCandy } from './components/resumen-candy/resumen-candy';

@Component({
    selector: 'app-tienda-candy',
    imports: [RouterLink, Navbar, Loader, CabeceraCandy, CatalogoCandy, RecompensasCandy, ResumenCandy],
    templateUrl: './tienda-candy.html',
    styleUrl: './tienda-candy.scss'
})
export class TiendaCandy implements OnInit {
    readonly catalogo = inject(CatalogoCandyService);
    readonly carrito = inject(CarritoCandyService);

    ngOnInit(): void {
        void this.catalogo.cargar();
    }
}
