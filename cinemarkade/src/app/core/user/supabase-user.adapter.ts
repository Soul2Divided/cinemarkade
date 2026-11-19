import { Injectable } from '@angular/core';
import { UserRepository } from './user.repository';
import { ActualizarPerfilInput, CrearUserData, User } from './user.model';
import { SupabaseService } from '../services/supabase.service';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseUserAdapter implements UserRepository {
    constructor(private supabaseService: SupabaseService) {}

    async actualizarPerfil(datos: ActualizarPerfilInput): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;
        const { data: autenticacion, error: errorSesion } = await supabase.auth.getUser();

        if (errorSesion || !autenticacion.user) {
            throw new Error('Iniciá sesión para editar tu perfil.');
        }

        const { data, error } = await supabase
            .from('usuario')
            .update({
                nombre: datos.nombre,
                apellido: datos.apellido,
                fecha_nacimiento: datos.fecha_nacimiento,
                tipo_sangre: datos.tipo_sangre,
                color_ojos: datos.color_ojos,
                cantidad_dias_vacaciones: datos.cantidad_dias_vacaciones,
            })
            .eq('id', autenticacion.user.id)
            .select('*')
            .single();

        if (error) {
            throw new Error(`No se pudo guardar el perfil: ${error.message}`);
        }

        return this.mapToModel(data);
    }

    async createEmployee(user: CrearUserData): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;
        const { data: autenticacion, error: errorSesion } = await supabase.auth.getUser();

        if (errorSesion || !autenticacion.user) {
            throw new Error('Iniciá sesión como administrador para crear empleados.');
        }

        // El cliente de alta no reemplaza la sesión del administrador.
        const clienteAlta = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'cinemarkade-alta-empleado'
            }
        });
        const { data, error } = await clienteAlta.auth.signUp({ email: user.mail, password: user.password });

        if (error || !data.user || data.user.identities?.length === 0) {
            throw new Error(error?.message ?? 'El correo ya está registrado o no pudo crearse la cuenta.');
        }

        const { data: perfil, error: errorPerfil } = await supabase.rpc('crear_perfil_empleado', {
            p_usuario_id: data.user.id,
            p_datos: {
                nombre: user.nombre,
                apellido: user.apellido,
                mail: user.mail,
                fecha_nacimiento: user.fecha_nacimiento,
                tipo_sangre: user.tipo_sangre,
                color_ojos: user.color_ojos,
                cantidad_dias_vacaciones: user.cantidad_dias_vacaciones,
                permisos_admin: user.permisos_admin ?? []
            }
        });

        if (errorPerfil || !perfil) {
            throw new Error('Se creó la cuenta de acceso, pero no se pudo completar el perfil del empleado: ' +
                (errorPerfil?.message ?? 'No se recibió el perfil.'));
        }

        return this.mapToModel(perfil as User);
    }

    async createUser(user: CrearUserData): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.mail,
            password: user.password,
        });

        if (authError) {
            throw new Error(`Error al crear usuario en auth: ${authError.message}`);
        }
        if (!authData.user) {
            throw new Error('No se pudo crear el usuario');
        }

        return this.insertarPerfil(authData.user.id, user);
    }

    private async insertarPerfil(id: string, user: CrearUserData): Promise<User> {
        const { data: perfil, error: perfilError } = await this.supabaseService.supabaseClient
            .from('usuario')
            .insert({
                id,
                nombre: user.nombre,
                apellido: user.apellido,
                mail: user.mail,
                fecha_nacimiento: user.fecha_nacimiento,
                tipo_sangre: user.tipo_sangre,
                color_ojos: user.color_ojos,
                cantidad_dias_vacaciones: user.cantidad_dias_vacaciones,
                puntos: user.puntos,
                rol: user.rol,
            })
            .select()
            .single();

        if (perfilError) {
            throw new Error(`Error al crear perfil: ${perfilError.message}`);
        }

        return this.mapToModel(perfil);
    }

    private mapToModel(row: User): User {
        return {
            id: row.id,
            nombre: row.nombre,
            apellido: row.apellido,
            mail: row.mail,
            fecha_nacimiento: row.fecha_nacimiento,
            tipo_sangre: row.tipo_sangre,
            color_ojos: row.color_ojos,
            cantidad_dias_vacaciones: row.cantidad_dias_vacaciones,
            puntos: row.puntos,
            rol: row.rol,
            permisos_admin: row.permisos_admin ?? [],
        };
    }

    async findByEmail(mail: string): Promise<User | null> {
        const supabase = this.supabaseService.supabaseClient;
        const { data, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('mail', mail)
            .maybeSingle();

        if (error) {
            throw new Error(`Error al buscar usuario: ${error.message}`);
        }

        return data as User | null;
    }

    async findById(id: string): Promise<User | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('usuario')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw new Error(`Error al buscar el perfil del usuario: ${error.message}`);
        }

        return data ? this.mapToModel(data as User) : null;
    }

    async signIn(mail: string, password: string): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: mail,
            password,
        });

        if (authError || !authData.user) {
            throw new Error('El email o la contraseña son incorrectos');
        }

        const { data: perfil, error: perfilError } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (perfilError) {
            throw new Error(`Error al obtener el perfil: ${perfilError.message}`);
        }

        return this.mapToModel(perfil);
    }
}
