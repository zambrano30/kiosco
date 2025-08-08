import { ENDPOINTS, fetchAPI } from './config.js';

// Funciones de autenticación
async function loginUser(nombre_usuario, contraseña) {
    try {
        console.log('🔐 Intentando login con usuario:', nombre_usuario);
        console.log('🔐 Password length:', contraseña?.length || 0);
        
        const loginData = { nombre_usuario, contraseña };
        console.log('📤 Datos de login a enviar:', { nombre_usuario, contraseña: '***' });
        
        const response = await fetchAPI(ENDPOINTS.auth.login, {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        
        console.log('✅ Login exitoso, respuesta:', response);
        
        // Usar el nuevo sistema de autenticación
        if (window.authManager) {
            window.authManager.setToken(response.access_token);
        } else {
            // Fallback para compatibilidad
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('authToken', response.access_token);
        }
        
        if (response.usuario && (response.usuario.id_usuario || response.usuario.userId || response.usuario.id)) {
            localStorage.setItem('usuario_id', response.usuario.id_usuario || response.usuario.userId || response.usuario.id);
        } else {
            // Extraer id del token si no viene en la respuesta
            try {
                const payload = JSON.parse(atob(response.access_token.split('.')[1]));
                const id = payload.sub || payload.user_id || payload.id || payload.userId;
                if (id) localStorage.setItem('usuario_id', id);
            } catch (e) {
                console.warn('No se pudo extraer el id del usuario del token');
            }
        }
        
        // Mostrar notificación si la función está disponible
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Inicio de sesión exitoso', 'success');
        }
        
        // Verificar si hay una URL de regreso guardada
        const urlRegreso = localStorage.getItem('urlRegreso');
        if (urlRegreso) {
            localStorage.removeItem('urlRegreso');
            window.location.href = urlRegreso;
        } else {
            window.location.href = 'index.html';
        }
        
        return response;
    } catch (error) {
        console.error('Error en login:', error);
        
        let mensajeError = 'Error al iniciar sesión';
        
        // Manejar diferentes tipos de error
        if (error.message.includes('Credenciales incorrectas')) {
            mensajeError = 'Usuario o contraseña incorrectos. Por favor verifica tus datos.';
        } else if (error.message.includes('Sesión expirada') && !error.message.includes('Credenciales')) {
            mensajeError = 'Hay un problema con una sesión anterior. Por favor, limpia la sesión e intenta de nuevo.';
        } else if (error.message.includes('403')) {
            mensajeError = 'Acceso denegado. Tu cuenta puede estar desactivada.';
        } else if (error.message.includes('404')) {
            mensajeError = 'Servicio de autenticación no disponible. Intenta más tarde.';
        } else if (error.message.includes('500')) {
            mensajeError = 'Error del servidor. Intenta más tarde.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            mensajeError = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(mensajeError, 'error');
        } else {
            console.error('❌ Error de validación:', mensajeError);
        }
        
        throw error;
    }
}

async function registrarUsuario(userData) {
    try {
        // Validación previa de campos
        if (!userData.nombre_usuario || !userData.contrasena || !userData.correo) {
            mostrarNotificacion('Todos los campos son obligatorios', 'error');
            throw new Error('Campos obligatorios faltantes');
        }
        const response = await fetchAPI(ENDPOINTS.auth.registro, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        mostrarNotificacion('Registro exitoso', 'success');
        return response;
    } catch (error) {
        mostrarNotificacion('Error en registro: ' + (error.message || 'Datos inválidos'), 'error');
        console.error('Error en registro:', error);
        throw error;
    }
}

// Función para verificar autenticación
export function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    if (!token || !esTokenValido(token)) {
        limpiarSesionInvalida();
        return false;
    }
    return true;
}

// Función para verificar si es administrador
export function verificarEsAdministrador() {
    const token = localStorage.getItem('token');
    if (!token || !esTokenValido(token)) {
        limpiarSesionInvalida();
        return false;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol === 'administrador';
    } catch (error) {
        console.error('Error al verificar rol:', error);
        limpiarSesionInvalida();
        return false;
    }
}

// Función para obtener información del usuario logueado
export function obtenerInfoUsuario() {
    const token = localStorage.getItem('token');
    if (!token || !esTokenValido(token)) {
        limpiarSesionInvalida();
        return null;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔑 Payload del token:', payload);
        
        // Intentar extraer el nombre de diferentes campos posibles
        const nombre = payload.nombre_usuario || 
                      payload.username || 
                      payload.nombre || 
                      payload.name || 
                      payload.user_name || 
                      payload.nombre_completo ||
                      payload.full_name ||
                      payload.displayName || 
                      payload.firstName || 
                      payload.first_name ||
                      'Usuario';
        
        console.log('👤 Nombre extraído:', nombre);
        
        return {
            id: payload.sub || payload.user_id || payload.id || payload.userId,
            nombre: nombre,
            email: payload.email || payload.mail || '',
            rol: payload.rol || payload.role || 'cliente'
        };
    } catch (error) {
        console.error('Error al obtener info del usuario:', error);
        return null;
    }
}

// Función para verificar si el usuario está logueado (sin redireccionar)
export function estaLogueado() {
    const token = localStorage.getItem('token');
    return Boolean(token) && esTokenValido(token);
}

// Función para verificar si el token es válido (no expirado y bien formado)
export function esTokenValido(token = null) {
    if (!token) {
        token = localStorage.getItem('token');
    }
    
    if (!token) return false;
    
    try {
        // Verificar formato del JWT
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.log('🚨 Token inválido: formato incorrecto');
            return false;
        }
        
        // Decodificar payload
        const payload = JSON.parse(atob(parts[1]));
        
        // Verificar expiración
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.log('🚨 Token expirado:', new Date(payload.exp * 1000));
                return false;
            }
        }
        
        // Verificar campos esenciales
        if (!payload.sub && !payload.user_id && !payload.id && !payload.userId) {
            console.log('🚨 Token inválido: sin identificador de usuario');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('🚨 Error al validar token:', error);
        return false;
    }
}

