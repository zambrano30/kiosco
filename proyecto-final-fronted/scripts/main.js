import { ENDPOINTS, fetchAPI } from './config.js';
import { verificarAutenticacion, verificarEsAdministrador, cerrarSesion, obtenerInfoUsuario } from './auth.js';
import { inicializarProductos } from './productos.js';
import { inicializarUsuarios } from './usuarios.js';
import { inicializarVentas } from './ventas.js';

// Variables globales
let productosGlobal = [];
let categoriasGlobal = [];
let paginaActual = 1;
let totalPaginas = 1;
const productosPorPagina = 20;

// Verificar autenticación al cargar la página
function verificarAuth() {
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Función para obtener categorías del backend
async function obtenerCategorias() {
    try {
        // Intentar obtener categorías de un endpoint específico
        try {
            const categorias = await fetchAPI(ENDPOINTS.categorias.listar);
            
            if (Array.isArray(categorias) && categorias.length > 0) {
                categoriasGlobal = categorias;
                return categorias;
            }
        } catch (error) {
            // Endpoint no disponible, extraer de productos
        }
        
        // Si no hay endpoint de categorías, extraer de productos
        const productos = await fetchAPI(ENDPOINTS.productos.listar);
        
        if (Array.isArray(productos)) {
            const categoriasUnicas = [...new Set(productos
                .map(p => p.categoria || p.category)
                .filter(Boolean)
                .map(cat => cat.toString().trim())
                .filter(cat => cat.length > 0)
            )];
            
            categoriasGlobal = categoriasUnicas.map(cat => ({ 
                id: cat, 
                nombre: cat,
                value: cat 
            }));
            
            return categoriasGlobal;
        }
        
        return [];
    } catch (error) {
        console.error('❌ Error al obtener categorías:', error);
        return [];
    }
}

// Función para cargar categorías en el select
async function cargarCategorias() {
    const selectCategorias = document.getElementById('categorias');
    if (!selectCategorias) return;
    
    try {
        const categorias = await obtenerCategorias();
        
        // Limpiar opciones existentes (excepto "Todas las categorías")
        selectCategorias.innerHTML = '<option value="">Todas las categorías</option>';
        
        // Agregar categorías dinámicamente
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            const valorCategoria = categoria.nombre || categoria.id || categoria.value || categoria;
            option.value = valorCategoria;
            option.textContent = valorCategoria;
            selectCategorias.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ Error al cargar categorías en select:', error);
    }
}

// Función para obtener productos del backend
async function obtenerProductos(categoria = null, pagina = 1) {
    try {
        let endpoint = ENDPOINTS.productos.listar;
        
        // Si hay una categoría específica, usar el endpoint correspondiente
        if (categoria && categoria !== '' && categoria !== 'todos') {
            endpoint = ENDPOINTS.productos.porCategoria(categoria);
        }
        
        const data = await fetchAPI(endpoint);
        console.log('� Respuesta del backend:', data);
        
        // Manejar diferentes formatos de respuesta del backend
        let productos = [];
        
        if (Array.isArray(data)) {
            productos = data;
        } else if (data.productos && Array.isArray(data.productos)) {
            productos = data.productos;
        } else if (data.data && Array.isArray(data.data)) {
            productos = data.data;
        } else {
            console.error('❌ Formato de respuesta no reconocido:', data);
            throw new Error('Formato de respuesta inválido del servidor');
        }
        
        // Validar y normalizar productos
        const productosNormalizados = productos.map((producto, index) => {
            return {
                id: producto.id || producto._id || producto.ID || `temp-${index}`,
                nombre: producto.nombre || producto.name || producto.title || 'Producto sin nombre',
                descripcion: producto.descripcion || producto.description || 'Sin descripción disponible',
                precio: Number(producto.precio || producto.price || producto.cost || 0),
                stock: Number(producto.stock || producto.quantity || producto.available || 0),
                categoria: producto.categoria || producto.category || 'general',
                imagen: producto.imagen || producto.image || producto.photo || './productos/Image-avena.png'
            };
        });
        
        // Filtrar productos válidos
        const productosValidos = productosNormalizados.filter(producto => {
            const esValido = producto.id && 
                           producto.nombre && 
                           !isNaN(producto.precio) && 
                           producto.precio >= 0;
            
            if (!esValido) {
                console.warn('⚠️ Producto con datos inválidos filtrado:', producto);
            }
            
            return esValido;
        });
        
        productosGlobal = productosValidos;
        paginaActual = pagina;
        
        // Mostrar estadísticas
        const estadisticas = {
            total: productosValidos.length,
            conStock: productosValidos.filter(p => p.stock > 0).length,
            sinStock: productosValidos.filter(p => p.stock === 0).length,
            categorias: [...new Set(productosValidos.map(p => p.categoria))].length,
            precioPromedio: productosValidos.length > 0 ? 
                (productosValidos.reduce((sum, p) => sum + p.precio, 0) / productosValidos.length).toFixed(2) : 0
        };
        
        return {
            productos: productosValidos,
            total: productosValidos.length,
            pagina: paginaActual,
            estadisticas
        };
        
    } catch (error) {
        console.error('💥 Error al obtener productos:', error);
        
        // NO mostrar productos demo - mostrar error real
        mostrarNotificacion(`Error del servidor: ${error.message}`, 'error');
        productosGlobal = [];
        
        return {
            productos: [],
            total: 0,
            pagina: 1,
            error: error.message
        };
    }
}

// Función para actualizar contador del carrito
function actualizarContadorCarrito() {
    // Buscar el contador con múltiples selectores
    let contador = document.querySelector('.absolute.-top-1.-right-1 span');
    if (!contador) {
        contador = document.querySelector('button.relative span');
    }
    if (!contador) {
        contador = document.querySelector('[class*="absolute"][class*="top"][class*="right"] span');
    }
    
    if (contador) {
        const totalItems = Object.values(carrito).reduce((total, item) => {
            return total + (item.cantidad || 0);
        }, 0);
        
        contador.textContent = totalItems;
        
        // Cambiar color según cantidad
        if (totalItems > 0) {
            contador.parentElement.classList.remove('bg-gray-400');
            contador.parentElement.classList.add('bg-red-500');
        } else {
            contador.parentElement.classList.remove('bg-red-500');
            contador.parentElement.classList.add('bg-gray-400');
        }
    } else {
        console.error('❌ No se encontró el elemento contador del carrito');
    }
}

// Función para filtrar por categoría
async function filtrarPorCategoria() {
    const selectCategoria = document.getElementById('categorias');
    if (!selectCategoria) return;

    selectCategoria.addEventListener('change', async () => {
        const categoriaSeleccionada = selectCategoria.value;
        console.log('🏷️ Categoría seleccionada:', categoriaSeleccionada);
        
        try {
            // Mostrar indicador de carga
            const seccionProductos = document.querySelector('.productos');
            if (seccionProductos) {
                seccionProductos.innerHTML = '<div class="col-span-full flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>';
            }
            
            // Obtener productos filtrados del backend
            const resultado = await obtenerProductos(categoriaSeleccionada, 1);
            
            if (resultado.error) {
                console.error('❌ Error al filtrar productos:', resultado.error);
                mostrarNotificacion('Error al filtrar productos', 'error');
                return;
            }
            
            // Mostrar productos filtrados
            await mostrarProductos(resultado.productos);
            
            // Mostrar estadísticas del filtro
            const mensaje = categoriaSeleccionada 
                ? `Mostrando ${resultado.productos.length} productos de "${categoriaSeleccionada}"`
                : `Mostrando todos los productos (${resultado.productos.length})`;
            
            console.log('✅', mensaje);
            
        } catch (error) {
            console.error('💥 Error al filtrar productos:', error);
            mostrarNotificacion('Error al aplicar filtro', 'error');
        }
    });
}

// Variables globales del carrito
let carrito = {};

// Función para cargar carrito desde localStorage
function cargarCarritoDesdeStorage() {
    try {
        const carritoGuardado = localStorage.getItem('carrito');
        if (carritoGuardado) {
            const carritoData = JSON.parse(carritoGuardado);
            carrito = carritoData || {};
        } else {
            carrito = {};
        }
    } catch (error) {
        console.error('❌ Error al cargar carrito desde localStorage:', error);
        carrito = {};
    }
    
    // Actualizar contador después de cargar
    actualizarContadorCarrito();
}

// Función para guardar carrito en localStorage
function guardarCarritoEnStorage() {
    try {
        const carritoString = JSON.stringify(carrito);
        localStorage.setItem('carrito', carritoString);
        console.log('Carrito guardado en localStorage:', Object.keys(carrito).length, 'productos');
    } catch (error) {
        console.error('Error al guardar carrito en localStorage:', error);
    }
}

// Función para crear contador de productos
function crearContador(productoId, cantidad) {
  return `
    <div class="flex items-center justify-center bg-emerald-600 text-white rounded-full px-4 py-1.5 gap-4">
      <button class="btn-restar text-white text-xl font-bold" data-id="${productoId}">−</button>
      <span class="text-sm">${cantidad}</span>
      <button class="btn-sumar text-white text-xl font-bold" data-id="${productoId}">+</button>
    </div>
  `;
}

// Función para mostrar productos mejorada
async function mostrarProductos(productos = null) {
    const seccionProductos = document.querySelector('.productos');
    
    if (!seccionProductos) {
        console.error('❌ No se encontró el contenedor .productos');
        mostrarNotificacion('Error en la interfaz: contenedor no encontrado', 'error');
        return;
    }

    try {
        // Si no se pasan productos, obtenerlos del backend
        if (!productos) {
            if (productosGlobal.length === 0) {
                const resultado = await obtenerProductos();
                
                if (resultado.error) {
                    console.error('❌ Error al obtener productos:', resultado.error);
                    seccionProductos.innerHTML = `
                        <div class="col-span-full text-center py-12">
                            <div class="text-red-500 text-6xl mb-4">⚠️</div>
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">Error de conexión</h3>
                            <p class="text-gray-600 mb-4">No se pudieron cargar los productos del servidor</p>
                            <p class="text-sm text-gray-500">${resultado.error}</p>
                            <button onclick="location.reload()" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">
                                Reintentar
                            </button>
                        </div>
                    `;
                    return;
                }
                
                productos = resultado.productos;
            } else {
                productos = productosGlobal;
            }
        }
        
        // Verificar si hay productos para mostrar
        if (!Array.isArray(productos) || productos.length === 0) {
            console.warn('⚠️ No hay productos para mostrar');
            seccionProductos.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 text-6xl mb-4">📦</div>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">No hay productos disponibles</h3>
                    <p class="text-gray-600">En este momento no hay productos en esta categoría</p>
                </div>
            `;
            return;
        }

        // Limpiar contenedor
        seccionProductos.innerHTML = '';

        // Crear productos con mejor manejo de errores
        productos.forEach((producto, index) => {
            try {
                // Validar datos del producto
                if (!producto.id || !producto.nombre) {
                    console.warn(`⚠️ Producto ${index + 1} tiene datos incompletos:`, producto);
                    return; // Saltar este producto
                }
                
                // Buscar si el producto está en el carrito
                const idRealProducto = String(producto.id);
                const idEnCarrito = Object.keys(carrito).find(id => String(id) === idRealProducto);
                
                const tarjetaProducto = document.createElement('article');
                tarjetaProducto.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group';
                
                // Determinar el contenido del botón/contador
                let botonContenido;
                if (idEnCarrito && carrito[idEnCarrito]) {
                    botonContenido = crearContador(producto.id, carrito[idEnCarrito].cantidad);
                } else {
                    const estaDisponible = producto.stock > 0;
                    botonContenido = `
                        <button class="btn-agregar w-full ${estaDisponible ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'} text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm ${estaDisponible ? 'hover:shadow-md active:transform active:scale-[0.98]' : ''} flex items-center justify-center gap-2" 
                                data-id="${producto.id}" 
                                ${!estaDisponible ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                            </svg>
                            ${!estaDisponible ? 'Sin Stock' : ''}
                        </button>
                    `;
                    console.log(`🔘 Usando botón para producto ${producto.id}`);
                }
                
                // Formatear precio con validación
                const precioFormateado = isNaN(producto.precio) ? '0.00' : Number(producto.precio).toFixed(2);
                
                // Determinar imagen con fallback
                const imagenProducto = producto.imagen || './productos/Image-avena.png';
                
                tarjetaProducto.innerHTML = `
                    <div class="relative overflow-hidden rounded-lg mb-4">
                        <img 
                            src="${imagenProducto}" 
                            alt="${producto.nombre}"
                            class="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                            onerror="this.src='./productos/Image-avena.png'"
                        />
                        ${producto.stock <= 5 && producto.stock > 0 ? '<span class="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">Poco stock</span>' : ''}
                        ${producto.stock === 0 ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sin stock</span>' : ''}
                    </div>
                    <div class="producto-info">
                        <h3 class="text-lg font-bold mb-2 text-gray-800 line-clamp-2" title="${producto.nombre}">${producto.nombre}</h3>
                        <p class="text-gray-600 mb-3 text-sm line-clamp-2" title="${producto.descripcion || 'Sin descripción'}">${producto.descripcion || 'Sin descripción disponible'}</p>
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-2xl font-bold text-emerald-600">$${precioFormateado}</span>
                            <span class="text-sm ${producto.stock > 0 ? 'text-gray-500' : 'text-red-500'}">
                                Stock: ${producto.stock}
                            </span>
                        </div>
                        
                        <div class="-mt-2 flex justify-center z-10">
                            <div class="envoltorio-boton w-full" data-id="${producto.id}">
                                ${botonContenido}
                            </div>
                        </div>
                    </div>
                `;
                
                seccionProductos.appendChild(tarjetaProducto);
                
            } catch (error) {
                console.error(`💥 Error al renderizar producto ${index + 1}:`, error, producto);
                // Continúa con el siguiente producto en lugar de fallar completamente
            }
        });

        // Actualizar contador del carrito
        actualizarContadorCarrito();
        
    } catch (error) {
        console.error('💥 Error general al mostrar productos:', error);
        seccionProductos.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-red-500 text-6xl mb-4">💥</div>
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Error inesperado</h3>
                <p class="text-gray-600 mb-4">Ocurrió un error al mostrar los productos</p>
                <p class="text-sm text-gray-500 mb-4">${error.message}</p>
                <button onclick="location.reload()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">
                    Recargar página
                </button>
            </div>
        `;
        mostrarNotificacion('Error al renderizar productos', 'error');
    }
}

// Función para actualizar el carrito
function actualizarCarrito() {
    console.log('📦 Productos en carrito:', Object.keys(carrito).length);
    
    const contenedorElementosCarrito = document.getElementById('contenido-carrito');
    const totalCarrito = document.getElementById('total-carrito');
    
    if (!contenedorElementosCarrito) {
        console.error('❌ No se encontró el contenedor del carrito (#contenido-carrito)');
        return;
    }
    
    // Limpiar contenido
    contenedorElementosCarrito.innerHTML = '';
    let total = 0;
    let cantidad = 0;
    
    // Procesar cada producto en el carrito
    for (const id in carrito) {
        const item = carrito[id];
        
        if (!item || !item.precio || !item.cantidad) {
            console.warn('⚠️ Item inválido en carrito:', item);
            continue;
        }
        
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        cantidad += item.cantidad;

        const itemHTML = `
            <div class="flex items-center gap-4 p-4 border border-gray-200 rounded-lg mb-3" data-item-id="${id}">
                <img src="${item.imagen || './productos/Image-avena.png'}" 
                     alt="${item.nombre}" 
                     class="w-16 h-16 object-cover rounded-lg"
                     onerror="this.src='./productos/Image-avena.png'">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${item.nombre}</h3>
                    <p class="text-emerald-600 font-medium">$${Number(item.precio).toFixed(2)} x ${item.cantidad} = $${subtotal.toFixed(2)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn-restar w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors" data-id="${id}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
                        </svg>
                    </button>
                    <span class="w-8 text-center font-medium">${item.cantidad}</span>
                    <button class="btn-sumar w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors" data-id="${id}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
                        </svg>
                    </button>
                </div>
                <button class="btn-eliminar p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" data-id="${id}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
        `;
        
        contenedorElementosCarrito.innerHTML += itemHTML;
    }

    // Mostrar mensaje si el carrito está vacío
    if (cantidad === 0) {
        contenedorElementosCarrito.innerHTML = `
            <div class="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-gray-300 mb-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                <p class="text-gray-500 text-lg">Tu carrito está vacío</p>
                <p class="text-gray-400 text-sm mt-2">Agrega algunos productos para comenzar</p>
            </div>
        `;
    }

    // Actualizar total en el modal
    if (totalCarrito) {
        totalCarrito.textContent = `$${total.toFixed(2)}`;
    }
    
    // Actualizar contador principal
    actualizarContadorCarrito();
    
    console.log(`✅ Carrito actualizado: ${cantidad} productos, Total: $${total.toFixed(2)}`);
}

// Función para actualizar contador en producto
function actualizarContador(productoId) {
    const envoltorio = document.querySelector(`.envoltorio-boton[data-id="${productoId}"]`);
    
    // Buscar el producto en el carrito usando el ID correcto
    const idEnCarrito = Object.keys(carrito).find(id => String(id) === String(productoId));
    
    if (envoltorio && idEnCarrito && carrito[idEnCarrito]) {
        envoltorio.innerHTML = crearContador(productoId, carrito[idEnCarrito].cantidad);
    } else {
        console.log('❌ No se pudo actualizar contador para:', productoId, 'Envoltorio:', !!envoltorio, 'En carrito:', !!idEnCarrito);
    }
}

// Event listener principal para todos los botones del carrito
document.body.addEventListener('click', async (e) => {
    console.log('Click detectado en:', e.target);
    console.log('Clases del elemento:', e.target.className);
    
    const botonAgregar = e.target.closest('.btn-agregar');
    const botonSumar = e.target.closest('.btn-sumar');
    const botonRestar = e.target.closest('.btn-restar');
    const botonEliminar = e.target.closest('.btn-eliminar');

    console.log('Botones detectados:', {
        agregar: !!botonAgregar,
        sumar: !!botonSumar,
        restar: !!botonRestar,
        eliminar: !!botonEliminar
    });

    if (botonAgregar) {
        const productoId = botonAgregar.dataset.id;
        console.log('Agregando producto:', productoId);
        
        try {
            // Usar productos globales o obtenerlos si no existen
            if (productosGlobal.length === 0) {
                await obtenerProductos();
            }
            
            // Buscar el producto usando múltiples comparaciones para asegurar la coincidencia
            const producto = productosGlobal.find(p => {
                const pId = String(p.id);
                const buscado = String(productoId);
                return pId === buscado;
            });
            
            if (!producto) {
                mostrarNotificacion('Producto no encontrado', 'error');
                console.error('Producto no encontrado:', productoId);
                console.error('Productos disponibles:', productosGlobal.map(p => ({id: p.id, nombre: p.nombre})));
                return;
            }

            // Verificar stock actualizado del producto
            if (producto.stock <= 0) {
                mostrarNotificacion('Producto sin stock', 'error');
                return;
            }

            // Usar el ID real del producto para el carrito
            const idRealProducto = String(producto.id);
            const envoltorio = document.querySelector(`.envoltorio-boton[data-id="${productoId}"]`);
            
            // Verificar si el producto ya está en el carrito usando el ID real
            if (carrito[idRealProducto]) {
                // Si ya existe, verificar stock disponible antes de incrementar
                // Usar el stock más actualizado del producto global
                const stockActual = producto.stock;
                if (carrito[idRealProducto].cantidad < stockActual) {
                    carrito[idRealProducto].cantidad += 1;
                    // Actualizar el stock en el carrito también
                    carrito[idRealProducto].stock = stockActual;
                    console.log('📈 Incrementando cantidad del producto:', idRealProducto, 'Nueva cantidad:', carrito[idRealProducto].cantidad);
                } else {
                    mostrarNotificacion(`Stock máximo alcanzado (${stockActual} disponibles)`, 'error');
                    return;
                }
            } else {
                // Mapeo robusto para diferentes estructuras de datos del backend
                const nuevoProducto = {
                    id: idRealProducto,
                    nombre: producto.nombre || producto.name || producto.title || 'Producto sin nombre',
                    precio: Number(producto.precio || producto.price || producto.cost || 0),
                    imagen: producto.imagen || producto.image || producto.photo || './productos/Image-avena.png',
                    cantidad: 1,
                    stock: Number(producto.stock || producto.quantity || producto.available || 999)
                };
                
                // Verificar que todos los datos sean válidos
                if (!nuevoProducto.id || !nuevoProducto.nombre || isNaN(nuevoProducto.precio)) {
                    console.error('❌ Datos del producto inválidos:', nuevoProducto);
                    mostrarNotificacion('Error: datos del producto inválidos', 'error');
                    return;
                }
                
                carrito[idRealProducto] = nuevoProducto;
            }
            
            actualizarCarrito();
            if (envoltorio) {
                envoltorio.innerHTML = crearContador(productoId, carrito[idRealProducto].cantidad);
                console.log('🔄 Envoltorio actualizado para producto:', productoId);
            }
            guardarCarritoEnStorage(); // Guardar en localStorage
            mostrarNotificacion('Producto agregado al carrito', 'success');
            
        } catch (error) {
            console.error('💥 Error al agregar producto:', error);
            mostrarNotificacion('Error al agregar producto', 'error');
        }
    }

    if (botonSumar) {
        const productoId = botonSumar.dataset.id;
        console.log('🔼 Sumando producto ID:', productoId);
        console.log('Productos en carrito:', Object.keys(carrito));
        
        // Buscar el producto en el carrito usando el ID correcto
        const idEnCarrito = Object.keys(carrito).find(id => String(id) === String(productoId));
        
        if (idEnCarrito && carrito[idEnCarrito]) {
            // Buscar el producto en la lista global para obtener el stock actualizado
            const productoGlobal = productosGlobal.find(p => String(p.id) === String(productoId));
            const stockActual = productoGlobal ? productoGlobal.stock : carrito[idEnCarrito].stock;
            
            if (carrito[idEnCarrito].cantidad < stockActual) {
                carrito[idEnCarrito].cantidad += 1;
                // Actualizar el stock en el carrito también
                carrito[idEnCarrito].stock = stockActual;
                console.log('✅ Cantidad incrementada:', idEnCarrito, 'Nueva cantidad:', carrito[idEnCarrito].cantidad);
                actualizarCarrito();
                actualizarContador(productoId);
                guardarCarritoEnStorage();
            } else {
                mostrarNotificacion(`Stock máximo alcanzado (${stockActual} disponibles)`, 'error');
            }
        } else {
            console.error('❌ Producto no encontrado en carrito para sumar:', productoId);
        }
    }

    if (botonRestar) {
        const productoId = botonRestar.dataset.id;
        console.log('🔽 Restando producto ID:', productoId);
        console.log('Productos en carrito:', Object.keys(carrito));
        
        // Buscar el producto en el carrito usando el ID correcto
        const idEnCarrito = Object.keys(carrito).find(id => String(id) === String(productoId));
        
        if (idEnCarrito && carrito[idEnCarrito]) {
            carrito[idEnCarrito].cantidad -= 1;
            console.log('🔻 Cantidad decrementada:', idEnCarrito, 'Nueva cantidad:', carrito[idEnCarrito].cantidad);
            
            if (carrito[idEnCarrito].cantidad <= 0) {
                console.log('🗑️ Eliminando producto del carrito:', idEnCarrito);
                delete carrito[idEnCarrito];
                const envoltorio = document.querySelector(`.envoltorio-boton[data-id="${productoId}"]`);
                if (envoltorio) {
                    envoltorio.innerHTML = `
                        <button class="btn-agregar w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:transform active:scale-[0.98] flex items-center justify-center gap-2" data-id="${productoId}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                            </svg>
                            
                        </button>
                    `;
                }
            } else {
                actualizarContador(productoId);
            }
            actualizarCarrito();
            guardarCarritoEnStorage();
        } else {
            console.error('❌ Producto no encontrado en carrito para restar:', productoId);
        }
    }

    if (botonEliminar) {
        const productoId = botonEliminar.dataset.id;
        console.log('🗑️ Eliminando producto ID:', productoId);
        console.log('Productos en carrito:', Object.keys(carrito));
        
        // Buscar el producto en el carrito usando el ID correcto
        const idEnCarrito = Object.keys(carrito).find(id => String(id) === String(productoId));
        
        if (idEnCarrito && carrito[idEnCarrito]) {
            console.log('✅ Eliminando producto:', idEnCarrito, carrito[idEnCarrito].nombre);
            delete carrito[idEnCarrito];
            const envoltorio = document.querySelector(`.envoltorio-boton[data-id="${productoId}"]`);
            if (envoltorio) {
                envoltorio.innerHTML = `
                    <button class="btn-agregar w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:transform active:scale-[0.98] flex items-center justify-center gap-2" data-id="${productoId}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                    
                    </button>
                `;
            }
            actualizarCarrito();
            guardarCarritoEnStorage();
            mostrarNotificacion('Producto eliminado del carrito', 'info');
        } else {
            console.error('❌ Producto no encontrado en carrito para eliminar:', productoId);
        }
    }
});

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Remover notificación existente
    const notificacionExistente = document.querySelector('.notificacion-toast');
    if (notificacionExistente) {
        notificacionExistente.remove();
    }

    const colores = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const notificacion = document.createElement('div');
    notificacion.className = `notificacion-toast fixed top-4 right-4 ${colores[tipo]} text-white px-6 py-3 rounded-lg shadow-lg z-[9999] transform translate-x-full transition-transform duration-300`;
    notificacion.textContent = mensaje;
    
    document.body.appendChild(notificacion);
    
    // Mostrar notificación
    setTimeout(() => {
        notificacion.classList.remove('translate-x-full');
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notificacion.classList.add('translate-x-full');
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Función para configurar búsqueda mejorada con backend
function configurarBusqueda() {
    const inputBusqueda = document.querySelector('input[type="search"]');
    if (!inputBusqueda) return;
    
    let timeoutBusqueda = null;
    
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.trim();
        
        // Limpiar timeout anterior
        if (timeoutBusqueda) {
            clearTimeout(timeoutBusqueda);
        }
        
        // Debounce de 500ms para evitar muchas peticiones
        timeoutBusqueda = setTimeout(async () => {
            console.log('🔍 Buscando:', termino);
            
            try {
                if (termino === '') {
                    // Si no hay término, mostrar todos los productos
                    console.log('📋 Mostrando todos los productos');
                    const resultado = await obtenerProductos();
                    await mostrarProductos(resultado.productos);
                } else {
                    // Buscar en el backend
                    console.log('🔎 Realizando búsqueda en backend...');
                    
                    // Mostrar indicador de carga
                    const seccionProductos = document.querySelector('.productos');
                    if (seccionProductos) {
                        seccionProductos.innerHTML = `
                            <div class="col-span-full flex justify-center items-center py-12">
                                <div class="text-center">
                                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                                    <p class="text-gray-500 text-sm">Buscando "${termino}"...</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Construir URL de búsqueda
                    const url = new URL(ENDPOINTS.productos.listar);
                    url.searchParams.set('search', termino);
                    url.searchParams.set('q', termino);
                    url.searchParams.set('busqueda', termino);
                    
                    try {
                        console.log('📡 URL de búsqueda:', url.toString());
                        const data = await fetchAPI(url.toString());
                        
                        let productos = [];
                        if (Array.isArray(data)) {
                            productos = data;
                        } else if (data.productos && Array.isArray(data.productos)) {
                            productos = data.productos;
                        } else if (data.data && Array.isArray(data.data)) {
                            productos = data.data;
                        }
                        
                        // Si el backend no soporta búsqueda, filtrar localmente
                        if (productos.length === 0 || productos.length === productosGlobal.length) {
                            console.log('🔄 Backend no soporta búsqueda, filtrando localmente');
                            productos = productosGlobal.filter(producto => 
                                producto.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                                (producto.descripcion && producto.descripcion.toLowerCase().includes(termino.toLowerCase())) ||
                                (producto.categoria && producto.categoria.toLowerCase().includes(termino.toLowerCase()))
                            );
                        }
                        
                        console.log(`✅ Búsqueda completada: ${productos.length} resultados para "${termino}"`);
                        await mostrarProductos(productos);
                        
                        // Mostrar mensaje de resultados
                        if (productos.length === 0) {
                            mostrarNotificacion(`No se encontraron productos para "${termino}"`, 'info');
                        }
                        
                    } catch (error) {
                        console.error('❌ Error en búsqueda backend, usando filtro local:', error);
                        
                        // Fallback: filtrar productos locales
                        const productosFiltrados = productosGlobal.filter(producto => 
                            producto.nombre.toLowerCase().includes(termino.toLowerCase()) ||
                            (producto.descripcion && producto.descripcion.toLowerCase().includes(termino.toLowerCase())) ||
                            (producto.categoria && producto.categoria.toLowerCase().includes(termino.toLowerCase()))
                        );
                        
                        console.log(`🔄 Filtro local: ${productosFiltrados.length} resultados`);
                        await mostrarProductos(productosFiltrados);
                        
                        if (productosFiltrados.length === 0) {
                            mostrarNotificacion(`No se encontraron productos para "${termino}"`, 'info');
                        }
                    }
                }
            } catch (error) {
                console.error('💥 Error general en búsqueda:', error);
                mostrarNotificacion('Error al realizar búsqueda', 'error');
            }
        }, 500); // Esperar 500ms después de que el usuario deje de escribir
    });
    
    // Limpiar búsqueda con Escape
    inputBusqueda.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            inputBusqueda.value = '';
            inputBusqueda.dispatchEvent(new Event('input'));
        }
    });
}

// Función para abrir el modal del carrito
function abrirModalCarrito() {
    console.log('🛒 Abriendo modal del carrito...');
    
    // Verificar si hay productos en el carrito
    const totalProductos = Object.keys(carrito).length;
    if (totalProductos === 0) {
        mostrarNotificacion('Tu carrito está vacío', 'info');
        return;
    }
    
    // Verificar autenticación SOLO al abrir el carrito
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('🔐 Usuario no autenticado, redirigiendo al login...');
        
        // Mostrar modal de confirmación para login
        const confirmar = confirm('Para ver tu carrito y proceder con la compra necesitas iniciar sesión. ¿Deseas ir al login?');
        if (confirmar) {
            // Guardar la URL actual para regresar después del login
            localStorage.setItem('urlRegreso', window.location.href);
            window.location.href = './login.html';
        }
        return;
    }
    
    console.log('✅ Usuario autenticado, mostrando carrito...');
    
    // Crear modal si no existe
    let modal = document.getElementById('modal-carrito');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-carrito';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[9999] hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <!-- Header del modal -->
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                        Mi Carrito
                    </h2>
                    <button onclick="cerrarModalCarrito()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <!-- Contenido del carrito -->
                <div class="flex-1 overflow-y-auto p-6" id="contenido-carrito">
                    <!-- Los items se generarán dinámicamente -->
                </div>
                
                <!-- Footer del modal -->
                <div class="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-lg font-semibold text-gray-700">Total:</span>
                        <span class="text-2xl font-bold text-emerald-600" id="total-carrito">$0.00</span>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="vaciarCarrito()" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                            Vaciar Carrito
                        </button>
                        <button onclick="procesarCompra()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                            Finalizar Compra
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Actualizar contenido del carrito
    actualizarCarrito();
    
    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Función para cerrar el modal del carrito
window.cerrarModalCarrito = function() {
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Función para vaciar el carrito
window.vaciarCarrito = function() {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
        // Limpiar carrito global
        for (const id in carrito) {
            delete carrito[id];
        }
        
        guardarCarritoEnStorage(); // Limpiar localStorage
        
        // Restaurar todos los botones a "Agregar al Carrito"
        document.querySelectorAll('.envoltorio-boton').forEach(envoltorio => {
            const productoId = envoltorio.dataset.id;
            envoltorio.innerHTML = `
                <button class="btn-agregar w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:transform active:scale-[0.98] flex items-center justify-center gap-2" data-id="${productoId}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                    
                </button>
            `;
        });
        
        actualizarCarrito();
        mostrarNotificacion('Carrito vaciado', 'info');
    }
}

// Función para validar carrito antes de procesar compra
function validarCarrito() {
    console.log('🔍 Validando carrito...');
    
    const productosEnCarrito = Object.keys(carrito);
    if (productosEnCarrito.length === 0) {
        console.log('❌ Carrito vacío');
        return { valido: false, error: 'El carrito está vacío' };
    }
    
    let total = 0;
    const errores = [];
    
    for (const id in carrito) {
        const item = carrito[id];
        
        // Validar que el item tenga los datos necesarios
        if (!item.id || !item.nombre || isNaN(item.precio) || !item.cantidad) {
            errores.push(`Producto ${item.nombre || id} tiene datos incompletos`);
            continue;
        }
        
        // Validar precio positivo
        if (item.precio <= 0) {
            errores.push(`Producto ${item.nombre} tiene precio inválido`);
            continue;
        }
        
        // Validar cantidad positiva
        if (item.cantidad <= 0) {
            errores.push(`Producto ${item.nombre} tiene cantidad inválida`);
            continue;
        }
        
        total += item.precio * item.cantidad;
    }
    
    if (errores.length > 0) {
        console.log('❌ Errores de validación:', errores);
        return { valido: false, error: errores.join(', ') };
    }
    
    if (total <= 0) {
        console.log('❌ Total inválido:', total);
        return { valido: false, error: 'Total de compra inválido' };
    }
    
    console.log('✅ Carrito válido - Total:', total);
    return { valido: true, total };
}

// Función para actualizar el stock de productos después de una venta
async function actualizarStockDespuesDeVenta(productosVenta) {
    console.log('📦 Iniciando actualización de stock para', productosVenta.length, 'productos');
    
    try {
        // Actualizar stock en el backend para cada producto vendido
        for (const productoVenta of productosVenta) {
            try {
                console.log(`🔄 Actualizando stock del producto ${productoVenta.nombre} (ID: ${productoVenta.producto_id})`);
                
                // Buscar el producto en la lista global para obtener el stock actual
                const productoEnLista = productosGlobal.find(p => String(p.id) === String(productoVenta.producto_id));
                
                if (!productoEnLista) {
                    console.warn(`⚠️ Producto ${productoVenta.producto_id} no encontrado en lista global`);
                    continue;
                }
                
                const stockActual = productoEnLista.stock;
                const cantidadVendida = productoVenta.cantidad;
                const nuevoStock = Math.max(0, stockActual - cantidadVendida); // No permitir stock negativo
                
                console.log(`📊 Producto: ${productoVenta.nombre}, Stock actual: ${stockActual}, Vendido: ${cantidadVendida}, Nuevo stock: ${nuevoStock}`);
                
                // Actualizar en el backend si existe el endpoint
                if (ENDPOINTS.productos?.actualizar) {
                    try {
                        await fetchAPI(ENDPOINTS.productos.actualizar(productoVenta.producto_id), {
                            method: 'PUT',
                            body: JSON.stringify({
                                stock: nuevoStock
                            })
                        });
                        console.log(`✅ Stock actualizado en backend para producto ${productoVenta.producto_id}`);
                    } catch (error) {
                        console.warn(`⚠️ No se pudo actualizar stock en backend para ${productoVenta.producto_id}:`, error);
                    }
                }
                
                // Actualizar el stock localmente en productosGlobal
                productoEnLista.stock = nuevoStock;
                
                // Actualizar el stock en el carrito si el producto todavía está ahí
                if (carrito[productoVenta.producto_id]) {
                    carrito[productoVenta.producto_id].stock = nuevoStock;
                }
                
            } catch (error) {
                console.error(`💥 Error al actualizar stock del producto ${productoVenta.producto_id}:`, error);
            }
        }
        
        // Refrescar la visualización de productos para mostrar el nuevo stock
        console.log('🔄 Refrescando visualización de productos con nuevo stock...');
        await mostrarProductos(productosGlobal);
        
        console.log('✅ Actualización de stock completada');
        
    } catch (error) {
        console.error('💥 Error general al actualizar stock:', error);
        mostrarNotificacion('Advertencia: No se pudo actualizar el stock de algunos productos', 'error');
    }
}

// Función para procesar la compra con modal de confirmación y registro en backend
window.procesarCompra = async function() {
    console.log('🛒 Iniciando proceso de compra...');
    
    // Validar carrito antes de proceder
    const validacion = validarCarrito();
    if (!validacion.valido) {
        console.log('❌ Validación fallida:', validacion.error);
        mostrarNotificacion(validacion.error, 'error');
        return;
    }
    
    const totalProductos = Object.keys(carrito).length;
    console.log('Productos en carrito:', totalProductos);

    // Cerrar modal del carrito
    cerrarModalCarrito();

    // Verificar si ya existe un modal
    const modalExistente = document.querySelector('.modal-confirmacion');
    if (modalExistente) {
        console.log('⚠️ Modal ya existe, removiendo...');
        modalExistente.remove();
    }

    // Calcular total y preparar datos de venta
    let total = 0;
    const productosVenta = [];
    
    console.log('📊 Calculando total y preparando datos...');
    
    for (const id in carrito) {
        const item = carrito[id];
        console.log(`Procesando item: ${item.nombre} x${item.cantidad} @ $${item.precio}`);
        
        total += item.precio * item.cantidad;
        productosVenta.push({
            producto_id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: Number(item.precio),
            subtotal: Number(item.precio * item.cantidad)
        });
    }
    
    console.log('💰 Total calculado:', total);
    console.log('📦 Productos para venta:', productosVenta);
    
    // Obtener información del usuario logueado
    const infoUsuario = obtenerInfoUsuario();
    console.log('🔍 Info completa del usuario:', infoUsuario);
    
    // Verificar token para debug
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔑 Payload completo del token:', payload);
        } catch (error) {
            console.error('❌ Error al decodificar token:', error);
        }
    }
    
    const nombreUsuario = infoUsuario ? infoUsuario.nombre : 'Cliente';
    console.log('👤 Usuario logueado:', nombreUsuario);

    // Crear modal HTML
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-confirmacion fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4';
    
    modalContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div class="p-6">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-green-600">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 text-center mb-2">
                    Confirmar Pedido
                </h2>
                <p class="text-gray-600 text-center mb-2">
                    ¿Deseas procesar esta compra?
                </p>
                <p class="text-emerald-600 font-medium text-center mb-6">
                    Cliente: ${nombreUsuario}
                </p>
                
                <div class="bg-gray-50 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
                    ${Object.entries(carrito).map(([id, item]) => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div class="flex-1">
                                <p class="font-medium text-sm">${item.nombre}</p>
                                <p class="text-gray-500 text-xs">${item.cantidad}x @ $${Number(item.precio).toFixed(2)}</p>
                            </div>
                            <span class="font-bold text-sm">$${(item.precio * item.cantidad).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex justify-between items-center bg-emerald-50 p-4 rounded-lg mb-6">
                    <span class="text-lg font-semibold text-gray-700">Total:</span>
                    <span class="text-xl font-bold text-emerald-600">$${total.toFixed(2)}</span>
                </div>
                
                <div class="flex gap-3">
                    <button class="cancelar-compra flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button class="confirmar-pedido-final flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <div class="loading-spinner hidden animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span class="button-text">Confirmar</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Agregar modal al DOM
    document.body.appendChild(modalContainer);
    console.log('✅ Modal creado y agregado al DOM');

    // Event listener para cancelar
    const botonCancelar = modalContainer.querySelector('.cancelar-compra');
    botonCancelar.addEventListener('click', () => {
        console.log('❌ Compra cancelada por el usuario');
        modalContainer.remove();
    });

    // Event listener para confirmar compra
    const botonConfirmar = modalContainer.querySelector('.confirmar-pedido-final');
    botonConfirmar.addEventListener('click', async () => {
        const spinner = botonConfirmar.querySelector('.loading-spinner');
        const textoBoton = botonConfirmar.querySelector('.button-text');
        
        try {
            console.log('🔄 Iniciando confirmación de compra...');
            
            // Deshabilitar botones y mostrar loading
            botonConfirmar.disabled = true;
            botonCancelar.disabled = true;
            spinner.classList.remove('hidden');
            textoBoton.textContent = 'Procesando...';
            
            // Datos de la venta para el backend
            const ventaData = {
                fecha: new Date().toISOString(),
                total: Number(total.toFixed(2)),
                estado: 'completada',
                productos: productosVenta,
                usuario_id: localStorage.getItem('usuario_id') || localStorage.getItem('userId') || null,
                metodo_pago: 'efectivo',
                notas: `Venta realizada desde el kiosco web - ${productosVenta.length} productos`
            };
            
            console.log('📊 Datos de venta preparados:', ventaData);
            
            // Intentar registrar la venta en el backend
            let ventaRegistrada = false;
            try {
                console.log('📡 Enviando venta al backend...');
                const ventaCreada = await fetchAPI(ENDPOINTS.ventas.crear, {
                    method: 'POST',
                    body: JSON.stringify(ventaData)
                });
                
                console.log('✅ Venta registrada exitosamente:', ventaCreada);
                mostrarNotificacion('¡Venta registrada en el sistema!', 'success');
                ventaRegistrada = true;
                
            } catch (error) {
                console.warn('⚠️ Error al registrar venta en backend:', error);
                console.warn('Continuando con el proceso local...');
                mostrarNotificacion('Compra procesada (sin registro en sistema)', 'info');
            }
            
            // Simular delay para mejor UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // **NUEVA LÓGICA: Actualizar stock de productos después de la venta**
            console.log('📦 Actualizando stock de productos vendidos...');
            await actualizarStockDespuesDeVenta(productosVenta);
            
            // Limpiar carrito
            console.log('🧹 Limpiando carrito...');
            const productosEliminados = Object.keys(carrito).length;
            
            for (const id in carrito) {
                delete carrito[id];
            }
            
            // Guardar carrito vacío
            guardarCarritoEnStorage();
            
            // Restaurar todos los botones de productos
            console.log('🔄 Restaurando botones de productos...');
            document.querySelectorAll('.envoltorio-boton').forEach(envoltorio => {
                const productoId = envoltorio.dataset.id;
                envoltorio.innerHTML = `
                    <button class="btn-agregar w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:transform active:scale-[0.98] flex items-center justify-center gap-2" data-id="${productoId}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                        </svg>
                        
                    </button>
                `;
            });
            
            // Actualizar contador de carrito
            const contador = document.querySelector('.absolute.-top-1.-right-1 span');
            if (contador) {
                contador.textContent = '0';
            }
            
            // Actualizar carrito visual
            actualizarCarrito();
            
            // Remover modal
            modalContainer.remove();
            
            // Mostrar mensaje de éxito
            const mensajeExito = ventaRegistrada 
                ? `¡Compra realizada con éxito! ${productosEliminados} productos procesados.`
                : `¡Compra procesada! ${productosEliminados} productos.`;
                
            mostrarNotificacion(mensajeExito, 'success');
            
            // Generar factura con nombre del usuario
            setTimeout(() => {
                generarFactura(productosVenta, total, nombreUsuario, ventaRegistrada);
            }, 2000);
            
            console.log('🎉 Compra completada exitosamente');
            
        } catch (error) {
            console.error('💥 Error crítico al procesar compra:', error);
            
            // Restaurar botones
            botonConfirmar.disabled = false;
            botonCancelar.disabled = false;
            spinner.classList.add('hidden');
            textoBoton.textContent = 'Reintentar';
            
            mostrarNotificacion('Error al procesar la compra. Intenta nuevamente.', 'error');
        }
    });

    // Cerrar modal al hacer clic en el overlay
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            console.log('👆 Modal cerrado por click en overlay');
            modalContainer.remove();
        }
    });
}

// Función para generar y mostrar factura con nombre del usuario
function generarFactura(productos, total, nombreUsuario, registrada = false) {
    console.log('🧾 Generando factura para:', nombreUsuario);
    
    // Remover factura existente si la hay
    const facturaExistente = document.querySelector('.modal-factura');
    if (facturaExistente) {
        facturaExistente.remove();
    }
    
    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const numeroFactura = `FCT-${Date.now()}`;
    
    const modalFactura = document.createElement('div');
    modalFactura.className = 'modal-factura fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4';
    
    modalFactura.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <!-- Header de la factura -->
            <div class="bg-emerald-600 text-white p-6 rounded-t-xl">
                <div class="text-center">
                    <h1 class="text-2xl font-bold mb-2">The Kiosco</h1>
                    <p class="text-emerald-100">Factura de Compra</p>
                </div>
                <div class="flex justify-between items-center mt-4 text-sm">
                    <div>
                        <p><strong>Factura:</strong> ${numeroFactura}</p>
                        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                    </div>
                    <div class="text-right">
                        <p><strong>Cliente:</strong></p>
                        <p class="text-lg font-semibold">${nombreUsuario}</p>
                    </div>
                </div>
            </div>
            
            <!-- Contenido de la factura -->
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-800">Detalle de Productos</h3>
                
                <div class="space-y-3 mb-6">
                    ${productos.map(producto => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <div class="flex-1">
                                <p class="font-medium text-gray-800">${producto.nombre}</p>
                                <p class="text-sm text-gray-500">${producto.cantidad} x $${producto.precio_unitario.toFixed(2)}</p>
                            </div>
                            <span class="font-semibold text-gray-800">$${producto.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Totales -->
                <div class="border-t-2 border-gray-200 pt-4">
                    <div class="flex justify-between items-center text-lg">
                        <span class="font-semibold text-gray-700">Subtotal:</span>
                        <span class="font-bold">$${total.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center text-lg">
                        <span class="font-semibold text-gray-700">Impuestos:</span>
                        <span class="font-bold">$0.00</span>
                    </div>
                    <div class="flex justify-between items-center text-xl border-t pt-2 mt-2">
                        <span class="font-bold text-gray-800">TOTAL:</span>
                        <span class="font-bold text-emerald-600">$${total.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- Estado y notas -->
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="font-medium text-green-700">
                            ${registrada ? 'Compra Registrada en Sistema' : 'Compra Procesada'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">
                        ${registrada 
                            ? 'Su compra ha sido registrada exitosamente en nuestro sistema.'
                            : 'Su compra ha sido procesada correctamente.'
                        }
                    </p>
                </div>
                
                <!-- Botones de acción -->
                <div class="mt-6 flex gap-3">
                    <button onclick="imprimirFactura()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-14.326 0C3.768 7.44 3 8.375 3 9.456v6.294a2.25 2.25 0 0 0 2.25 2.25h1.091m-3.159-14.83c.165-.184.374-.316.611-.317 6.696-.025 13.304-.025 20 0 .237.001.446.133.61.317m-21.221 15.46c.165.184.374.316.611.317 6.696.025 13.304.025 20 0 .237-.001.446-.133.61-.317" />
                        </svg>
                        Imprimir
                    </button>
                    <button onclick="cerrarFactura()" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
                        Continuar Comprando
                    </button>
                </div>
                
                <!-- Footer -->
                <div class="mt-6 text-center text-sm text-gray-500">
                    <p>¡Gracias por su compra, ${nombreUsuario}!</p>
                    <p class="mt-1">The Kiosco - Su tienda de confianza</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalFactura);
    console.log('✅ Factura generada y mostrada');
    
    // Cerrar modal al hacer clic en el overlay
    modalFactura.addEventListener('click', (e) => {
        if (e.target === modalFactura) {
            modalFactura.remove();
        }
    });
}

// Función para imprimir factura
window.imprimirFactura = function() {
    window.print();
}

// Función para cerrar factura
window.cerrarFactura = function() {
    const modalFactura = document.querySelector('.modal-factura');
    if (modalFactura) {
        modalFactura.remove();
    }
}

// Función para verificar y sincronizar stock con el backend
async function sincronizarStockConBackend() {
    console.log('🔄 Sincronizando stock con el backend...');
    
    try {
        // Obtener productos actualizados del backend
        const resultado = await obtenerProductos();
        
        if (resultado.productos && resultado.productos.length > 0) {
            // Actualizar el stock en cualquier producto que esté en el carrito
            for (const id in carrito) {
                const productoActualizado = resultado.productos.find(p => String(p.id) === String(id));
                
                if (productoActualizado) {
                    const stockAnterior = carrito[id].stock;
                    carrito[id].stock = productoActualizado.stock;
                    
                    // Si el producto en el carrito tiene más cantidad que el stock disponible
                    if (carrito[id].cantidad > productoActualizado.stock) {
                        if (productoActualizado.stock === 0) {
                            // Si no hay stock, eliminar del carrito
                            console.warn(`⚠️ Producto ${carrito[id].nombre} sin stock, eliminando del carrito`);
                            delete carrito[id];
                            mostrarNotificacion(`Producto removido por falta de stock`, 'info');
                        } else {
                            // Ajustar cantidad al stock disponible
                            console.warn(`⚠️ Ajustando cantidad de ${carrito[id].nombre} de ${carrito[id].cantidad} a ${productoActualizado.stock}`);
                            carrito[id].cantidad = productoActualizado.stock;
                            mostrarNotificacion(`Cantidad de ${carrito[id].nombre} ajustada por stock limitado`, 'info');
                        }
                    }
                    
                    if (stockAnterior !== productoActualizado.stock) {
                        console.log(`📊 Stock actualizado para ${carrito[id]?.nombre || id}: ${stockAnterior} → ${productoActualizado.stock}`);
                    }
                }
            }
            
            // Guardar carrito actualizado
            guardarCarritoEnStorage();
            actualizarCarrito();
            actualizarContadorCarrito();
            
            console.log('✅ Sincronización de stock completada');
        }
        
    } catch (error) {
        console.error('❌ Error al sincronizar stock:', error);
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", async () => {
    const currentPage = window.location.pathname.split("/").pop();
    console.log('🚀 Inicializando aplicación para página:', currentPage);

    // Para páginas administrativas, verificar autenticación
    const paginasAdmin = ['administracion.html', 'inventario.html', 'usuarios.html', 'ventas.html'];
    if (paginasAdmin.includes(currentPage)) {
        console.log('🔐 Página administrativa, verificando autenticación...');
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ Sin autenticación, redirigiendo al login...');
            window.location.href = './login.html';
            return;
        }
        
        // Verificar si es administrador
        if (!verificarEsAdministrador()) {
            console.log('❌ Usuario no es administrador, redirigiendo...');
            mostrarNotificacion('Acceso denegado. Se requieren permisos de administrador.', 'error');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 2000);
            return;
        }
        
        console.log('✅ Usuario administrador verificado');
    }

    // Mostrar/ocultar botón de administración (solo si es admin)
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin && verificarEsAdministrador()) {
        btnAdmin.classList.remove('hidden');
    }

    // Botón de cerrar sesión (solo mostrar si está logueado)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        const token = localStorage.getItem('token');
        if (token) {
            btnLogout.addEventListener('click', cerrarSesion);
        } else {
            // Si no está logueado, ocultar el botón o cambiarlo por "Login"
            if (currentPage === "" || currentPage === "index.html") {
                btnLogout.innerHTML = `
                    <a href="./login.html" class="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md active:transform active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 md:w-6 md:h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H6" />
                        </svg>
                    </a>
                `;
            }
        }
    }

    // Botón del carrito (disponible sin login)
    const btnCarrito = document.querySelector('button.relative');
    if (btnCarrito) {
        btnCarrito.addEventListener('click', abrirModalCarrito);
    }

    // Cargar carrito desde localStorage (sin requerir login)
    cargarCarritoDesdeStorage();
    actualizarContadorCarrito();
    
    // Sincronizar stock con el backend si hay productos en el carrito
    if (Object.keys(carrito).length > 0) {
        await sincronizarStockConBackend();
    }

    // Inicializar según la página actual
    if (currentPage === "" || currentPage === "index.html") {
        console.log('🏠 Inicializando página principal (acceso libre)...');
        
        try {
            // Mostrar indicador de carga inicial
            const seccionProductos = document.querySelector('.productos');
            if (seccionProductos) {
                seccionProductos.innerHTML = `
                    <div class="col-span-full flex justify-center items-center py-12">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Cargando productos...</h3>
                            <p class="text-gray-500">Conectando con el servidor</p>
                        </div>
                    </div>
                `;
            }
            
            // Inicializar en paralelo para mejor rendimiento
            console.log('⚡ Iniciando carga paralela de datos...');
            
            const [categorias, productos] = await Promise.allSettled([
                cargarCategorias(),
                obtenerProductos()
            ]);
            
            // Manejar resultados de categorías
            if (categorias.status === 'fulfilled') {
                console.log('✅ Categorías cargadas exitosamente');
            } else {
                console.warn('⚠️ Error al cargar categorías:', categorias.reason);
            }
            
            // Manejar resultados de productos
            if (productos.status === 'fulfilled') {
                console.log('✅ Productos obtenidos exitosamente');
                
                if (productos.value && productos.value.productos) {
                    await mostrarProductos(productos.value.productos);
                } else {
                    await mostrarProductos();
                }
                
                // Configurar funcionalidades después de cargar productos
                await filtrarPorCategoria();
                configurarBusqueda();
                
                console.log('🎉 Inicialización de página principal completada');
                
            } else {
                console.error('❌ Error crítico al cargar productos:', productos.reason);
                
                // Mostrar error en la interfaz
                if (seccionProductos) {
                    seccionProductos.innerHTML = `
                        <div class="col-span-full text-center py-12">
                            <div class="text-red-500 text-6xl mb-4">⚠️</div>
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">Error de conexión</h3>
                            <p class="text-gray-600 mb-4">No se pudo conectar con el servidor</p>
                            <p class="text-sm text-gray-500 mb-6">${productos.reason?.message || 'Error desconocido'}</p>
                            <button onclick="location.reload()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
                                🔄 Reintentar
                            </button>
                        </div>
                    `;
                }
                
                mostrarNotificacion('Error al conectar con el servidor', 'error');
            }
            
        } catch (error) {
            console.error('💥 Error fatal en inicialización:', error);
            mostrarNotificacion('Error fatal al inicializar la aplicación', 'error');
        }
        
    } else if (currentPage === "inventario.html") {
        console.log('📦 Iniciando gestión de inventario...');
        inicializarProductos();
    } else if (currentPage === "usuarios.html") {
        console.log('👥 Iniciando gestión de usuarios...');
        inicializarUsuarios();
    } else if (currentPage === "ventas.html") {
        console.log('💰 Iniciando gestión de ventas...');
        inicializarVentas();
    }
});