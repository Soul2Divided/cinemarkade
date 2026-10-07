import { Injectable } from '@angular/core';
import { ButacaProyeccionVista } from './butaca-proyeccion.model';

@Injectable()
export abstract class ButacaProyeccionRepository {
    abstract listarPorProyeccion(proyeccionId: number): Promise<ButacaProyeccionVista[]>;
}
