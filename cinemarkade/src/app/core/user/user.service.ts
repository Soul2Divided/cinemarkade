import { Injectable, Inject } from '@angular/core';
import { UserRepository } from './user.repository';
import { User, CrearUserCommand, CrearUserData } from './user.model'

@Injectable({ providedIn: 'root' })
export class UserService {

    constructor(
        @Inject(UserRepository) private userRepository: UserRepository
    ) { }

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

        return this.userRepository.createUser(usuario);
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

    async iniciarSesion(mail: string, password: string): Promise<User> {
        const usuario = await this.buscarPorEmail(mail);

        if (!usuario) {
            throw new Error('No existe un usuario registrado con ese email');
        }

        return this.userRepository.signIn(mail, password);
    }

    async mailDisponible(mail: string): Promise<boolean> {
        const usuario = await this.userRepository.findByEmail(mail);
        return usuario === null;
    }
}