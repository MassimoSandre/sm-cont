import {createClient} from '@supabase/supabase-js';

// Prendo le variabili dal file .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;
const EMAIL = import.meta.env.VITE_SUPABASE_EMAIL as string;
const PASSWORD = import.meta.env.VITE_SUPABASE_PASSWORD as string;

// Creo il client una sola volta
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Variabile per tracciare la sessione in memoria
let session: any = null;

/**
 * Login lazy:
 * se già loggato → restituisce la sessione
 * se non loggato → fa login e salva la sessione
 */
export async function getSession() {
    if (session) return session;

    const {data, error} = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD,
    });

    if (error) throw error;

    session = data.session;
    return session;
}
