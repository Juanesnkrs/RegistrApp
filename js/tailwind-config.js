/* ==========================================================
   RegistrApp - Configuración de Tailwind (CDN)
   Debe cargarse DESPUÉS del script de cdn.tailwindcss.com

   Paleta:
   - primary   (Indigo)       → acciones principales
   - secondary (Gris pizarra) → contrastes, menú lateral y textos
   - accent    (Coral)        → alertas y acciones destructivas
   ========================================================== */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4f46e5', // Primary Indigo
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                },
                secondary: {
                    DEFAULT: '#1e293b', // Slate 800
                },
                accent: {
                    500: '#ef4444',
                    600: '#dc2626',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
};
