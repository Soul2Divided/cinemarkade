import { Injectable, computed, inject, signal } from '@angular/core';
import { ProductoService } from '../producto/producto.service';
import { Producto } from '../producto/producto.model';
import { ComboService } from '../combo/combo.service';
import { Combo } from '../combo/combo.model';
import { RecompensaService } from '../recompensa/recompensa.service';
import { Recompensa } from '../recompensa/recompensa.model';

@Injectable({ providedIn: 'root' })
export class CatalogoCandyService {
    private readonly productoService = inject(ProductoService);
    private readonly comboService = inject(ComboService);
    private readonly recompensaService = inject(RecompensaService);

    private readonly productosGuardados = signal<Producto[]>([]);
    private readonly combosGuardados = signal<Combo[]>([]);
    private readonly recompensasGuardadas = signal<Recompensa[]>([]);

    readonly cargando = signal(false);
    readonly cargado = signal(false);
    readonly error = signal('');
    readonly productos = computed(() => this.productosGuardados().filter(producto => producto.activa));
    readonly combos = computed(() => this.combosGuardados().filter(combo => this.comboVigente(combo)));
    readonly recompensas = computed(() => this.recompensasGuardadas().filter(recompensa => {
        if (!recompensa.activa || recompensa.tipo === 'entrada') {
            return false;
        }

        return recompensa.tipo === 'producto'
            ? this.productos().some(producto => producto.id === recompensa.producto_id)
            : this.combos().some(combo => combo.id === recompensa.combo_id);
    }));

    async cargar(): Promise<void> {
        if (this.cargando()) {
            return;
        }

        this.cargando.set(true);
        this.error.set('');

        try {
            const [productos, combos, recompensas] = await Promise.all([
                this.productoService.listarProductos(),
                this.comboService.listarCombos(),
                this.recompensaService.listar()
            ]);

            this.productosGuardados.set(productos);
            this.combosGuardados.set(combos);
            this.recompensasGuardadas.set(recompensas);
            this.cargado.set(true);
        } catch (error) {
            this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el catálogo de candy.');
        } finally {
            this.cargando.set(false);
        }
    }

    imagenCombo(combo: Combo): string {
        const producto = combo.items
            ?.map(item => this.productos().find(actual => actual.id === item.producto_id))
            .find(actual => !!actual?.imagen);

        return combo.imagen?.trim() || producto?.imagen || '';
    }

    private comboVigente(combo: Combo): boolean {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        const parte = (tipo: string) => partes.find(actual => actual.type === tipo)?.value ?? '';
        const hoy = `${parte('year')}-${parte('month')}-${parte('day')}`;

        return combo.activo &&
            (!combo.fecha_inicio || combo.fecha_inicio.slice(0, 10) <= hoy) &&
            (!combo.fecha_fin || combo.fecha_fin.slice(0, 10) >= hoy);
    }
}
