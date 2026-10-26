import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { BorradorCompra } from '../compra/borrador-compra.model';
import { AuthService } from '../../auth/auth.service';
import { CatalogoCandyService } from './catalogo-candy.service';

export type TipoItemCandy = 'producto' | 'combo' | 'recompensa';

export interface SeleccionCandy {
    tipo: TipoItemCandy;
    id: number;
    cantidad: number;
}

export interface LineaCarritoCandy extends SeleccionCandy {
    nombre: string;
    precio: number;
    puntos: number;
    unidades: number;
    disponible: boolean;
}

@Injectable({ providedIn: 'root' })
export class CarritoCandyService {
    private readonly authService = inject(AuthService);
    private readonly catalogo = inject(CatalogoCandyService);
    private readonly seleccion = signal<SeleccionCandy[]>([]);
    private readonly clave = signal<string | null>(null);

    readonly maximoUnidades = 99;
    readonly mensaje = signal('');
    readonly avisoAlmacenamiento = signal('');
    readonly sesionCargando = this.authService.cargandoUsuario;
    readonly registrado = computed(() => !!this.authService.usuarioActual());
    readonly puntosDisponibles = computed(() => this.authService.usuarioActual()?.puntos ?? 0);
    readonly lineas = computed<LineaCarritoCandy[]>(() => this.seleccion().map(item => {
        const articulo = item.tipo === 'producto'
            ? this.catalogo.productos().find(producto => producto.id === item.id)
            : item.tipo === 'combo'
                ? this.catalogo.combos().find(combo => combo.id === item.id)
                : this.catalogo.recompensas().find(recompensa => recompensa.id === item.id);
        const recompensa = item.tipo === 'recompensa'
            ? this.catalogo.recompensas().find(actual => actual.id === item.id)
            : undefined;

        return {
            ...item,
            nombre: articulo?.nombre ?? 'Artículo no disponible',
            precio: articulo && 'precio' in articulo ? Number(articulo.precio) : 0,
            puntos: recompensa?.costo_puntos ?? 0,
            unidades: recompensa?.cantidad ?? 1,
            disponible: !!articulo
        };
    }));
    readonly total = computed(() => this.lineas().reduce((total, item) => total + item.precio * item.cantidad, 0));
    readonly puntosUsados = computed(() => this.lineas().reduce((total, item) => total + item.puntos * item.cantidad, 0));
    readonly puntosRestantes = computed(() => this.puntosDisponibles() - this.puntosUsados());
    readonly puntosEstimados = computed(() => this.registrado() ? Math.floor(this.total()) : 0);
    readonly cantidadArticulos = computed(() => this.lineas().reduce((total, item) => total + item.cantidad * item.unidades, 0));
    readonly saldoInsuficiente = computed(() => this.puntosUsados() > this.puntosDisponibles());
    readonly hayNoDisponibles = computed(() => this.catalogo.cargado() && this.lineas().some(item => !item.disponible));

    constructor() {
        /*
         * Permite ejecutar una acción en respuesta a cambios de signals, sin que la acción se ejecute dentro de un contexto de signals.
         * Apenas cambie la información del usuario en authService, el sistema reaccione solo y reordena la clave del carrito.
         */
        effect(() => {
            if (this.authService.cargandoUsuario()) {
                return;
            }

            const clave = `cinemarkade-carrito-candy:${this.authService.usuarioActual()?.id ?? 'anonimo'}`;

            /*
             * Ejecuta este bloque pero no agrega las signals que lea como dependencias de este efecto.
             * Para leer y modificar las Signals propias del componente evitando que el effect se reejecute en bucle al modificar 
             * los mismos datos que lee.
             */
            untracked(() => {
                if (this.clave() === clave) {
                    return;
                }

                this.clave.set(clave);
                this.seleccion.set(this.restaurar(clave));
                this.mensaje.set('');
            });
        });

        effect(() => {
            const clave = this.clave();
            const seleccion = this.seleccion();

            if (!clave || this.authService.cargandoUsuario()) {
                return;
            }

            try {
                localStorage.setItem(clave, JSON.stringify({ version: 1, items: seleccion }));
                this.avisoAlmacenamiento.set('');
            } catch {
                this.avisoAlmacenamiento.set('El navegador no permite guardar el carrito. Se conservará mientras sigas en la aplicación.');
            }
        });

        effect(() => {
            if (!this.catalogo.cargado()) {
                return;
            }

            const recompensas = this.catalogo.recompensas();
            const seleccion = this.seleccion();
            const ajustada = seleccion.map(item => {
                const recompensa = item.tipo === 'recompensa'
                    ? recompensas.find(actual => actual.id === item.id)
                    : undefined;
                const maximo = recompensa ? Math.floor(this.maximoUnidades / recompensa.cantidad) : this.maximoUnidades;

                return { ...item, cantidad: Math.min(item.cantidad, maximo) };
            }).filter(item => item.cantidad > 0);

            if (JSON.stringify(seleccion) !== JSON.stringify(ajustada)) {
                this.seleccion.set(ajustada);
                this.mensaje.set('Ajustamos la cantidad de los canjes al máximo de 99 unidades por recompensa.');
            }
        });
    }

    cantidad(tipo: TipoItemCandy, id: number): number {
        return this.seleccion().find(item => item.tipo === tipo && item.id === id)?.cantidad ?? 0;
    }

