import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const marcador = 'cinemarkade-mock-reportes-v1';
const cantidadCuentas = 20;
const password = '123Test$';

const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const environmentPath = new URL('../../src/environments/environment.ts', import.meta.url);
const environmentSource = readFileSync(environmentPath, 'utf8');
const supabaseUrl = environmentSource.match(/SUPABASE_URL:\s*['"]([^'"]+)['"]/)?.[1];

if (!supabaseUrl || !secretKey) {
    throw new Error(
        'No se encontró SUPABASE_URL en src/environments/environment.ts o falta SUPABASE_SECRET_KEY.',
    );
}

const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

function emailMock(indice) {
    return `cliente.mock${String(indice + 1).padStart(2, '0')}@cinemarkade.example`;
}

function verificar(error, mensaje) {
    if (error) {
        throw new Error(`${mensaje}: ${error.message}`);
    }
}

async function listarUsuariosAuth() {
    const usuarios = [];

    for (let pagina = 1; ; pagina++) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page: pagina,
            perPage: 1000,
        });
        verificar(error, 'No se pudieron revisar las cuentas existentes');
        usuarios.push(...data.users);

        if (data.users.length < 1000) {
            return usuarios;
        }
    }
}

async function crearCuentas() {
    const existentes = await listarUsuariosAuth();
    const cuentasMock = [];

    for (let indice = 0; indice < cantidadCuentas; indice++) {
        const email = emailMock(indice);
        const existente = existentes.find(usuario => usuario.email?.toLowerCase() === email);

        if (existente && existente.user_metadata?.cinemarkade_mock !== marcador) {
            throw new Error(
                `La cuenta ${email} ya existe y no está marcada como cuenta de este mock. No se modificó.`,
            );
        }

        cuentasMock.push({ email, existente });
    }

    let creadas = 0;
    let actualizadas = 0;

    for (const cuenta of cuentasMock) {
        if (cuenta.existente) {
            const { error } = await supabase.auth.admin.updateUserById(cuenta.existente.id, {
                password,
                email_confirm: true,
                user_metadata: {
                    ...cuenta.existente.user_metadata,
                    cinemarkade_mock: marcador,
                },
            });
            verificar(error, `No se pudo actualizar la contraseña de ${cuenta.email}`);
            actualizadas++;
            continue;
        }

        const { error } = await supabase.auth.admin.createUser({
            email: cuenta.email,
            password,
            email_confirm: true,
            user_metadata: { cinemarkade_mock: marcador },
        });
        verificar(error, `No se pudo crear ${cuenta.email}`);
        creadas++;
    }

    console.log(`Cuentas creadas: ${creadas}. Cuentas mock existentes actualizadas: ${actualizadas}.`);
    console.log('No se crearon perfiles públicos ni se agregaron cuentas al selector de pruebas.');
    console.log('Ahora ejecutá mock-report-data.sql en el SQL Editor de Supabase.');
}

await crearCuentas();
