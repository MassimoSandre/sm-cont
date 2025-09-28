interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_KEY: string;
    readonly VITE_SUPABASE_EMAIL: string;
    readonly VITE_SUPABASE_PASSWORD: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
