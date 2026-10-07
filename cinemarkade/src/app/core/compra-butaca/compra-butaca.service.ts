import { Inject, Injectable } from '@angular/core';
import { CompraButaca, CompraButacaInput } from './compra-butaca.model';
import { CompraButacaRepository } from './compra-butaca.repository';

@Injectable({ providedIn: 'root' })
export class CompraButacaService {
    constructor(
        @Inject(CompraButacaRepository)
        private readonly compraButacaRepository: CompraButacaRepository
    ) { }

    async listarPorCompra(compraId: string): Promise<CompraButaca[]> {
        this.validarUuid(compraId);
        return this.compraButacaRepository.listarPorCompra(compraId);
    }

    async crearVarios(butacas: CompraButacaInput[]): Promise<CompraButaca[]> {
        if (butacas.length === 0) {
            return [];
        }

        const compraId = butacas[0].compra_id;

        if (!compraId) {
            throw new Error('Cada butaca debe estar asociada a una compra.');
        }

        this.validarUuid(compraId);

        for (const butaca of butacas) {
            this.validarButaca(butaca, compraId);
        }

        return this.compraButacaRepository.crearVarios(butacas);
    }

    private validarButaca(butaca: CompraButacaInput, compraId: string): void {
        if (butaca.compra_id !== compraId) {
            throw new Error('Todas las butacas deben pertenecer a la misma compra.');
        }

        if (!Number.isInteger(butaca.butaca_proyeccion_id) || butaca.butaca_proyeccion_id! <= 0) {
            throw new Error('La butaca de la proyección indicada no es válida.');
        }

        if (butaca.medio_pago !== 'dinero' && butaca.medio_pago !== 'puntos') {
            throw new Error('El medio de pago debe ser dinero o puntos.');
        }

        if (butaca.precio_unitario === null ||
            !Number.isFinite(butaca.precio_unitario) ||
            butaca.precio_unitario < 0) {
            throw new Error('El precio de la entrada debe ser un importe válido.');
        }

        if (butaca.puntos_usados === null ||
            !Number.isInteger(butaca.puntos_usados) ||
            butaca.puntos_usados < 0) {
            throw new Error('Los puntos usados deben ser un entero igual o mayor que cero.');
        }

        if (butaca.medio_pago === 'dinero' && butaca.puntos_usados !== 0) {
            throw new Error('Una entrada pagada con dinero no puede registrar puntos usados.');
        }

        if (butaca.medio_pago === 'puntos' && butaca.puntos_usados === 0) {
            throw new Error('Una entrada canjeada debe registrar los puntos utilizados.');
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