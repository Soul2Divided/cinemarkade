import { Injectable } from '@angular/core';
import { CompraButaca, CompraButacaInput } from './compra-butaca.model';

@Injectable()
export abstract class CompraButacaRepository {
    abstract listarPorCompra(compraId: string): Promise<CompraButaca[]>;
    abstract crearVarios(butacas: CompraButacaInput[]): Promise<CompraButaca[]>;
}