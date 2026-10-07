import { Inject, Injectable } from '@angular/core';
import { DetalleCompraRepository } from './detalle-compra.repository';
import { DetalleCompra, DetalleCompraInput } from './detalle-compra.model';

@Injectable({ providedIn: 'root' })
export class DetalleCompraService {
    constructor(
        @Inject(DetalleCompraRepository)
        private readonly detalleCompraRepository: DetalleCompraRepository
    ) {}

    async listarPorCompra(compraId: string): Promise<DetalleCompra[]> {
        this.validarUuid(compraId);
        return this.detalleCompraRepository.listarPorCompra(compraId);
    }

    async crearVarios(detalles: DetalleCompraInput[]): Promise<DetalleCompra[]> {
        if (detalles.length === 0) {
            return [];
        }

        const compraId = detalles[0].compra_id;

        if (!compraId) {
            throw new Error('Cada detalle debe estar asociado a una compra.');
        }

        this.validarUuid(compraId);

        for (const detalle of detalles) {
            this.validarDetalle(detalle, compraId);
        }

        return this.detalleCompraRepository.crearVarios(detalles);
    }

    private validarDetalle(detalle: DetalleCompraInput, compraId: string): void {
        if (detalle.compra_id !== compraId) {
            throw new Error('Todos los detalles deben pertenecer a la misma compra.');
        }

        const tieneProducto = detalle.producto_id !== null;
        const tieneCombo = detalle.combo_id !== null;

        if (tieneProducto === tieneCombo) {
            throw new Error('Cada detalle debe corresponder a un producto o a un combo.');
        }

        if (detalle.tipo_item === 'producto' && !tieneProducto) {
            throw new Error('El tipo de artículo no coincide con el producto indicado.');
        }

        if (detalle.tipo_item === 'combo' && !tieneCombo) {
            throw new Error('El tipo de artículo no coincide con el combo indicado.');
        }

        if (!detalle.tipo_item) {
            throw new Error('El tipo de artículo es obligatorio.');
        }

        if (!detalle.nombre_item?.trim()) {
            throw new Error('El nombre del artículo es obligatorio.');
        }

        if (!Number.isInteger(detalle.cantidad) || detalle.cantidad! < 1) {
            throw new Error('La cantidad debe ser un entero mayor que cero.');
        }

        if (detalle.precio_unitario === null ||
            !Number.isFinite(detalle.precio_unitario) ||
            detalle.precio_unitario < 0) {
            throw new Error('El precio unitario debe ser un importe válido.');
        }

        if (detalle.medio_pago !== 'dinero' && detalle.medio_pago !== 'puntos') {
            throw new Error('El medio de pago debe ser dinero o puntos.');
        }

        if (!Number.isInteger(detalle.puntos_usados) || detalle.puntos_usados! < 0) {
            throw new Error('Los puntos usados deben ser un entero igual o mayor que cero.');
        }

        if (!Number.isInteger(detalle.puntos_generados) || detalle.puntos_generados! < 0) {
            throw new Error('Los puntos generados deben ser un entero igual o mayor que cero.');
        }

        if (detalle.medio_pago === 'dinero' && detalle.puntos_usados !== 0) {
            throw new Error('Un artículo pagado con dinero no puede registrar puntos usados.');
        }

        if (detalle.medio_pago === 'puntos' &&
            (detalle.puntos_usados === 0 || detalle.puntos_generados !== 0)) {
            throw new Error('Un artículo canjeado con puntos debe registrar puntos usados y no generar puntos.');
        }
    }

    private validarUuid(valor: string): void {
        const uuidValido =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);

        if (!uuidValido) {
            throw new Error('El identificador de compra no es válido.');
        }
    }
}