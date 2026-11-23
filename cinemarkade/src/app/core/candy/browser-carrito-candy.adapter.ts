import { Injectable } from '@angular/core';
import { SeleccionCandy } from './carrito-candy.model';
import { CarritoCandyRepository } from './carrito-candy.repository';

@Injectable({ providedIn: 'root' })
export class BrowserCarritoCandyAdapter implements CarritoCandyRepository {
    restaurar(clave: string): SeleccionCandy[] {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) ?? 'null');

            if (datos?.version !== 1 || !Array.isArray(datos.items)) {
                return [];
            }

            const items = new Map<string, SeleccionCandy>();

            for (const item of datos.items) {
                if (
                    ['producto', 'combo', 'recompensa'].includes(item?.tipo) &&
                    Number.isSafeInteger(item.id) && item.id > 0 &&
                    Number.isSafeInteger(item.cantidad) && item.cantidad >= 1 && item.cantidad <= 99
                ) {
                    items.set(`${item.tipo}:${item.id}`, {
                        tipo: item.tipo,
                        id: item.id,
                        cantidad: item.cantidad,
                    });
                }
            }

            return [...items.values()];
        } catch {
            return [];
        }
    }

    guardar(clave: string, items: SeleccionCandy[]): void {
        localStorage.setItem(clave, JSON.stringify({ version: 1, items }));
    }
}
