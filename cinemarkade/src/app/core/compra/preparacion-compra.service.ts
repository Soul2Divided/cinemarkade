import { Injectable, inject } from '@angular/core';
import { BorradorCompra } from './borrador-compra.model';
import { ConfirmarCompraInput } from './compra.model';
import { ResumenCompra } from './resumen-compra.model';
import { ButacaProyeccionService } from '../butaca-proyeccion/butaca-proyeccion.service';
import { ButacaProyeccionVista } from '../butaca-proyeccion/butaca-proyeccion.model';
import { PeliculaService } from '../pelicula/pelicula.service';
import { Pelicula } from '../pelicula/pelicula.model';
import { ProductoService } from '../producto/producto.service';
import { Producto } from '../producto/producto.model';
import { ComboService } from '../combo/combo.service';
import { Combo } from '../combo/combo.model';

export interface CatalogosConfirmacionCompra {
    peliculas: Pelicula[];
    productos: Producto[];
    combos: Combo[];
    butacas: ButacaProyeccionVista[];
}

@Injectable({ providedIn: 'root' })
export class PreparacionCompraService {
    private readonly peliculaService = inject(PeliculaService);
    private readonly productoService = inject(ProductoService);
    private readonly comboService = inject(ComboService);
    private readonly butacaProyeccionService = inject(ButacaProyeccionService);

    recuperarBorrador(tipoCandy = false): BorradorCompra {
        const guardado = sessionStorage.getItem('cinemarkade-compra-borrador');

        if (!guardado) {
            throw new Error('No encontramos una compra para confirmar. Volvé a iniciar la compra.');
        }

        const borrador = JSON.parse(guardado) as BorradorCompra;

        if ((borrador.tipoCompra === 'candy') !== tipoCandy) {
            throw new Error('No encontramos una compra de este tipo para confirmar.');
        }

        if (!borrador.solicitudId) {
            borrador.solicitudId = crypto.randomUUID();
            sessionStorage.setItem('cinemarkade-compra-borrador', JSON.stringify(borrador));
        }

        if (
            !Array.isArray(borrador.productos) ||
            !Array.isArray(borrador.combos) ||
            !Number.isFinite(borrador.total) ||
            borrador.total < 0
        ) {
            throw new Error('El resumen de la compra no es válido.');
        }

        if (tipoCandy) {
            if (
                borrador.proyeccion ||
                borrador.cantidadEntradas !== 0 ||
                (!borrador.productos.length &&
                    !borrador.combos.length &&
                    !borrador.recompensas?.length)
            ) {
                throw new Error('El pedido de candy no tiene artículos válidos.');
            }
        } else if (
            !borrador.proyeccion?.proyeccionId ||
            !Array.isArray(borrador.entradas) ||
            borrador.entradas.length !== borrador.cantidadEntradas ||
            !borrador.butacaProyeccionIds?.length ||
            borrador.butacaProyeccionIds.length !== borrador.cantidadEntradas
        ) {
            throw new Error(
                'Faltan datos de la función o no se seleccionó una butaca por cada entrada.',
            );
        }

        return borrador;
    }

    async cargarCatalogos(borrador: BorradorCompra): Promise<CatalogosConfirmacionCompra> {
        const [peliculas, productos, combos, butacas] = await Promise.all([
            borrador.tipoCompra === 'candy'
                ? Promise.resolve([])
                : this.peliculaService.listarPeliculas(),
            this.productoService.listarProductos(),
            this.comboService.listarCombos(),
            borrador.proyeccion
                ? this.butacaProyeccionService.listarPorProyeccion(borrador.proyeccion.proyeccionId)
                : Promise.resolve([]),
        ]);

        return {
            peliculas: peliculas ?? [],
            productos: productos ?? [],
            combos: combos ?? [],
            butacas: butacas ?? [],
        };
    }

    crearResumen(borrador: BorradorCompra, catalogos: CatalogosConfirmacionCompra): ResumenCompra {
        return {
            entrada: borrador.proyeccion
                ? {
                      pelicula:
                          catalogos.peliculas.find(
                              (item) => item.id === borrador.proyeccion?.peliculaId,
                          )?.nombre ?? 'Película',
                      fecha: this.formatearFecha(borrador.proyeccion.fecha),
                      horario: borrador.proyeccion.horario.slice(0, 5),
                      sala: borrador.proyeccion.salaId,
                      formato: borrador.proyeccion.formato,
                      idioma: borrador.proyeccion.idioma,
                      cantidadEntradas: borrador.cantidadEntradas,
                      butacas: borrador.butacasSeleccionadas ?? [],
                  }
                : null,
            productos: [
                ...borrador.combos.map((item) => {
                    const combo = catalogos.combos.find((actual) => actual.id === item.id);

                    return {
                        id: item.id,
                        nombre: combo?.nombre ?? 'Combo',
                        cantidad: item.cantidad,
                        importe: (combo?.precio ?? 0) * item.cantidad,
                    };
                }),
                ...borrador.productos.map((item) => {
                    const producto = catalogos.productos.find((actual) => actual.id === item.id);

                    return {
                        id: item.id,
                        nombre: producto?.nombre ?? 'Producto',
                        cantidad: item.cantidad,
                        importe: (producto?.precio ?? 0) * item.cantidad,
                    };
                }),
            ],
            recompensas: (borrador.recompensas ?? []).map((item) => ({
                id: item.recompensa.id,
                nombre: item.recompensa.nombre,
                cantidad: item.cantidad,
                importe: item.cantidad * item.recompensa.costo_puntos,
            })),
            totales: {
                total: borrador.total,
                puntos: borrador.puntosEstimados,
                recargoVip: borrador.recargoButacasVip ?? 0,
                cupon: borrador.cupon,
            },
        };
    }

