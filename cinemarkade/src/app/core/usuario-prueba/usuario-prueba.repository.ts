import { Injectable } from '@angular/core';
import { UsuarioPrueba } from './usuario-prueba.model';

@Injectable()
export abstract class UsuarioPruebaRepository {
    abstract listar(): Promise<UsuarioPrueba[]>;
}
