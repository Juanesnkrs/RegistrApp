/* ==========================================================
   RegistrApp - Configuración de Tailwind (CDN)
   Debe cargarse DESPUÉS del script de cdn.tailwindcss.com
   ========================================================== */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    500: '#6366f1',
                    600: '#4f46e5', // Primary Indigo
                    700: '#4338ca',
                },
                accent: {
                    500: '#ef4444', // Coral Accent
                    600: '#dc2626',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
};
