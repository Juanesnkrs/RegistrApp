/**
 * @fileoverview Configuración personalizada de Tailwind CSS (CDN) para RegistrApp.
 * Debe cargarse inmediatamente después del script de cdn.tailwindcss.com.
 *
 * Paleta cromática corporativa:
 * - primary   (Indigo #4f46e5)  -> Acciones principales y estados activos.
 * - secondary (Slate #1e293b)   -> Menú lateral, contrastes y tipografía base.
 * - accent    (Coral #ef4444)   -> Alertas de stock bajo y acciones de eliminación.
 */

tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#4f46e5',
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca'
                },
                secondary: {
                    DEFAULT: '#1e293b'
                },
                accent: {
                    500: '#ef4444',
                    600: '#dc2626'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif']
            }
        }
    }
};