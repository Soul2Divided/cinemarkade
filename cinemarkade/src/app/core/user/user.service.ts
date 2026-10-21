import { Injectable, Inject } from '@angular/core';
import { UserRepository } from './user.repository';
import { ActualizarPerfilInput, User, CrearUserCommand, CrearUserData } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    constructor(@Inject(UserRepository) private userRepository: UserRepository) {}

    async registrarCliente(datos: CrearUserCommand): Promise<User> {
        this.validarDatosBasicos(datos);

        const usuario: CrearUserData = {
            ...datos,
            rol: 'cliente',
            puntos: 0,
        };

        return this.userRepository.createUser(usuario);
    }

    async crearEmpleado(datos: CrearUserCommand): Promise<User> {
        this.validarDatosBasicos(datos);

        const usuario: CrearUserData = {
            ...datos,
            rol: 'empleado',
            puntos: null,
        };

        return this.userRepository.createEmployee(usuario);
    }

    private validarDatosBasicos(datos: CrearUserCommand): void {
        if (!datos.mail || !datos.mail.includes('@')) {
            throw new Error('El mail no es válido');
        }
        if (!datos.password || datos.password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
    }

    async buscarPorEmail(mail: string): Promise<User | null> {
        return this.userRepository.findByEmail(mail);
    }

    async buscarPorId(id: string): Promise<User | null> {
        return this.userRepository.findById(id);
    }

    async actualizarPerfil(datos: ActualizarPerfilInput): Promise<User> {
        if (!datos.nombre?.trim() || !datos.apellido?.trim()) {
            throw new Error('El nombre y el apellido son obligatorios.');
        }

        const fecha = new Date(`${datos.fecha_nacimiento}T00:00:00Z`);
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_nacimiento) ||
            Number.isNaN(fecha.getTime()) ||
            fecha.toISOString().slice(0, 10) !== datos.fecha_nacimiento ||
            datos.fecha_nacimiento > hoy
        ) {
            throw new Error('Ingresá una fecha de nacimiento válida que no sea futura.');
        }

        if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(datos.tipo_sangre)) {
            throw new Error('Seleccioná un tipo de sangre válido.');
        }

        if (!['Azul/Celeste', 'Marrón', 'Verde'].includes(datos.color_ojos)) {
            throw new Error('Seleccioná un color de ojos válido.');
        }

        if (
            !Number.isSafeInteger(datos.cantidad_dias_vacaciones) ||
            datos.cantidad_dias_vacaciones < 0
        ) {
            throw new Error(
                'Los días de vacaciones deben ser un número entero igual o mayor que cero.',
            );
        }

        return this.userRepository.actualizarPerfil({
            nombre: datos.nombre.trim(),
            apellido: datos.apellido.trim(),
            fecha_nacimiento: datos.fecha_nacimiento,
            tipo_sangre: datos.tipo_sangre,
            color_ojos: datos.color_ojos,
            cantidad_dias_vacaciones: datos.cantidad_dias_vacaciones,
        });
    }

    async iniciarSesion(mail: string, password: string): Promise<User> {
        return this.userRepository.signIn(mail, password);
    }
}
