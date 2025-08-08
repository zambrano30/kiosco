// Sistema de autenticación mejorado para administradores
// Este archivo centraliza toda la lógica de autenticación

class AuthManager {
    constructor() {
        this.tokenKey = 'authToken';
        this.userKey = 'usuario_id';
        this.userInfoKey = 'userInfo';
    }

    // Obtener token del localStorage
    getToken() {
        return localStorage.getItem(this.tokenKey) || localStorage.getItem('token');
    }

    // Guardar token
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem('token', token); // Compatibilidad
    }

    // Limpiar sesión
    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('token');
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.userInfoKey);
    }

    // Verificar si el token existe y es válido
    isTokenValid() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            
            // Verificar expiración
            if (payload.exp && payload.exp < now) {
                console.log('🔓 Token expirado');
                this.clearSession();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error validando token:', error);
            this.clearSession();
            return false;
        }
    }

    // Verificar si el usuario es administrador
    isAdmin() {
        const token = this.getToken();
        if (!token || !this.isTokenValid()) {
            return false;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const esAdmin = payload.rol === 'administrador' || payload.role === 'admin' || payload.admin === true;
            console.log('👤 Verificando admin:', { rol: payload.rol, esAdmin });
            return esAdmin;
        } catch (error) {
            console.error('❌ Error verificando admin:', error);
            return false;
        }
    }

    // Obtener información del usuario
    getUserInfo() {
        const token = this.getToken();
        if (!token || !this.isTokenValid()) {
            return null;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.sub || payload.user_id || payload.id || payload.userId,
                nombre: payload.nombre || payload.name || payload.username,
                rol: payload.rol || payload.role || 'cliente',
                email: payload.email,
                exp: payload.exp
            };
        } catch (error) {
            console.error('❌ Error obteniendo info usuario:', error);
            return null;
        }
    }

    // Obtener headers para peticiones HTTP
    getAuthHeaders() {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token && this.isTokenValid()) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Verificar autenticación y redirigir si es necesario
    requireAuth(redirectTo = 'login.html') {
        if (!this.isTokenValid()) {
            // Guardar URL actual para regresar después del login
            localStorage.setItem('urlRegreso', window.location.href);
            
            console.log('🔒 Sesión no válida, redirigiendo a login');
            alert('Tu sesión ha expirado. Inicia sesión nuevamente.');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    // Verificar si es admin y redirigir si no lo es
    requireAdmin(redirectTo = 'index.html') {
        if (!this.requireAuth()) {
            return false;
        }

        if (!this.isAdmin()) {
            console.log('🚫 Acceso denegado: no es administrador');
            alert('No tienes permisos de administrador para acceder a esta sección.');
            window.location.href = redirectTo;
            return false;
        }

        return true;
    }

    // Mostrar/ocultar elementos según rol
    setupAdminUI() {
        const isAdmin = this.isAdmin();
        const adminElements = document.querySelectorAll('[data-admin-only]');
        const userElements = document.querySelectorAll('[data-user-only]');

        // Mostrar elementos solo para admin
        adminElements.forEach(element => {
            if (isAdmin) {
                element.style.display = '';
                element.classList.remove('hidden');
            } else {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        });

        // Mostrar elementos solo para usuarios no admin
        userElements.forEach(element => {
            if (!isAdmin) {
                element.style.display = '';
                element.classList.remove('hidden');
            } else {
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        });

        // Botón de administración
        const btnAdmin = document.getElementById('btn-admin');
        if (btnAdmin) {
            if (isAdmin) {
                btnAdmin.classList.remove('hidden');
                btnAdmin.style.display = '';
            } else {
                btnAdmin.classList.add('hidden');
                btnAdmin.style.display = 'none';
            }
        }

        console.log('🎨 UI de admin configurada:', { isAdmin, adminElements: adminElements.length });
    }

    // Inicializar autenticación en la página
    init() {
        // Configurar UI según rol
        this.setupAdminUI();

        // Configurar botón de logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.logout();
            });
        }

        // Mostrar información del usuario
        const userInfo = this.getUserInfo();
        if (userInfo) {
            console.log('👤 Usuario logueado:', userInfo);
        }
    }

    // Cerrar sesión
    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            this.clearSession();
            console.log('👋 Sesión cerrada');
            window.location.href = 'login.html';
        }
    }
}

// Crear instancia global
window.authManager = new AuthManager();

// Funciones de compatibilidad con el código existente
window.getAuthToken = () => window.authManager.getToken();
window.getAuthHeaders = () => window.authManager.getAuthHeaders();
window.verificarEsAdministrador = () => window.authManager.isAdmin();
window.verificarAutenticacion = () => window.authManager.requireAuth();

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authManager.init();
    });
} else {
    window.authManager.init();
}

console.log('🔐 Sistema de autenticación mejorado cargado');
