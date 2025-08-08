export const API_BASE_URL = 'https://funval-backend.onrender.com';

export const ENDPOINTS = {
    productos: {
        listar: `${API_BASE_URL}/productos`,
        crear: `${API_BASE_URL}/productos`,
        obtener: (id) => `${API_BASE_URL}/productos/${id}`,
        actualizar: (id) => `${API_BASE_URL}/productos/${id}`,
        eliminar: (id) => `${API_BASE_URL}/productos/${id}`,
        categorias: `${API_BASE_URL}/productos/categorias`,
        porCategoria: (categoria) => `${API_BASE_URL}/productos?categoria=${encodeURIComponent(categoria)}`,
    },
    auth: {
        login: `${API_BASE_URL}/login`,
        registro: `${API_BASE_URL}/registro-comprador`,
    },
    usuarios: {
        listar: `${API_BASE_URL}/usuarios`,
        obtener: (id) => `${API_BASE_URL}/usuarios/${id}`,
    },
    ventas: {
        listar: `${API_BASE_URL}/ventas`,
        crear: `${API_BASE_URL}/ventas`,
        obtener: (id) => `${API_BASE_URL}/ventas/${id}`,
        actualizar: (id) => `${API_BASE_URL}/ventas/${id}`,
        eliminar: (id) => `${API_BASE_URL}/ventas/${id}`,
    },
    categorias: {
        listar: `${API_BASE_URL}/categorias`,
    }
};

// Función unificada para hacer peticiones a la API
export async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        console.log('Haciendo petición a:', endpoint);
        const response = await fetch(endpoint, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Error de autenticación, redirigiendo a login');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                throw new Error('Sesión expirada');
            }
            const error = await response.json();
            throw new Error(error.detail || 'Error en la petición');
        }

        const data = await response.json();
        console.log('Respuesta exitosa:', data);
        return data;
    } catch (error) {
        console.error('Error en fetchAPI:', error);
        throw error;
    }
}
