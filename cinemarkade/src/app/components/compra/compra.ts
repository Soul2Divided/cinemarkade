import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Combo } from '../../core/combo/combo.model';
import { ComboService } from '../../core/combo/combo.service';
import { Cupon } from '../../core/cupon/cupon.model';
import { CuponService } from '../../core/cupon/cupon.service';
import { Producto } from '../../core/producto/producto.model';
import { ProductoService } from '../../core/producto/producto.service';
import { AuthService } from '../../auth/auth.service';
import { Loader } from '../loader/loader';
import { FormatoSala } from '../../core/sala/sala.model';
import { TarifaFormatoService } from '../../core/tarifa-formato/tarifa-formato.service';
import { Recompensa, SeleccionRecompensa } from '../../core/recompensa/recompensa.model';
import { RecompensaService } from '../../core/recompensa/recompensa.service';

interface SeleccionProyeccion {
    peliculaId: number;
    funcionId: number;
    proyeccionId: number;
    fecha: string;
    horario: string;
    formato: FormatoSala;
    idioma: string;
    salaId: number;
}

interface ItemSeleccionado {
    id: number;
    cantidad: number;
}

@Component({
    imports: [CommonModule, Navbar, Loader],
    selector: 'app-compra',
    styleUrl: './compra.scss',
    templateUrl: './compra.html'
})
export class Compra implements OnInit {
    private router = inject(Router);
    private comboService = inject(ComboService);
    private productoService = inject(ProductoService);
    private cuponService = inject(CuponService);
    private tarifaFormatoService = inject(TarifaFormatoService);
    private recompensaService = inject(RecompensaService);
    authService = inject(AuthService);

    seleccion = signal<SeleccionProyeccion | null>(null);
    productos = signal<Producto[]>([]);
    combos = signal<Combo[]>([]);
    cantidadEntradas = signal(1);
    productosSeleccionados = signal<ItemSeleccionado[]>([]);
    combosSeleccionados = signal<ItemSeleccionado[]>([]);
    tarifaBase = signal<number | null>(null);
    cupones = signal<Cupon[]>([]);
    codigoCupon = signal('');
    cuponAplicado = signal<Cupon | null>(null);
    mostrarLoader = signal(true);
    error = signal('');
    mensajeCupon = signal('');
    mensajeContinuar = signal('');
    esDiaPromocional = signal(false);
    precioEntrada = signal(0);
    recompensas = signal<Recompensa[]>([]);
    recompensasSeleccionadas = signal<SeleccionRecompensa[]>([]);
    errorRecompensas = signal('');

    puntosDisponibles = computed(() => this.authService.usuarioActual()?.puntos ?? 0);

    puntosUsados = computed(() =>
        this.recompensasSeleccionadas().reduce((s, i) => s + i.recompensa.costo_puntos * i.cantidad, 0)
    );

    entradasCanjeadas = computed(() =>
        this.recompensasSeleccionadas()
            .filter(i => i.recompensa.tipo === 'entrada')
            .reduce((s, i) => s + i.recompensa.cantidad * i.cantidad, 0)
    );

    entradasTotales = computed(() => this.cantidadEntradas() + this.entradasCanjeadas());

    subtotalEntradas = computed(() => this.precioEntrada() * this.cantidadEntradas());

    subtotalCandy = computed(() => {
        const productosTotal = this.productosSeleccionados().reduce((total, item) => {
            const producto = this.productos().find(actual => actual.id === item.id);

            return total + (producto?.precio ?? 0) * item.cantidad;
        }, 0);
        const combosTotal = this.combosSeleccionados().reduce((total, item) => {
            const combo = this.combos().find(actual => actual.id === item.id);

            return total + (combo?.precio ?? 0) * item.cantidad;
        }, 0);

        return productosTotal + combosTotal;
    });

    subtotal = computed(() => this.subtotalEntradas() + this.subtotalCandy());
    descuentoCupon = computed(() => (this.subtotal() * (this.cuponAplicado()?.porcentaje_descuento ?? 0)) / 100);
    total = computed(() => Math.max(0, this.subtotal() - this.descuentoCupon()));
    puntosEstimados = computed(() => (this.authService.usuarioActual() ? Math.floor(this.total()) : 0));

