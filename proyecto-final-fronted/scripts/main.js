import { ENDPOINTS, fetchAPI } from './config.js';
import { verificarAutenticacion, verificarEsAdministrador, cerrarSesion } from './auth.js';
import { inicializarProductos } from './productos.js';
import { inicializarUsuarios } from './usuarios.js';
import { inicializarVentas } from './ventas.js';

// Verificar autenticación al cargar la página
function verificarAuth() {
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Función para mostrar productos
async function mostrarProductos() {
    const seccionProductos = document.querySelector('.productos');
    if (!seccionProductos) return;

    try {
        const productos = await fetchAPI(ENDPOINTS.productos.listar);
        
        if (!Array.isArray(productos)) {
            console.error('La respuesta no es un array:', productos);
            return;
        }

        const productosHTML = productos.map(producto => `
            <article class="bg-white p-4 rounded-lg shadow-md">
                <img 
                    src="${producto.imagen || './productos/Image-avena.png'}" 
                    alt="${producto.nombre}"
                    class="w-full h-40 object-cover rounded-lg mb-4"
                />
                <div class="producto-info">
                    <h3 class="text-lg font-bold mb-2">${producto.nombre}</h3>
                    <p class="text-gray-600 mb-2">${producto.descripcion || 'Sin descripción'}</p>
                    <p class="text-green-600 font-bold">$${producto.precio}</p>
                    <p class="text-sm text-gray-500 mb-4">Stock: ${producto.stock}</p>
                    <button 
                        onclick="agregarAlCarrito('${producto.id}')"
                        class="w-full bg-green-500 text-white py-2 px-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                        Comprar
                    </button>
                </div>
            </article>
        `).join('');

        seccionProductos.innerHTML = productosHTML;
        console.log('Productos cargados exitosamente');
    } catch (error) {
        console.error('Error al cargar productos:', error);
        seccionProductos.innerHTML = '<p class="text-red-500 text-center p-4">Error al cargar los productos</p>';
    }
}

// Función para filtrar por categoría
function filtrarPorCategoria() {
    const selectCategoria = document.getElementById('categorias');
    if (!selectCategoria) return;

    selectCategoria.addEventListener('change', async () => {
        const categoriaSeleccionada = selectCategoria.value;
        const seccionProductos = document.querySelector('.productos');
        
        try {
            const response = await fetch(ENDPOINTS.productos.listar);
            const productos = await response.json();
            
            const productosFiltrados = categoriaSeleccionada 
                ? productos.filter(p => p.categoria === categoriaSeleccionada)
                : productos;

            const productosHTML = productosFiltrados.map(producto => `
                <article class="bg-white p-4 rounded-lg shadow-md">
                    <img 
                        src="${producto.imagen || './productos/Image-avena.png'}" 
                        alt="${producto.nombre}"
                        class="w-full h-40 object-cover rounded-lg mb-4"
                    />
                    <div class="producto-info">
                        <h3 class="text-lg font-bold mb-2">${producto.nombre}</h3>
                        <p class="text-gray-600 mb-2">${producto.descripcion || 'Sin descripción'}</p>
                        <p class="text-green-600 font-bold">$${producto.precio}</p>
                        <p class="text-sm text-gray-500 mb-4">Stock: ${producto.stock}</p>
                        <button 
                            onclick="agregarAlCarrito('${producto.id}')"
                            class="w-full bg-green-500 text-white py-2 px-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Comprar
                        </button>
                    </div>
                </article>
            `).join('');

            seccionProductos.innerHTML = productosHTML;
        } catch (error) {
            console.error('Error al filtrar productos:', error);
        }
    });
}

// Función para agregar al carrito
window.agregarAlCarrito = function(productoId) {
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    carrito.push(productoId);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    alert('Producto agregado al carrito');
};

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split("/").pop();

    // Mostrar/ocultar botón de administración
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin && verificarEsAdministrador()) {
        btnAdmin.classList.remove('hidden');
    }

    // Botón de cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }

    // Inicializar según la página actual
    if (currentPage === "" || currentPage === "index.html") {
        console.log('Iniciando carga de productos...');
        mostrarProductos();
        filtrarPorCategoria();
    } else if (currentPage === "inventario.html") {
        console.log('Iniciando gestión de inventario...');
        inicializarProductos();
    } else if (currentPage === "usuarios.html") {
        console.log('Iniciando gestión de usuarios...');
        inicializarUsuarios();
    } else if (currentPage === "ventas.html") {
        console.log('Iniciando gestión de ventas...');
        inicializarVentas();
    }
});

  // Puedes agregar más inicializaciones 
