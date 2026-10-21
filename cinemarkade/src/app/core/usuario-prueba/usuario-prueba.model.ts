export type TipoUsuarioPrueba = 'empleado' | 'cliente' | 'cliente_menor';

export interface UsuarioPrueba {
    id: number;
    etiqueta: string;
    mail: string;
    tipo: TipoUsuarioPrueba;
    orden: number;
}

export interface CredencialesPrueba {
    email: string;
    password: string;
}
