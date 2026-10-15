import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Recompensa, RecompensaInput } from '../../../core/recompensa/recompensa.model';
import { RecompensaService } from '../../../core/recompensa/recompensa.service';
import { ProductoService } from '../../../core/producto/producto.service';
import { ComboService } from '../../../core/combo/combo.service';
import { Producto } from '../../../core/producto/producto.model';
import { Combo } from '../../../core/combo/combo.model';
import { FORMATOS_SALA } from '../../../core/sala/sala.model';
import { Modal } from '../../modal/modal';

@Component({
    selector: 'app-recompensas',
    imports: [CommonModule, FormsModule, RouterLink, Modal],
    templateUrl: './recompensas.html',
    styleUrls: [
        '../abm-combo/abm-combo.scss',
        '../add-combo/add-combo.scss',
        './recompensas.scss'
    ]
})
export class Recompensas implements OnInit {
    private readonly service = inject(RecompensaService);
    private readonly productosService = inject(ProductoService);
    private readonly combosService = inject(ComboService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly formatos = FORMATOS_SALA;

    readonly recompensas = signal<Recompensa[]>([]);
    readonly productos = signal<Producto[]>([]);
    readonly combos = signal<Combo[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly error = signal('');
    readonly filtro = signal('');
    readonly pendiente = signal<Recompensa | null>(null);

    readonly filtradas = computed(() =>
        this.recompensas().filter(r => r.nombre.toLowerCase().includes(this.filtro().toLowerCase()))
    );

    readonly formulario = this.route.snapshot.data['formulario'] === true;
    readonly id = Number(this.route.snapshot.paramMap.get('id')) || undefined;

    datos: RecompensaInput = {
        nombre: '',
        tipo: 'entrada',
        formato: '3D',
        producto_id: null,
        combo_id: null,
        cantidad: 1,
        costo_puntos: 1,
        activa: true
    };

    async ngOnInit(): Promise<void> {
        try {
            const [recompensas, productos, combos] = await Promise.all([
                this.service.listar(),
                this.productosService.listarProductos(),
                this.combosService.listarCombos()
            ]);

            this.recompensas.set(recompensas);
            this.productos.set(productos);
            this.combos.set(combos);

            if (this.id) {
                const actual = recompensas.find(r => r.id === this.id);

                if (!actual) {
                    throw new Error('No se encontró la recompensa.');
                }

                const { id, ...datos } = actual;
                this.datos = datos;
            }
        } catch (e) {
            this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
        } finally {
            this.cargando.set(false);
        }
    }

    contenido(r: RecompensaInput): string {
        const nombre =
            r.tipo === 'entrada'
                ? `entrada ${r.formato}`
                : r.tipo === 'producto'
                  ? this.productos().find(p => p.id === r.producto_id)?.nombre
                  : this.combos().find(c => c.id === r.combo_id)?.nombre;

        return `${r.cantidad} × ${nombre ?? 'Artículo no disponible'}`;
    }

    imagen(recompensa: RecompensaInput): string | null {
        if (recompensa.tipo === 'producto') {
            return this.productos().find(producto => producto.id === recompensa.producto_id)?.imagen ?? null;
        }

        if (recompensa.tipo === 'combo') {
            return this.combos().find(combo => combo.id === recompensa.combo_id)?.imagen ?? null;
        }

        return null;
    }

    etiquetaTipo(recompensa: RecompensaInput): string {
        if (recompensa.tipo === 'entrada') {
            return `🎟️ ENTRADAS ${recompensa.formato}`;
        }

        return recompensa.tipo === 'producto' ? '🍿 PRODUCTO CANDY' : '🍿 COMBO CANDY';
    }

    async guardar(): Promise<void> {
        if (this.guardando()) {
            return;
        }

        this.guardando.set(true);
        this.error.set('');

        try {
            await this.service.guardar(this.datos, this.id);
            await this.router.navigate(['/admin/puntos']);
        } catch (e) {
            this.error.set(e instanceof Error ? e.message : 'No se pudo guardar.');
        } finally {
            this.guardando.set(false);
        }
    }

    async confirmarEstado(): Promise<void> {
        const r = this.pendiente();

        if (!r || this.guardando()) {
            return;
        }

        this.guardando.set(true);
        this.error.set('');

        try {
            await this.service.cambiarEstado(r.id, !r.activa);
            this.recompensas.update(lista =>
                lista.map(item => (item.id === r.id ? { ...item, activa: !r.activa } : item))
            );
            this.pendiente.set(null);
        } catch (e) {
            this.error.set(e instanceof Error ? e.message : 'No se pudo cambiar el estado.');
        } finally {
            this.guardando.set(false);
        }
    }
}