// Función para limpiar sesión inválida
export function limpiarSesionInvalida() {
    console.log('🧹 Limpiando sesión inválida...');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('Tu sesión ha expirado o es inválida. Por favor, inicia sesión nuevamente.', 'error');
    }
    
    // Solo redirigir si no estamos ya en login
    if (!window.location.pathname.includes('login.html')) {
        // Guardar la página actual para regresar después del login
        localStorage.setItem('urlRegreso', window.location.href);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}

// Función para limpiar completamente todos los datos de autenticación
export function limpiarTodosLosDatos() {
    console.log('🧹 Limpiando todos los datos de autenticación y sesión...');
    
    // Limpiar todos los datos relacionados con autenticación
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('urlRegreso');
    localStorage.removeItem('carrito');
    
    // También limpiar cualquier cache del navegador relacionado
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }
    
    console.log('✅ Todos los datos limpiados');
    
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('Todos los datos de sesión han sido limpiados correctamente.', 'success');
    }
    
    return true;
}

// Función para cerrar sesión
export function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Event Listeners cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Manejo del formulario de login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre_usuario = document.getElementById('usuario').value;
            const contraseña = document.getElementById('contrasena').value;

            try {
                const response = await loginUser(nombre_usuario, contraseña);
                const payload = JSON.parse(atob(response.access_token.split('.')[1]));
                
                // Mostrar estructura completa del JWT
                console.log('🎯 ESTRUCTURA COMPLETA DEL JWT AL LOGIN:');
                console.log('📋 Payload completo:', payload);
                console.log('🏷️ Campos disponibles:', Object.keys(payload));
                console.log('👤 Campo rol:', payload.rol);
                console.log('🔍 Todos los campos que podrían ser nombres:');
                console.log('  - nombre_usuario:', payload.nombre_usuario);
                console.log('  - username:', payload.username);
                console.log('  - nombre:', payload.nombre);
                console.log('  - name:', payload.name);
                console.log('  - user_name:', payload.user_name);
                console.log('  - nombre_completo:', payload.nombre_completo);
                console.log('  - full_name:', payload.full_name);
                console.log('  - displayName:', payload.displayName);
                console.log('  - firstName:', payload.firstName);
                console.log('  - first_name:', payload.first_name);
                
                // La redirección se maneja automáticamente en la función loginUser
            } catch (error) {
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion(error.message || 'Error en el login', 'error');
                } else {
                    console.error('❌ Error de login:', error.message || 'Error en el login');
                }
            }
        });
    }

    // Manejo del formulario de registro
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                nombre_usuario: document.getElementById('registro_usuario').value,
                nombre_completo: document.getElementById('registro_nombre').value,
                email: document.getElementById('registro_correo').value,
                telefono: document.getElementById('telefono').value,
                password: document.getElementById('registro_contrasena').value
            };

            const password2 = document.getElementById('registro_contrasena2').value;
            if (userData.password !== password2) {
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion('Las contraseñas no coinciden', 'error');
                } else {
                    console.error('❌ Las contraseñas no coinciden');
                }
                return;
            }

            try {
                await registrarUsuario(userData);
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion('Usuario registrado exitosamente', 'success');
                } else {
                    console.log('✅ Usuario registrado exitosamente');
                }
                formRegistro.reset();
                formRegistro.classList.add('hidden');
            } catch (error) {
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion(error.message || 'Error en el registro', 'error');
                } else {
                    console.error('❌ Error en el registro:', error.message);
                }
            }
        });
    }

    // Mostrar formulario de registro
    const btnRegistro = document.querySelector('.registrarse');
    if (btnRegistro) {
        btnRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('form-registro').classList.remove('hidden');
        });
    }

    // Botón de cerrar sesión - Manejado por main.js
    // const btnLogout = document.getElementById('btn-logout');
    // if (btnLogout) {
    //     btnLogout.addEventListener('click', cerrarSesion);
    // }
});
