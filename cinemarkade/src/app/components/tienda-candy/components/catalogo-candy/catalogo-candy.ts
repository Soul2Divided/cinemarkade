import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CarritoCandyService } from '../../../../core/candy/carrito-candy.service';
import { CatalogoCandyService } from '../../../../core/candy/catalogo-candy.service';
import { TarjetaCandy } from '../tarjeta-candy/tarjeta-candy';

@Component({
    selector: 'app-catalogo-candy',
    imports: [CurrencyPipe, TarjetaCandy],
    templateUrl: './catalogo-candy.html',
    styleUrl: './catalogo-candy.scss'
})
export class CatalogoCandy {
    readonly catalogo = inject(CatalogoCandyService);
    readonly carrito = inject(CarritoCandyService);
}