    validarButacas(
        borrador: BorradorCompra,
        butacas: ButacaProyeccionVista[],
    ): ButacaProyeccionVista[] {
        if (borrador.tipoCompra === 'candy') {
            return [];
        }

        const seleccionadas = borrador.butacaProyeccionIds
            ?.map((id) => butacas.find((butaca) => butaca.id === id))
            .filter((butaca): butaca is ButacaProyeccionVista => !!butaca);

        if (!seleccionadas || seleccionadas.length !== borrador.cantidadEntradas) {
            throw new Error('No encontramos todas las butacas seleccionadas. Volvé a elegirlas.');
        }

        if (seleccionadas.some((butaca) => butaca.estado !== 'libre')) {
            throw new Error(
                'Alguna butaca ya no está disponible. Volvé a la grilla y elegí otras.',
            );
        }

        return seleccionadas;
    }

    prepararSolicitud(
        borrador: BorradorCompra,
        catalogos: CatalogosConfirmacionCompra,
        tieneSesion: boolean,
    ): ConfirmarCompraInput {
        const butacasSeleccionadas = this.validarButacas(borrador, catalogos.butacas);
        const detalles: ConfirmarCompraInput['detalles'] = [
            ...borrador.productos.map((item) => {
                const producto = catalogos.productos.find((actual) => actual.id === item.id);

                if (!producto) {
                    throw new Error('Uno de los productos ya no está disponible.');
                }

                return {
                    producto_id: producto.id,
                    combo_id: null,
                    tipo_item: 'producto' as const,
                    nombre_item: producto.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: producto.precio,
                    medio_pago: 'dinero' as const,
                    puntos_usados: 0,
                    puntos_generados: Math.floor(producto.precio * item.cantidad),
                };
            }),
            ...borrador.combos.map((item) => {
                const combo = catalogos.combos.find((actual) => actual.id === item.id);

                if (!combo) {
                    throw new Error('Uno de los combos ya no está disponible.');
                }

                return {
                    producto_id: null,
                    combo_id: combo.id,
                    tipo_item: 'combo' as const,
                    nombre_item: combo.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: combo.precio,
                    medio_pago: 'dinero' as const,
                    puntos_usados: 0,
                    puntos_generados: Math.floor(combo.precio * item.cantidad),
                };
            }),
        ];
        const butacas = butacasSeleccionadas.map((butaca, index) => ({
            butaca_proyeccion_id: butaca.id,
            medio_pago: borrador.entradas?.[index]?.medio_pago ?? 'dinero',
            recompensa_id: borrador.entradas?.[index]?.recompensa_id,
            precio_unitario:
                (borrador.entradas?.[index]?.precio_unitario ??
                    borrador.entradas?.[0]?.precio_unitario ??
                    0) + (butaca.butaca.tipo === 'vip' ? 5000 : 0),
            puntos_usados: 0,
        }));
        const datos: ConfirmarCompraInput = {
            tipo_compra: borrador.tipoCompra ?? 'entradas',
            solicitud_id: borrador.solicitudId!,
            cupon_codigo: borrador.cupon?.codigo ?? null,
            recompensas: (borrador.recompensas ?? []).map((i) => ({
                recompensa_id: i.recompensa.id,
                cantidad: i.cantidad,
                costo_puntos: i.recompensa.costo_puntos,
                version: i.recompensa.version,
            })),
            proyeccion_id: borrador.proyeccion?.proyeccionId ?? null,
            total: borrador.total,
            creditos_usados: 0,
            puntos_generados: tieneSesion ? Math.floor(borrador.total) : 0,
            butacas,
            detalles,
        };

        return datos;
    }

    private formatearFecha(fecha: string): string {
        const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);

        if (!anio || !mes || !dia) {
            return fecha;
        }

        return new Date(anio, mes - 1, dia, 12).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
}
