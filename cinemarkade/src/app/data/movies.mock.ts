import { Pelicula } from '../models/pelicula';
import { HeroItem } from '../models/hero-item'

export const PELICULA_INTERSTELLAR_MOCK: Pelicula = {
    id: 1,
    nombre: 'INTERSTELLAR',
    genero: 'CIENCIA FICCIÓN',
    duracion: '169 MIN',
    imagen: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    sinopsis: 'Un grupo de exploradores viaja a través de un agujero de gusano en el espacio.',
    restriccionEdad: '+13',
    banner: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo6LEuPJflrSt.jpg',
    precio: 4500,
    sala: 'SALA 1 - IMAX'
};

export const ELEMENTOS_HERO_MOCK: HeroItem[] = [
    {
        id: 1,
        tipo: 'pelicula',
        etiqueta: 'NUEVO EXCLUSIVO',
        titulo: 'INTERSTELLAR',
        meta: '2014 | 169 MIN | CIENCIA FICCIÓN | +13',
        sinopsis: 'Un grupo de exploradores viaja a través de un agujero de gusano en el espacio en un intento por garantizar la supervivencia de la humanidad.',
        imagenBanner: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo6LEuPJflrSt.jpg',
        textoBoton: '▶ COMPRAR TICKETS'
    },
    {
        id: 2,
        tipo: 'combo',
        etiqueta: 'PROMO CANDYBAR',
        titulo: 'COMBO 1: PLAYER ONE',
        meta: 'POCHOCLOS GIGANTES + 2 BEBIDAS 750ML',
        sinopsis: 'Cargá energías para la función con el combo clásico de pochoclos recién hechos y dos gaseosas a elección.',
        imagenBanner: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo6LEuPJflrSt.jpg',
        textoBoton: '🛒 PEDIR EN CANDYBAR'
    }
];

export const LISTA_PELICULAS_MOCK: Pelicula[] = Array(4).fill(PELICULA_INTERSTELLAR_MOCK);