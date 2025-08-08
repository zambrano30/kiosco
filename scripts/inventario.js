let productosInventario = [];
let productoEditando = null;

/**
 * Obtiene el token de autenticación del localStorage
 * @returns {string|null} Token de autenticación
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Construye los headers para las peticiones HTTP
 * @returns {Object} Headers con autenticación si existe token
 */
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} True si está autenticado
 */
async function verificarAutenticacion() {
    const token = getAuthToken();
    
    if (!token) {
        alert('No has iniciado sesión. Serás redirigido al login.');
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar si el token no está expirado
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp < now) {
            localStorage.removeItem('authToken');
            alert('Tu sesión ha expirado. Inicia sesión nuevamente.');
            window.location.href = 'login.html';
            return false;
        }
    } catch (e) {
        console.warn('No se pudo verificar la expiración del token');
    }
    
    return true;
}

// FUNCIONES PRINCIPALES DE GESTIÓN DE PRODUCTOS
function inicializarGestionProductos() {
    // Verificar autenticación primero
    if (!verificarAutenticacion()) {
        return;
    }
    
    // Configurar botón agregar
    const btnAgregar = document.getElementById('btn-agregar-producto');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', function() {
            abrirModal();
        });
    }
    
    // Configurar botón cancelar
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            cerrarModal();
        });
    }
    
    // Configurar formulario
    const formProducto = document.getElementById('form-producto');
    if (formProducto) {
        formProducto.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarProducto();
        });
    }
    
    // Cargar productos inicialmente
    cargarProductos();
}

function abrirModal(producto = null) {
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-producto');
    const titulo = document.getElementById('modal-titulo');
    
    if (!modal || !form) {
        console.error('Modal o formulario no encontrado');
        return;
    }
    
    productoEditando = producto;
    
    if (producto) {
        titulo.textContent = 'Editar Producto';
        document.getElementById('producto-nombre').value = producto.nombre || '';
        document.getElementById('producto-precio').value = producto.precio || '';
        document.getElementById('producto-categoria').value = producto.categoria || '';
        document.getElementById('producto-stock').value = producto.stock || '';
        document.getElementById('producto-descripcion').value = producto.descripcion || '';
    } else {
        titulo.textContent = 'Agregar Producto';
        form.reset();
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modal-producto');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
    
    productoEditando = null;
}

async function guardarProducto() {
    // Verificar autenticación antes de guardar
    const token = getAuthToken();
    if (!token) {
        alert('Debes iniciar sesión para guardar productos. Serás redirigido al login.');
        window.location.href = 'login.html';
        return;
    }
    
    const nombre = document.getElementById('producto-nombre').value;
    const precio = parseFloat(document.getElementById('producto-precio').value);
    const categoria = document.getElementById('producto-categoria').value;
    const stock = parseInt(document.getElementById('producto-stock').value);
    const descripcion = document.getElementById('producto-descripcion').value;
    
    if (!nombre || !precio || !categoria || stock < 0) {
        alert('Por favor, completa todos los campos correctamente');
        return;
    }
    
    const productoData = {
        nombre,
        descripcion: descripcion || categoria,
        precio,
        stock,
        categoria
    };
    
    try {
        let url = 'https://funval-backend.onrender.com/productos';
        let method = 'POST';
        
        if (productoEditando) {
            url += `/${productoEditando.id_producto || productoEditando.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(productoData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 403) {
                alert('No tienes permisos para realizar esta acción. Verifica tu sesión e intenta nuevamente.');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            } else if (response.status === 401) {
                alert('Tu sesión ha expirado. Serás redirigido al login.');
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return;
            }
            
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const resultado = await response.json();
        
        alert(productoEditando ? 'Producto actualizado correctamente' : 'Producto agregado correctamente');
        
        cerrarModal();
        cargarProductos();
        
    } catch (error) {
        console.error('Error al guardar producto:', error);
        
        if (error.message.includes('403')) {
            alert('Acceso prohibido. Necesitas iniciar sesión para guardar productos.');
            window.location.href = 'login.html';
        } else if (error.message.includes('401')) {
            alert('Sesión expirada. Inicia sesión nuevamente.');
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        } else {
            alert('Error al guardar el producto: ' + error.message);
        }
    }
}

async function cargarProductos() {
    try {
        const response = await fetch('https://funval-backend.onrender.com/productos', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                alert('Tu sesión ha expirado. Serás redirigido al login.');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const productos = await response.json();
        productosInventario = productos.sort((a, b) => (a.id_producto || a.id) - (b.id_producto || b.id));
        
        mostrarProductos(productosInventario);
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            alert('Error de conexión. Verifica tu conexión a internet.');
        } else if (error.message.includes('401')) {
            alert('No tienes autorización. Inicia sesión primero.');
        } else {
            alert('Error al cargar productos: ' + error.message);
        }
    }
}

function mostrarProductos(productos) {
    const tbody = document.getElementById('tabla-productos');
    if (!tbody) {
        console.warn('Tabla de productos no encontrada');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center space-y-4">
                        <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <div class="text-center">
                            <h3 class="text-lg font-semibold text-gray-600">No hay productos</h3>
                            <p class="text-gray-400 mt-1">Agrega tu primer producto para comenzar</p>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    productos.forEach((producto) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors duration-200';
        
        // Determinar el color del badge de stock
        const stock = producto.stock || 0;
        let stockClass = 'bg-red-100 text-red-800';
        let stockIcon = '⚠️';
        
        if (stock > 20) {
            stockClass = 'bg-green-100 text-green-800';
            stockIcon = '✅';
        } else if (stock > 5) {
            stockClass = 'bg-yellow-100 text-yellow-800';
            stockIcon = '⚡';
        }
        
        row.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        ${producto.id_producto || producto.id}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-left">
                <div class="flex flex-col">
                    <p class="text-sm font-semibold text-gray-900">
                        ${producto.nombre}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${producto.descripcion || 'Sin descripción'}
                    </p>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                    <span class="text-lg font-bold text-emerald-600">
                        $${parseFloat(producto.precio).toFixed(2)}
                    </span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${producto.categoria}
                    </span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${stockClass}">
                        ${stockIcon} ${stock} unidades
                    </span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center space-x-3">
                    <button onclick="editarProducto(${producto.id_producto || producto.id})" 
                            class="inline-flex items-center justify-center w-9 h-9 border border-transparent text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-110 rounded-lg"
                            title="Editar producto">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="eliminarProducto(${producto.id_producto || producto.id})" 
                            class="inline-flex items-center justify-center w-9 h-9 border border-transparent text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-110 rounded-lg"
                            title="Eliminar producto">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function editarProducto(id) {
    const producto = productosInventario.find(p => (p.id_producto || p.id) === id);
    if (producto) {
        abrirModal(producto);
    } else {
        console.error('Producto no encontrado para editar:', id);
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        return;
    }
    
    try {
        const response = await fetch(`https://funval-backend.onrender.com/productos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        alert('Producto eliminado correctamente');
        cargarProductos();
        
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar el producto: ' + error.message);
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    inicializarGestionProductos();
});
