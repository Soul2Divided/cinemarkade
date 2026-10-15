import { Injectable, inject } from '@angular/core';
import { FORMATOS_SALA } from '../sala/sala.model';
import { CanjeRecompensa, Recompensa, RecompensaInput } from './recompensa.model';
import { RecompensaRepository } from './recompensa.repository';

@Injectable({ providedIn: 'root' })
export class RecompensaService {
    private readonly repository = inject(RecompensaRepository);

    listar(): Promise<Recompensa[]> {
        return this.repository.listar();
    }

    historial(): Promise<CanjeRecompensa[]> {
        return this.repository.historial();
    }

    cambiarEstado(id: number, activa: boolean): Promise<void> {
        return this.repository.cambiarEstado(id, activa);
    }

    guardar(datos: RecompensaInput, id?: number): Promise<void> {
        if (!datos.nombre.trim() || datos.nombre.trim().length > 100) {
            throw new Error('Ingresá un nombre de hasta 100 caracteres.');
        }

        if (
            !Number.isSafeInteger(datos.cantidad) ||
            datos.cantidad < 1 ||
            datos.cantidad > (datos.tipo === 'entrada' ? 8 : 10)
        ) {
            throw new Error('La cantidad debe ser entera: de 1 a 8 entradas o de 1 a 10 productos/combos.');
        }

        if (!Number.isSafeInteger(datos.costo_puntos) || datos.costo_puntos < 1) {
            throw new Error('El costo en puntos debe ser un entero positivo.');
        }

        if (!['entrada', 'producto', 'combo'].includes(datos.tipo)) {
            throw new Error('Seleccioná un tipo de recompensa válido.');
        }

        if (datos.tipo === 'entrada' && !FORMATOS_SALA.includes(datos.formato!)) {
            throw new Error('Seleccioná el formato de las entradas.');
        }

        const referencia = datos.tipo === 'producto' ? datos.producto_id : datos.combo_id;

        if (datos.tipo !== 'entrada' && (!Number.isSafeInteger(referencia) || referencia! <= 0)) {
            throw new Error('Seleccioná el producto o combo de la recompensa.');
        }

        return this.repository.guardar(
            {
                ...datos,
                nombre: datos.nombre.trim(),
                formato: datos.tipo === 'entrada' ? datos.formato : null,
                producto_id: datos.tipo === 'producto' ? datos.producto_id : null,
                combo_id: datos.tipo === 'combo' ? datos.combo_id : null
            },
            id
        );
    }
}