    async ngOnInit(): Promise<void> {
        try {
            const guardada = sessionStorage.getItem('cinemarkade-proyeccion-seleccionada');

            if (!guardada) {
                this.error.set('No encontramos una función seleccionada. Volvé a elegir una película y un horario.');

                return;
            }

            const seleccion = JSON.parse(guardada) as SeleccionProyeccion;

            if (!seleccion.proyeccionId || !seleccion.peliculaId || !seleccion.formato) {
                this.error.set('La función seleccionada no tiene todos los datos necesarios.');

                return;
            }

            this.seleccion.set(seleccion);

            const [productos, combos, cupones, tarifa] = await Promise.all([
                this.productoService.listarProductos(),
                this.comboService.listarCombos(),
                this.cuponService.listarCupones(),
                this.tarifaFormatoService.calcularPrecioEntrada(seleccion.formato, seleccion.fecha)
            ]);

            this.productos.set((productos ?? []).filter(producto => producto.activa));
            this.combos.set((combos ?? []).filter(combo => combo.activo && this.comboVigente(combo)));
            this.cupones.set((cupones ?? []).filter(cupon => cupon.activa));
            this.tarifaBase.set(tarifa.precio_base);
            this.precioEntrada.set(tarifa.precio_final);
            this.esDiaPromocional.set(tarifa.descuento_dia_aplicado);

            try {
                const recompensas = await this.recompensaService.listar();
                this.recompensas.set(
                    recompensas.filter(
                        r =>
                            r.activa &&
                            (r.tipo === 'entrada'
                                ? r.formato === seleccion.formato
                                : r.tipo === 'producto'
                                  ? this.productos().some(p => p.id === r.producto_id)
                                  : this.combos().some(c => c.id === r.combo_id))
                    )
                );
            } catch (e) {
                this.errorRecompensas.set(e instanceof Error ? e.message : 'No se pudieron cargar las recompensas.');
            }
            const borradorGuardado = sessionStorage.getItem('cinemarkade-compra-borrador');

            if (borradorGuardado) {
                const previo = JSON.parse(borradorGuardado);

                if (previo.proyeccion?.proyeccionId === seleccion.proyeccionId) {
                    const anteriores = (previo.recompensas ?? []) as SeleccionRecompensa[];
                    this.recompensasSeleccionadas.set(
                        anteriores.filter(i =>
                            this.recompensas().some(r => r.id === i.recompensa.id && r.version === i.recompensa.version)
                        )
                    );
                    const pagadas = Array.isArray(previo.entradas)
                        ? previo.entradas.filter((e: { medio_pago: string }) => e.medio_pago === 'dinero').length
                        : 1;
                    this.cantidadEntradas.set(
                        Math.max(this.entradasCanjeadas() ? 0 : 1, Math.min(8 - this.entradasCanjeadas(), pagadas))
                    );
                    this.productosSeleccionados.set(
                        (previo.productos ?? []).filter((i: ItemSeleccionado) =>
                            this.productos().some(p => p.id === i.id)
                        )
                    );
                    this.combosSeleccionados.set(
                        (previo.combos ?? []).filter((i: ItemSeleccionado) => this.combos().some(c => c.id === i.id))
                    );

                    if (previo.cupon?.codigo && this.authService.usuarioActual()) {
                        this.codigoCupon.set(previo.cupon.codigo);
                        this.aplicarCupon();
                    }

                    if (anteriores.length !== this.recompensasSeleccionadas().length) {
                        this.mensajeContinuar.set(
                            'Algunas recompensas cambiaron. Revisá la selección antes de continuar.'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('No se pudo preparar la compra:', error);
            this.error.set('No se pudo cargar la información de la compra. Intentá nuevamente.');
        } finally {
            this.mostrarLoader.set(false);
        }
    }

    cambiarCantidadEntradas(delta: number): void {
        this.cantidadEntradas.update(cantidad =>
            Math.min(8 - this.entradasCanjeadas(), Math.max(this.entradasCanjeadas() ? 0 : 1, cantidad + delta))
        );
    }

    cantidadRecompensa(id: number): number {
        return this.recompensasSeleccionadas().find(i => i.recompensa.id === id)?.cantidad ?? 0;
    }

    cambiarRecompensa(recompensa: Recompensa, delta: number): void {
        this.mensajeContinuar.set('');

        if (!this.authService.usuarioActual()) {
            return;
        }

        const actual = this.cantidadRecompensa(recompensa.id);
        const cantidad = actual + delta;

        if (cantidad < 0 || cantidad > 10) {
            return;
        }

        if (delta > 0 && this.puntosUsados() + recompensa.costo_puntos > this.puntosDisponibles()) {
            this.mensajeContinuar.set('No tenés puntos suficientes.');

            return;
        }

        const canjeadas = this.entradasCanjeadas() + (recompensa.tipo === 'entrada' ? delta * recompensa.cantidad : 0);

        if (canjeadas > 8) {
            this.mensajeContinuar.set('Podés seleccionar hasta 8 entradas por compra.');

            return;
        }

        this.recompensasSeleccionadas.update(items =>
            cantidad === 0
                ? items.filter(i => i.recompensa.id !== recompensa.id)
                : actual
                  ? items.map(i => (i.recompensa.id === recompensa.id ? { ...i, cantidad } : i))
                  : [...items, { recompensa, cantidad }]
        );

        if (this.entradasTotales() > 8) {
            this.cantidadEntradas.set(8 - canjeadas);
        }

        if (this.entradasTotales() === 0) {
            this.cantidadEntradas.set(1);
        }
    }

    cambiarCantidadProducto(id: number, delta: number): void {
        this.productosSeleccionados.update(items => this.actualizarCantidad(items, id, delta));
    }

    cambiarCantidadCombo(id: number, delta: number): void {
        this.combosSeleccionados.update(items => this.actualizarCantidad(items, id, delta));
    }

    cantidadProducto(id: number): number {
        return this.productosSeleccionados().find(item => item.id === id)?.cantidad ?? 0;
    }

    cantidadCombo(id: number): number {
        return this.combosSeleccionados().find(item => item.id === id)?.cantidad ?? 0;
    }

    nombreCombo(id: number): string {
        return this.combos().find(combo => combo.id === id)?.nombre ?? 'Combo';
    }

    precioCombo(id: number): number {
        return this.combos().find(combo => combo.id === id)?.precio ?? 0;
    }

    nombreProducto(id: number): string {
        return this.productos().find(producto => producto.id === id)?.nombre ?? 'Producto';
    }

    precioProducto(id: number): number {
        return this.productos().find(producto => producto.id === id)?.precio ?? 0;
    }

    actualizarCodigoCupon(event: Event): void {
        this.codigoCupon.set((event.target as HTMLInputElement).value.toUpperCase().trim());
    }

    aplicarCupon(): void {
        if (!this.authService.usuarioActual()) {
            this.mensajeCupon.set('Iniciá sesión para usar cupones.');

            return;
        }

        if (!this.codigoCupon()) {
            this.mensajeCupon.set('Ingresá un código de cupón.');

            return;
        }

        if (this.cuponAplicado()) {
            this.mensajeCupon.set('Solo se puede aplicar un cupón por compra.');

            return;
        }

        const cupon = this.cupones().find(item => item.codigo.toUpperCase() === this.codigoCupon());

        if (!cupon || !this.cuponVigente(cupon)) {
            this.mensajeCupon.set('El cupón no existe o no está vigente.');

            return;
        }

        const fechaNacimiento = this.authService.usuarioActual()?.fecha_nacimiento;
        const edad = fechaNacimiento ? this.calcularEdad(fechaNacimiento) : null;

        if (cupon.edad_minima > 0 && (edad === null || edad < cupon.edad_minima)) {
            this.mensajeCupon.set('Tu perfil no cumple con la edad mínima para este cupón.');

            return;
        }

        this.cuponAplicado.set(cupon);
        this.mensajeCupon.set(`Cupón aplicado: ${cupon.porcentaje_descuento}% de descuento.`);
    }

    quitarCupon(): void {
        this.cuponAplicado.set(null);
        this.codigoCupon.set('');
        this.mensajeCupon.set('');
    }

    cancelar(): void {
        sessionStorage.removeItem('cinemarkade-compra-borrador');
        const peliculaId = this.seleccion()?.peliculaId;

        if (peliculaId) {
            void this.router.navigate(['/funciones', peliculaId]);
        } else {
            void this.router.navigate(['/']);
        }
    }

    continuar(): void {
        if (!this.seleccion() || this.tarifaBase() === null || this.entradasTotales() < 1) {
            return;
        }

        if (
            this.puntosUsados() > 0 &&
            (!this.authService.usuarioActual() || this.puntosUsados() > this.puntosDisponibles())
        ) {
            this.mensajeContinuar.set('El saldo de puntos no alcanza para los canjes seleccionados.');

            return;
        }

        sessionStorage.setItem(
            'cinemarkade-compra-borrador',
            JSON.stringify({
                proyeccion: this.seleccion(),
                solicitudId: crypto.randomUUID(),
                cantidadEntradas: this.entradasTotales(),
                recompensas: this.recompensasSeleccionadas(),
                puntosUsados: this.puntosUsados(),
                entradas: [
                    ...Array.from({ length: this.cantidadEntradas() }, () => ({
                        precio_unitario: this.precioEntrada(),
                        medio_pago: 'dinero',
                        puntos_usados: 0
                    })),
                    ...this.recompensasSeleccionadas()
                        .filter(i => i.recompensa.tipo === 'entrada')
                        .flatMap(i =>
                            Array.from({ length: i.recompensa.cantidad * i.cantidad }, () => ({
                                precio_unitario: 0,
                                medio_pago: 'puntos',
                                puntos_usados: 0,
                                recompensa_id: i.recompensa.id
                            }))
                        )
                ],
                productos: this.productosSeleccionados(),
                combos: this.combosSeleccionados(),
                cupon: this.cuponAplicado(),
                subtotal: this.subtotal(),
                total: this.total(),
                puntosEstimados: this.puntosEstimados()
            })
        );
        this.mensajeContinuar.set('');
        void this.router.navigate(['/butacas']);
    }

    formatoHora(horario: string): string {
        return horario?.slice(0, 5) ?? '';
    }

    private actualizarCantidad(items: ItemSeleccionado[], id: number, delta: number): ItemSeleccionado[] {
        const actual = items.find(item => item.id === id)?.cantidad ?? 0;
        const siguiente = Math.max(0, Math.min(10, actual + delta));

        return siguiente === 0
            ? items.filter(item => item.id !== id)
            : items.some(item => item.id === id)
              ? items.map(item => (item.id === id ? { ...item, cantidad: siguiente } : item))
              : [...items, { id, cantidad: siguiente }];
    }

    private comboVigente(combo: Combo): boolean {
        const hoy = this.fechaHoy();
        const desde = combo.fecha_inicio?.slice(0, 10);
        const hasta = combo.fecha_fin?.slice(0, 10);

        return (!desde || desde <= hoy) && (!hasta || hasta >= hoy);
    }

    private cuponVigente(cupon: Cupon): boolean {
        const hoy = this.fechaHoy();

        return cupon.activa && cupon.fecha_inicio.slice(0, 10) <= hoy && cupon.fecha_fin.slice(0, 10) >= hoy;
    }

    private calcularEdad(fechaNacimiento: string): number {
        const nacimiento = new Date(`${fechaNacimiento.slice(0, 10)}T12:00:00Z`);
        const hoy = new Date(`${this.fechaHoy()}T12:00:00Z`);
        let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
        const diferenciaMes = hoy.getUTCMonth() - nacimiento.getUTCMonth();

        if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) {
            edad--;
        }

        return edad;
    }

    private fechaHoy(): string {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());
        const obtener = (tipo: string) => partes.find(parte => parte.type === tipo)!.value;

        return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
    }
}
