import { Injectable } from '@angular/core';
import { UserRepository } from './user.repository';
import { CrearUserData, User } from './user.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseUserAdapter implements UserRepository {
    constructor(private supabaseService: SupabaseService) { }

    async createEmployee(user: CrearUserData): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`No se pudo recuperar la sesión del administrador: ${sessionError.message}`);
        const sesionAdmin = sessionData.session;
        let sesionRestaurada = false;

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: user.mail,
                password: user.password,
            });
            if (authError) throw new Error(`Error al crear usuario en auth: ${authError.message}`);
            if (!authData.user) throw new Error('No se pudo crear el usuario');

            if (sesionAdmin) {
                const { error } = await supabase.auth.setSession({
                    access_token: sesionAdmin.access_token,
                    refresh_token: sesionAdmin.refresh_token,
                });
                if (error) throw new Error(`No se pudo restaurar la sesión del administrador: ${error.message}`);
                sesionRestaurada = true;
            }

            return await this.insertarPerfil(authData.user.id, user);
        } finally {
            if (sesionAdmin && !sesionRestaurada) {
                const { error } = await supabase.auth.setSession({
                    access_token: sesionAdmin.access_token,
                    refresh_token: sesionAdmin.refresh_token,
                });
                if (error) console.error('No se pudo restaurar la sesión del administrador:', error);
            }
        }
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
