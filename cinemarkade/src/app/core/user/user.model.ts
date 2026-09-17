export interface User {
    id: string;
    nombre: string;
    apellido: string;
    mail: string;
    fecha_nacimiento: string;
    tipo_sangre: string;
    color_ojos: string;
    cantidad_dias_vacaciones: number;
    puntos: number | null;
    rol: 'cliente' | 'empleado' | 'admin';
}

export interface CrearUserCommand {
    nombre: string,
    apellido: string,
    password: string;
    mail: string,
    fecha_nacimiento: string,
    tipo_sangre: string,
    color_ojos: string,
    cantidad_dias_vacaciones: number,
}

export interface CrearUserData extends CrearUserCommand {
    rol: 'cliente' | 'empleado' | 'admin';
    puntos: number | null;
}