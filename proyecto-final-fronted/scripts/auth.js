import { ENDPOINTS, fetchAPI } from './config.js';

// Funciones de autenticación
async function loginUser(nombre_usuario, contraseña) {
    try {
        const response = await fetchAPI(ENDPOINTS.auth.login, {
            method: 'POST',
            body: JSON.stringify({ nombre_usuario, contraseña })
        });
        
        localStorage.setItem('token', response.access_token);
        return response;
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
}

async function registrarUsuario(userData) {
    try {
        const response = await fetchAPI(ENDPOINTS.auth.registro, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        return response;
    } catch (error) {
        console.error('Error en registro:', error);
        throw error;
    }
}

// Función para verificar autenticación
export function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    return Boolean(token);
}

// Función para verificar si es administrador
export function verificarEsAdministrador() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol === 'administrador';
    } catch (error) {
        console.error('Error al verificar rol:', error);
        return false;
    }
}

// Función para obtener información del usuario logueado
export function obtenerInfoUsuario() {
    const token = localStorage.getItem('token');
    if (!token) return null;
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
    return Boolean(token);
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
                
                // Debug: Mostrar estructura completa del JWT
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
                
                // Verificar si hay una URL de regreso guardada
                const urlRegreso = localStorage.getItem('urlRegreso');
                
                if (urlRegreso) {
                    // Limpiar la URL de regreso
                    localStorage.removeItem('urlRegreso');
                    window.location.href = urlRegreso;
                } else {
                    // Redirección normal basada en el rol
                    if (payload.rol === 'administrador') {
                        window.location.href = 'administracion.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }
            } catch (error) {
                alert(error.message || 'Error en el login');
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
                alert('Las contraseñas no coinciden');
                return;
            }

            try {
                await registrarUsuario(userData);
                alert('Usuario registrado exitosamente');
                formRegistro.reset();
                formRegistro.classList.add('hidden');
            } catch (error) {
                alert(error.message || 'Error en el registro');
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

    // Botón de cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }
});
