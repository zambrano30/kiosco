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
                
                if (payload.rol === 'administrador') {
                    window.location.href = 'administracion.html';
                } else {
                    window.location.href = 'index.html';
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