    cambiarCantidad(tipo: TipoItemCandy, id: number, cantidad: number): void {
        this.mensaje.set('');

        if (this.sesionCargando() || this.catalogo.cargando() || !this.catalogo.cargado()) {
            return;
        }

        if (!Number.isSafeInteger(cantidad) || cantidad < 0 || cantidad > this.maximoUnidades) {
            this.mensaje.set('La cantidad debe ser un número entero entre 0 y 99.');
            return;
        }

        if (cantidad === 0) {
            this.quitar(tipo, id);
            return;
        }

        const recompensa = this.catalogo.recompensas().find(item => item.id === id);
        const disponible = tipo === 'producto'
            ? this.catalogo.productos().some(item => item.id === id)
            : tipo === 'combo'
                ? this.catalogo.combos().some(item => item.id === id)
                : !!recompensa;

        if (!disponible) {
            this.mensaje.set('El artículo ya no está disponible. Quitalo del carrito o actualizá el catálogo.');
            return;
        }

        if (tipo === 'recompensa' && recompensa) {
            if (!this.registrado()) {
                this.mensaje.set('Iniciá sesión para canjear puntos.');
                return;
            }

            if (recompensa.cantidad * cantidad > this.maximoUnidades) {
                this.mensaje.set('Cantidad máxima excedida.');
                return;
            }

            const puntos = this.puntosUsados() + (cantidad - this.cantidad(tipo, id)) * recompensa.costo_puntos;

            if (puntos > this.puntosDisponibles() && cantidad > this.cantidad(tipo, id)) {
                this.mensaje.set('No tenés puntos suficientes para agregar ese canje.');
                return;
            }
        }

        this.seleccion.update(items => [
            ...items.filter(item => item.tipo !== tipo || item.id !== id),
            { tipo, id, cantidad }
        ]);
    }

    agregar(tipo: TipoItemCandy, id: number): void {
        this.cambiarCantidad(tipo, id, this.cantidad(tipo, id) + 1);
    }

    quitar(tipo: TipoItemCandy, id: number): void {
        this.seleccion.update(items => items.filter(item => item.tipo !== tipo || item.id !== id));
        this.mensaje.set('');
    }

    vaciar(): void {
        this.seleccion.set([]);
        this.mensaje.set('');
    }

    prepararCompra(): BorradorCompra {
        if (this.sesionCargando() || this.catalogo.cargando() || !this.catalogo.cargado() || this.catalogo.error()) {
            throw new Error('Esperá a que termine de cargar el catálogo.');
        }

        if (!this.lineas().length || this.hayNoDisponibles()) {
            throw new Error('Agregá artículos disponibles antes de continuar.');
        }

        if (this.saldoInsuficiente()) {
            throw new Error('Tu saldo no alcanza para los canjes seleccionados.');
        }

        const borrador: BorradorCompra = {
            tipoCompra: 'candy',
            usuarioId: this.authService.usuarioActual()?.id ?? null,
            cantidadEntradas: 0,
            entradas: [],
            productos: this.seleccion().filter(item => item.tipo === 'producto').map(({ id, cantidad }) => ({ id, cantidad })),
            combos: this.seleccion().filter(item => item.tipo === 'combo').map(({ id, cantidad }) => ({ id, cantidad })),
            recompensas: this.seleccion().filter(item => item.tipo === 'recompensa').map(item => {
                const recompensa = this.catalogo.recompensas().find(actual => actual.id === item.id)!;

                return { recompensa, cantidad: item.cantidad };
            }),
            puntosUsados: this.puntosUsados(),
            subtotal: this.total(),
            total: this.total(),
            puntosEstimados: this.puntosEstimados()
        };
        const previo = sessionStorage.getItem('cinemarkade-compra-borrador');
        let solicitudId = crypto.randomUUID();

        if (previo) {
            try {
                const { solicitudId: anterior, ...datos } = JSON.parse(previo);

                const firma = (compra: BorradorCompra) => JSON.stringify({
                    tipo: compra.tipoCompra,
                    usuario: compra.usuarioId,
                    productos: compra.productos,
                    combos: compra.combos,
                    recompensas: compra.recompensas?.map(item => ({ id: item.recompensa.id, cantidad: item.cantidad }))
                });

                if (anterior && firma(datos) === firma(borrador)) {
                    solicitudId = anterior;
                }
            } catch {
                // Un borrador ilegible se reemplaza por la selección actual.
            }
        }

        borrador.solicitudId = solicitudId;
        sessionStorage.setItem('cinemarkade-compra-borrador', JSON.stringify(borrador));

        return borrador;
    }

    private restaurar(clave: string): SeleccionCandy[] {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) ?? 'null');

            if (datos?.version !== 1 || !Array.isArray(datos.items)) {
                return [];
            }

            const items = new Map<string, SeleccionCandy>();

            for (const item of datos.items) {
                if (['producto', 'combo', 'recompensa'].includes(item?.tipo) &&
                    Number.isSafeInteger(item.id) && item.id > 0 &&
                    Number.isSafeInteger(item.cantidad) && item.cantidad >= 1 && item.cantidad <= 99) {
                    items.set(`${item.tipo}:${item.id}`, { tipo: item.tipo, id: item.id, cantidad: item.cantidad });
                }
            }

            return [...items.values()];
        } catch {
            return [];
        }
    }
}
