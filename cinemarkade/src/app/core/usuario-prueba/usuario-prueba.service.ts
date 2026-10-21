import { Inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CredencialesPrueba, UsuarioPrueba } from './usuario-prueba.model';
import { UsuarioPruebaRepository } from './usuario-prueba.repository';

@Injectable({ providedIn: 'root' })
export class UsuarioPruebaService {
    readonly habilitado = environment.USUARIOS_PRUEBA_HABILITADOS;
    private credencialesPendientes: CredencialesPrueba | null = null;
    private perfiles: UsuarioPrueba[] = [];

    constructor(
        @Inject(UsuarioPruebaRepository) private readonly repository: UsuarioPruebaRepository,
    ) {}

    async listar(): Promise<UsuarioPrueba[]> {
        if (!this.habilitado) {
            return [];
        }

        this.perfiles = await this.repository.listar();

        return this.perfiles;
    }

    prepararAutocompletado(id: number): void {
        const perfil = this.perfiles.find((usuario) => usuario.id === id);

        if (!this.habilitado || !perfil || !environment.USUARIOS_PRUEBA_PASSWORD) {
            throw new Error('El perfil de prueba no está disponible.');
        }

        this.credencialesPendientes = {
            email: perfil.mail,
            password: environment.USUARIOS_PRUEBA_PASSWORD,
        };
    }

    consumirAutocompletado(): CredencialesPrueba | null {
        const credenciales = this.habilitado ? this.credencialesPendientes : null;
        this.credencialesPendientes = null;

        return credenciales;
    }
}
