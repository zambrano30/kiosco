import { ENDPOINTS, ApiService } from './config.js';
import { getCookie } from './auth.js';

export async function mostrarProductos() {
    const seccionProductos = document.querySelector('.productos');
    if (!seccionProductos) return;

    try {
        const productos = await ApiService.makeRequest(ENDPOINTS.productos.listar);
        
        seccionProductos.innerHTML = productos.map(producto => `
            <article class="producto bg-white p-4 rounded-lg shadow-md">
                <img 
                    src="${producto.imagen || './productos/Image-avena.png'}" 
                    alt="${producto.nombre}"
                    class="w-full h-40 object-cover rounded-lg mb-4"
                />
                <div class="producto-info">
                    <h3 class="text-lg font-bold mb-2">${producto.nombre}</h3>
                    <p class="text-gray-600 mb-2">${producto.descripcion}</p>
                    <p class="text-green-600 font-bold">$${producto.precio}</p>
                    <p class="text-sm text-gray-500 mb-4">Stock: ${producto.stock}</p>
                    <button 
                        onclick="agregarAlCarrito(${JSON.stringify(producto).replace(/"/g, '&quot;')})"
                        class="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                    >
                        Agregar al carrito
                    </button>
                </div>
            </article>
        `).join('');

    } catch (error) {
        console.error('Error al cargar productos:', error);
        seccionProductos.innerHTML = '<p class="text-red-500 text-center">Error al cargar los productos</p>';
    }
}

// Función para filtrar productos por categoría
export function filtrarPorCategoria() {
    const selectCategoria = document.getElementById('categorias');
    if (!selectCategoria) return;

    selectCategoria.addEventListener('change', () => {
        const categoriaSeleccionada = selectCategoria.value;
        const productos = document.querySelectorAll('.producto');

        productos.forEach(producto => {
            if (!categoriaSeleccionada || producto.dataset.categoria === categoriaSeleccionada) {
                producto.style.display = 'block';
            } else {
                producto.style.display = 'none';
            }
        });
    });
}

// Función para agregar productos al carrito
window.agregarAlCarrito = function(producto) {
    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    
    // Verificar si el producto ya está en el carrito
    const productoExistente = carrito.find(item => item.id === producto.id);
    
    if (productoExistente) {
        productoExistente.cantidad = (productoExistente.cantidad || 1) + 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }
    
    localStorage.setItem('carrito', JSON.stringify(carrito));
    alert('Producto agregado al carrito');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    mostrarProductos();
    filtrarPorCategoria();
});
