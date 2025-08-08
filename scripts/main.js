import { ENDPOINTS, fetchAPI } from './config.js';
import { verificarEsAdministrador, cerrarSesion, obtenerInfoUsuario } from './auth.js';
import { inicializarProductos } from './productos.js';
import { inicializarUsuarios } from './usuarios.js';
import { crearVenta } from './ventas.js'; // Importar función crearVenta


// Función helper para capitalizar texto
function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Función para obtener la URL de imagen del producto
function obtenerImagenProducto(idProducto, nombreProducto = '') {
    // Mapeo directo usando los nombres reales de las imágenes
    const mapeoImagenes = {
        1: '1.jpg',      // Arroz Extra
        2: '2.jpg',      // Aceite Vegetal  
        3: '3.png',      // Leche Entera
        4: '4.jpg',      // Huevos
        5: '5.jpg',      // Pan Integral
        6: '6.jpg',      // Pollo Entero
        7: '7.jpg',      // Atún en Lata
        8: '8.jpg',      // Manzanas
        9: '9.jpg',      // Plátanos
        10: '10.jpg',    // Yogur Natural
        11: '11.jpg',    // Queso Fresco
        12: '12.jpg',    // Jabón Líquido
        13: '13.jpg',    // Papel Higiénico
        14: '14.jpg',    // Cereal Integral
        15: '15.jpg',    // Galletas de Avena
        16: '16.jpg',    // Refresco Cola
        17: '17.jpg',    // Agua Mineral
        18: '18.jpg',    // Chocolate Negro
        19: '19.jpg',    // Pasta Dental
        20: '20.jpg',    // Detergente
        21: '21.png',    // Saladitas
        23: '23.jpg',    // Chorizo Parrillero
        34: '34.jpeg'    // Mandarina
    };
    
    // Retornar la imagen mapeada o imagen por defecto
    const imagenMapeada = mapeoImagenes[idProducto];
    return imagenMapeada ? `imagenes/${imagenMapeada}` : `imagenes/1.jpg`;
}

// Función para verificar si una imagen existe y usar fallback
function verificarYCargarImagen(img, idProducto) {
    const extensiones = ['jpg', 'png'];
    let intentoActual = 0;
    
    function intentarCargar() {
        if (intentoActual >= extensiones.length) {
            // Si no hay imagen, usar imagen por defecto
            img.src = 'imagenes/1.jpg';
            img.alt = 'Producto sin imagen';
            return;
        }
        
        const urlImagen = `imagenes/${idProducto}.${extensiones[intentoActual]}`;
        img.src = urlImagen;
        
        img.onload = function() {
            // Imagen cargada exitosamente
            console.log(`✅ Imagen cargada: ${urlImagen}`);
        };
        
        img.onerror = function() {
            intentoActual++;
            intentarCargar();
        };
    }
    
    intentarCargar();
}

// Variable global para controlar el estado del modal del carrito
window.modalCarritoAbierto = false;

// Función global para limpiar sesión corrupta
window.limpiarSesionCorrupta = function() {
    console.log('🧹 Limpiando sesión corrupta manualmente...');
    
    // Limpiar todo lo relacionado con la sesión
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('urlRegreso');
    
    // Limpiar carrito también por si acaso
    localStorage.removeItem('carrito');
    window.carrito = {};
    
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('Sesión limpiada correctamente. Puedes intentar iniciar sesión de nuevo.', 'success');
    } else {
        console.log('✅ Sesión limpiada correctamente. Puedes intentar iniciar sesión de nuevo.');
    }
    
    // Recargar la página después de un momento
    setTimeout(() => {
        window.location.reload();
    }, 2000);
};

// Función global para probar login directamente
window.probarLogin = async function(usuario = 'admin', password = 'admin123') {
    console.log('🧪 Probando login con:', usuario, '/ password length:', password.length);
    
    try {
        const response = await fetch('https://funval-backend.onrender.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_usuario: usuario,
                contraseña: password
            })
        });
        
        console.log('📡 Status:', response.status);
        console.log('📡 Status Text:', response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Login exitoso:', data);
            return data;
        } else {
            const errorData = await response.text();
            console.log('❌ Error response:', errorData);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('🚨 Error en prueba de login:', error);
        throw error;
    }
};

// Mapeo de IDs alfanuméricos a numéricos
window.mapaIds = new Map();
let contadorId = 1000; // Empezar desde 1000 para evitar conflictos

// Función para obtener o crear ID numérico
function obtenerIdNumerico(idOriginal) {
    // Si es un número válido (mayor que 0), devolverlo directamente
    if (typeof idOriginal === 'number' && idOriginal > 0) {
        return idOriginal;
    }
    
    const idString = String(idOriginal);
    
    // Si es un string que representa un número válido (como "1", "2", etc.)
    const numeroDirecto = parseInt(idString);
    if (!isNaN(numeroDirecto) && numeroDirecto > 0 && String(numeroDirecto) === idString) {
        return numeroDirecto;
    }
    
    // Si ya existe en el mapa, devolverlo (pero verificar que sea > 0)
    if (window.mapaIds.has(idString)) {
        const idMapeado = window.mapaIds.get(idString);
        if (idMapeado > 0) {
            return idMapeado;
        }
    }
    
    // Intentar extraer número del ID (para casos como "temp-1", "producto-5", etc.)
    const match = idString.match(/\d+/);
    if (match) {
        const numeroExtraido = parseInt(match[0]);
        // Asegurar que el número extraído sea mayor que 0
        const idFinal = numeroExtraido > 0 ? numeroExtraido : contadorId++;
        window.mapaIds.set(idString, idFinal);
        return idFinal;
    }
    
    // Si no hay número, asignar uno nuevo
    const nuevoId = contadorId++;
    window.mapaIds.set(idString, nuevoId);
    return nuevoId;
}

// Poblar el select de categorías dinámicamente
function poblarSelectCategorias(productos) {
    const select = document.getElementById('categorias');
    if (!select) {
        console.log('⚠️ Select de categorías no encontrado');
        return;
    }
    
    // Guardar la selección actual
    const seleccionActual = select.value;
    
    // Extraer categorías únicas y capitalizarlas
    const categoriasUnicas = [...new Set(productos.map(p => capitalize(p.categoria)).filter(Boolean))];
    console.log('📋 Categorías únicas encontradas:', categoriasUnicas);
    
    select.innerHTML = '<option value="">Todas las categorías</option>';
    categoriasUnicas.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    
    // Restaurar la selección anterior si existe
    if (seleccionActual && categoriasUnicas.includes(seleccionActual)) {
        select.value = seleccionActual;
        console.log('🔄 Restaurada selección de categoría:', seleccionActual);
    }
}
let productosGlobal = [];

// Verificar autenticación al cargar la página
function verificarAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }
    
    try {
        // Verificar si el token es válido (básico)
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (tokenData.exp && tokenData.exp < now) {
            localStorage.removeItem('token');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar token:', error);
        localStorage.removeItem('token');
        return false;
    }
}

// Función para verificar acceso a páginas protegidas
function verificarAccesoProtegido() {
    // Verificar autenticación y rol en todas las páginas protegidas
    const path = window.location.pathname.split('/').pop();
    const isProtected = ["administracion.html", "inventario.html", "usuarios.html", "ventas.html"].includes(path);
    
    if (isProtected && !verificarAuth()) {
        window.location.href = "login.html";
        return;
    }
    
    // Botón de administración solo para administradores
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin) {
        if (verificarEsAdministrador()) {
            btnAdmin.classList.remove('hidden');
        } else {
            btnAdmin.classList.add('hidden');
        }
    }
}



// Función para obtener productos del backend
async function obtenerProductos(categoria = null, pagina = 1) {
    try {
        console.log('🔍 Obteniendo productos..., categoría:', categoria, 'página:', pagina);
        
        let endpoint = ENDPOINTS.productos.listar;
        
        // Si hay una categoría específica, usar el endpoint correspondiente
        if (categoria && categoria !== '' && categoria !== 'todos') {
            // La categoría ya viene capitalizada del select
            endpoint = ENDPOINTS.productos.porCategoria(categoria);
            console.log('🎯 Usando endpoint de categoría:', categoria);
        }
        
        console.log('📡 Endpoint a llamar:', endpoint);
        
        try {
            const data = await fetchAPI(endpoint);
            console.log('🔄 Respuesta del backend:', data);
            
            // Manejar diferentes formatos de respuesta del backend
            let productos = [];
            
            if (Array.isArray(data)) {
                productos = data;
            } else if (data.productos && Array.isArray(data.productos)) {
                productos = data.productos;
            } else if (data.data && Array.isArray(data.data)) {
                productos = data.data;
            } else {
                throw new Error('Formato de respuesta inválido del servidor');
            }
            
            // Validar y normalizar productos del backend
            const productosNormalizados = productos.map((producto, index) => {
                const idExtraido = producto.id_producto || producto.id || producto._id || producto.ID || `temp-${index}`;
                
                return {
                    id: idExtraido,
                    nombre: producto.nombre || producto.name || producto.title || 'Producto sin nombre',
                    descripcion: producto.descripcion || producto.description || 'Sin descripción disponible',
                    precio: Number(producto.precio || producto.price || producto.cost || 0),
                    stock: Number(producto.stock || producto.quantity || producto.available || 0),
                    categoria: producto.categoria || producto.category || 'general',
                    imagen: obtenerImagenProducto(idExtraido)
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
            
            // Ordenar productos por ID de menor a mayor
            const productosOrdenados = productosValidos.sort((a, b) => {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idA - idB;
            });
            
            console.log(`✅ Productos cargados y ordenados del backend: ${productosOrdenados.length} productos válidos`);
            console.log('📋 Orden de productos:', productosOrdenados.slice(0, 5).map(p => `ID: ${p.id}, Nombre: ${p.nombre}`));
            
            productosGlobal = productosOrdenados;
            // Poblar el select de categorías solo si no se está filtrando
            if (!categoria || categoria === '' || categoria === 'todos') {
                poblarSelectCategorias(productosOrdenados);
            }
            return { success: true, productos: productosOrdenados };
            
        } catch (backendError) {

                console.warn('⚠️ Backend no disponible, usando productos locales:', backendError.message);
            }
        }
        catch (error) {
            console.error('❌ Error general en obtenerProductos:', error);
            return { success: false, error: error.message };
        }
    }

    // Función para actualizar contador del carrito
        

// Función para actualizar contador del carrito
window.actualizarContadorCarrito = function() {
    const stored = localStorage.getItem('carrito');
    let items = [];
    try { items = JSON.parse(stored || '[]'); } catch { items = []; }
    if (!Array.isArray(items)) items = Object.values(items || {});
    const cantidadTotal = items.reduce((acc, it) => acc + Number(it?.cantidad || 0), 0);
    // Badge selector: the small red circle inside #btn-carrito
    const badge = document.querySelector('#btn-carrito span');
    if (badge) {
        badge.textContent = String(cantidadTotal);
        badge.style.display = cantidadTotal > 0 ? 'flex' : 'none';
    }
}

// Función para filtrar por categoría
async function filtrarPorCategoria() {
    const selectCategoria = document.getElementById('categorias');
    if (!selectCategoria) {
        console.log('⚠️ Select de categorías no encontrado');
        return;
    }

    selectCategoria.addEventListener('change', async () => {
        const categoriaSeleccionada = selectCategoria.value;
        console.log('🏷️ Categoría seleccionada:', categoriaSeleccionada);
        console.log('🏷️ Tipo de categoría:', typeof categoriaSeleccionada);
        console.log('🏷️ Length de categoría:', categoriaSeleccionada.length);
        
        try {
            // Mostrar indicador de carga
            const seccionProductos = document.querySelector('.productos');
            if (seccionProductos) {
                seccionProductos.innerHTML = `
                    <div class="col-span-full flex justify-center items-center py-12">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                            <p class="text-gray-500 text-sm">Filtrando productos...</p>
                        </div>
                    </div>
                `;
            }
            
            // Si no hay categoría seleccionada o es "todas", mostrar todos los productos
            if (!categoriaSeleccionada || categoriaSeleccionada === '') {
                console.log('📋 Mostrando todos los productos');
                const resultado = await obtenerProductos();
                if (resultado.success) {
                    await mostrarProductos(resultado.productos);
                    console.log(`✅ Mostrando todos los productos (${resultado.productos.length})`);
                } else {
                    throw new Error(resultado.error || 'Error al obtener productos');
                }
                return;
            }
            
            // Filtrar por categoría específica
            console.log('🎯 Filtrando por categoría:', categoriaSeleccionada);
            
            // Intentar filtrar usando el backend primero
            try {
                const resultado = await obtenerProductos(categoriaSeleccionada, 1);
                
                if (!resultado.success) {
                    throw new Error(resultado.error || 'Backend no soporta filtro por categoría');
                }
                
                // Si el backend devuelve los mismos productos que antes, usar filtro local
                if (resultado.productos.length === productosGlobal.length) {
                    throw new Error('Backend no filtró, usando filtro local');
                }
                
                // Mostrar productos filtrados del backend
                await mostrarProductos(resultado.productos);
                console.log(`✅ Backend filtrado: ${resultado.productos.length} productos de "${categoriaSeleccionada}"`);
                
                if (resultado.productos.length === 0) {
                    mostrarNotificacion(`No hay productos en la categoría "${categoriaSeleccionada}"`, 'info');
                }
                
            } catch (backendError) {
                console.log('🔄 Backend no soporta filtro, usando filtro local:', backendError.message);
                
                // Asegurar que tenemos productos globales para filtrar
                if (productosGlobal.length === 0) {
                    console.log('⚠️ No hay productos globales, recargando...');
                    const resultadoCompleto = await obtenerProductos();
                    if (resultadoCompleto.success) {
                        productosGlobal = resultadoCompleto.productos;
                    }
                }
                
                console.log('📊 Productos globales disponibles:', productosGlobal.length);
                console.log('📊 Categorías disponibles:', [...new Set(productosGlobal.map(p => p.categoria))]);
                
                // Fallback: filtrar localmente
                const productosFiltrados = productosGlobal.filter(producto => {
                    const coincide = producto.categoria && 
                           producto.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase();
                    if (coincide) {
                        console.log('✅ Producto coincide:', producto.nombre, 'categoría:', producto.categoria);
                    }
                    return coincide;
                }).sort((a, b) => {
                    // Ordenar por ID de menor a mayor
                    const idA = parseInt(a.id) || 0;
                    const idB = parseInt(b.id) || 0;
                    return idA - idB;
                });
                
                await mostrarProductos(productosFiltrados);
                console.log(`✅ Filtro local: ${productosFiltrados.length} productos de "${categoriaSeleccionada}"`);
                
                if (productosFiltrados.length === 0) {
                    mostrarNotificacion(`No hay productos en la categoría "${categoriaSeleccionada}"`, 'info');
                }
            }
            
        } catch (error) {
            console.error('💥 Error al filtrar productos:', error);
            mostrarNotificacion('Error al aplicar filtro', 'error');
            
            // Fallback: mostrar todos los productos
            try {
                const resultado = await obtenerProductos();
                if (resultado.success) {
                    await mostrarProductos(resultado.productos);
                }
            } catch (fallbackError) {
                console.error('💥 Error en fallback:', fallbackError);
            }
        }
    });
}

// Variables globales del carrito
let carrito = {};

// Función para sincronizar el carrito entre main.js y tienda.js
function sincronizarCarrito() {
    // Siempre guardar como array en localStorage
    const carritoArray = Object.values(carrito);
    localStorage.setItem('carrito', JSON.stringify(carritoArray));
    window.actualizarContadorCarrito();
    if (typeof window.cargarProductosCarrito === 'function') {
        window.cargarProductosCarrito();
    }
}

// Función para agregar producto al carrito
window.agregarAlCarrito = function(producto) {
    console.log('🛒 Agregando producto al carrito:', producto);
    
    if (!producto || !producto.id) {
        console.error('❌ Producto inválido o sin ID:', producto);
        return;
    }
    
    if (!carrito[producto.id]) {
        carrito[producto.id] = { ...producto, cantidad: 1 };
        console.log('✅ Producto nuevo agregado:', carrito[producto.id]);
    } else {
        carrito[producto.id].cantidad += 1;
        console.log('✅ Cantidad incrementada:', carrito[producto.id]);
    }
    
    console.log('🛒 Estado del carrito después de agregar:', carrito);
    sincronizarCarrito();
    mostrarNotificacion('Producto agregado al carrito', 'success');
};

// Función para cambiar cantidad de producto en el carrito
window.cambiarCantidad = function(productoId, cambio) {
    if (!carrito[productoId]) return;
    carrito[productoId].cantidad += cambio;
    if (carrito[productoId].cantidad <= 0) {
        delete carrito[productoId];
    }
    sincronizarCarrito();
};

// Función para eliminar producto del carrito
window.eliminarDelCarrito = function(productoId) {
    if (carrito[productoId]) {
        delete carrito[productoId];
        sincronizarCarrito();
    }
};

// Función para vaciar el carrito
window.vaciarCarrito = function() {
    carrito = {};
    sincronizarCarrito();
    mostrarNotificacion('Carrito vaciado', 'info');
};

// Función para cargar carrito desde localStorage
function cargarCarritoDesdeStorage() {
    try {
        const carritoGuardado = localStorage.getItem('carrito');
        console.log('📦 Cargando carrito desde localStorage:', carritoGuardado);
        
        carrito = {};
        if (carritoGuardado) {
            const carritoData = JSON.parse(carritoGuardado);
            console.log('📦 Datos del carrito parseados:', carritoData);
            
            if (Array.isArray(carritoData)) {
                carritoData.forEach((producto, index) => {
                    console.log(`📦 Cargando producto ${index}:`, producto);
                    
                    // Verificar que el producto tenga ID
                    if (!producto.id) {
                        console.warn(`⚠️ Producto ${index} sin ID:`, producto);
                        return; // Saltar este producto
                    }
                    
                    carrito[producto.id] = producto;
                });
            } else if (typeof carritoData === 'object') {
                console.log('📦 Carrito es un objeto, copiando directamente...');
                for (const [key, producto] of Object.entries(carritoData)) {
                    console.log(`📦 Cargando producto con key ${key}:`, producto);
                    
                    // Asegurar que el producto tenga ID
                    if (!producto.id && key) {
                        console.log(`🔧 Asignando ID ${key} al producto sin ID`);
                        producto.id = key;
                    }
                    
                    carrito[key] = producto;
                }
            }
        }
        
        console.log('✅ Carrito cargado desde localStorage:', carrito);
        console.log('📊 Total de productos en carrito:', Object.keys(carrito).length);
        
    } catch (error) {
        console.error('❌ Error al cargar carrito desde localStorage:', error);
        carrito = {};
    }
    window.actualizarContadorCarrito();
}

// Función para sincronizar carrito con productos existentes
function sincronizarCarritoConProductos() {
    if (!productosGlobal || productosGlobal.length === 0) {
        console.log('⚠️ No hay productos globales para sincronizar el carrito');
        return;
    }
    
    console.log('🔄 Sincronizando carrito con productos existentes...');
    const idsExistentes = productosGlobal.map(p => String(p.id));
    let carritoLimpiado = false;
    let productosEliminados = [];
    
    Object.keys(carrito).forEach(idCarrito => {
        if (!idsExistentes.includes(String(idCarrito))) {
            console.warn(`🧹 Producto ${idCarrito} ya no existe, eliminando del carrito:`, carrito[idCarrito]);
            productosEliminados.push(carrito[idCarrito].nombre || `ID ${idCarrito}`);
            delete carrito[idCarrito];
            carritoLimpiado = true;
        }
    });
    
    if (carritoLimpiado) {
        console.log('✅ Carrito sincronizado, productos eliminados:', productosEliminados);
        guardarCarritoEnStorage();
        actualizarCarrito();
        window.actualizarContadorCarrito();
        
        if (productosEliminados.length > 0) {
            mostrarNotificacion(`Carrito actualizado: ${productosEliminados.length} producto(s) eliminado(s)`, 'info');
        }
    } else {
        console.log('✅ Carrito ya estaba sincronizado con productos existentes');
    }
}

// Función para guardar carrito en localStorage
function guardarCarritoEnStorage() {
    sincronizarCarrito();
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
                
                if (!resultado.success) {
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
                
                productos = resultado.productos || [];
                productosGlobal = productos;
                
                productos = resultado.productos;
            } else {
                productos = productosGlobal;
            }
        }

        console.log('✅ Productos para mostrar:', productos?.length || 0);
        console.log('📋 Lista de productos:', productos);

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
    // No actualizar el select de categorías aquí para evitar sobrescribir al filtrar
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
                
                // Determinar imagen usando el ID del producto
                const imagenProducto = obtenerImagenProducto(producto.id, producto.nombre);
                
                tarjetaProducto.innerHTML = `
                    <div class="relative overflow-hidden rounded-lg mb-4 bg-gray-50">
                        <img 
                            src="${imagenProducto}" 
                            alt="${producto.nombre}"
                            class="w-full h-40 object-cover object-center group-hover:scale-105 transition-transform duration-300 border-b border-gray-100"
                            onerror="this.src='imagenes/1.jpg'"
                        />
                        ${producto.stock <= 5 && producto.stock > 0 ? '<span class="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">Poco stock</span>' : ''}
                        ${producto.stock === 0 ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">Sin stock</span>' : ''}
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
            <div class="flex items-center gap-4 p-4 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50 transition-colors" data-item-id="${id}">
                <div class="flex-shrink-0 bg-gray-50 rounded-lg p-1">
                    <img src="${obtenerImagenProducto(item.id, item.nombre)}" 
                         alt="${item.nombre}" 
                         class="w-16 h-16 object-cover object-center rounded-lg border border-gray-100 shadow-sm"
                         onerror="this.src='imagenes/1.jpg'">
                </div>
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
    if (typeof window.actualizarContadorCarrito === 'function') {
        window.actualizarContadorCarrito();
    }
    
    console.log(`✅ Carrito actualizado: ${cantidad} productos, Total: $${total.toFixed(2)}`);
}

// Función para actualizar contador en producto específico
function actualizarContadorProducto(productoId) {
    console.log('🔄 Actualizando contador para producto:', productoId);
    
    if (!productoId || productoId === 'undefined') {
        console.warn('⚠️ ID de producto inválido:', productoId);
        return;
    }
    
    const envoltorio = document.querySelector(`.envoltorio-boton[data-id="${productoId}"]`);
    
    // Buscar el producto en el carrito usando el ID correcto
    const idEnCarrito = Object.keys(carrito).find(id => String(id) === String(productoId));
    
    if (envoltorio && idEnCarrito && carrito[idEnCarrito]) {
        envoltorio.innerHTML = crearContador(productoId, carrito[idEnCarrito].cantidad);
        console.log('✅ Contador actualizado para producto:', productoId);
    } else {
        console.log('❌ No se pudo actualizar contador para:', productoId, 'Envoltorio:', !!envoltorio, 'En carrito:', !!idEnCarrito);
    }
}

// Event listener principal para todos los botones del carrito
document.body.addEventListener('click', async (e) => {
    // No procesar clicks si estamos en la página de inventario
    if (window.location.pathname.includes('inventario.html')) {
        return;
    }
    
    const botonAgregar = e.target.closest('.btn-agregar');
    const botonSumar = e.target.closest('.btn-sumar');
    const botonRestar = e.target.closest('.btn-restar');
    const botonEliminar = e.target.closest('.btn-eliminar');

    if (botonAgregar) {
        const productoId = botonAgregar.dataset.id;
        
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
            console.log('🔍 ID del producto desde backend:', producto.id, 'Tipo:', typeof producto.id);
            console.log('🔍 ID convertido a string:', idRealProducto);
            
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
                // Crear nuevo producto en el carrito
                const nuevoProducto = {
                    id: producto.id, // Mantener ID original
                    nombre: producto.nombre || producto.name || producto.title || 'Producto sin nombre',
                    precio: Number(producto.precio || producto.price || producto.cost || 0),
                    imagen: obtenerImagenProducto(producto.id),
                    cantidad: 1,
                    stock: Number(producto.stock || producto.quantity || producto.available || 999)
                };
                
                console.log('🆕 Nuevo producto para carrito:', nuevoProducto);
                
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
                actualizarContadorProducto(productoId);
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
                actualizarContadorProducto(productoId);
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
        console.log('🔍 Debug carrito completo:', carrito);
        console.log('📋 Productos en carrito:', Object.keys(carrito));
        console.log('🔢 Tipos de IDs en carrito:', Object.keys(carrito).map(id => ({id, tipo: typeof id})));
        
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
            console.warn('🔍 Intentando limpiar carrito de productos inexistentes...');
            
            // Intentar limpiar el carrito de productos que ya no existen
            const idsExistentes = productosGlobal.map(p => String(p.id));
            let carritoLimpiado = false;
            
            Object.keys(carrito).forEach(idCarrito => {
                if (!idsExistentes.includes(String(idCarrito))) {
                    console.warn('🧹 Eliminando producto inexistente del carrito:', idCarrito, carrito[idCarrito]);
                    delete carrito[idCarrito];
                    carritoLimpiado = true;
                }
            });
            
            if (carritoLimpiado) {
                guardarCarritoEnStorage();
                actualizarCarrito();
                mostrarNotificacion('Carrito actualizado - productos eliminados', 'info');
            } else {
                mostrarNotificacion('Error: Producto no encontrado en el carrito', 'error');
            }
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
    if (!inputBusqueda) {
        console.log('⚠️ Input de búsqueda no encontrado');
        return;
    }
    
    let timeoutBusqueda = null;
    
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.trim();
        
        // Limpiar timeout anterior
        if (timeoutBusqueda) {
            clearTimeout(timeoutBusqueda);
        }
        
        // Debounce de 300ms para mejor responsividad
        timeoutBusqueda = setTimeout(async () => {
            console.log('🔍 Buscando:', termino);
            
            try {
                if (termino === '') {
                    // Si no hay término, mostrar todos los productos
                    console.log('📋 Mostrando todos los productos');
                    const resultado = await obtenerProductos();
                    if (resultado.success) {
                        await mostrarProductos(resultado.productos);
                        // Repoblar select de categorías con todos los productos
                        poblarSelectCategorias(resultado.productos);
                    }
                } else {
                    // Realizar búsqueda
                    console.log('🔎 Realizando búsqueda...');
                    
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
                    
                    // Primero intentar buscar en el backend
                    let productos = [];
                    try {
                        const url = new URL(ENDPOINTS.productos.listar);
                        url.searchParams.set('search', termino);
                        
                        console.log('📡 URL de búsqueda:', url.toString());
                        const data = await fetchAPI(url.toString());
                        
                        if (Array.isArray(data)) {
                            productos = data;
                        } else if (data.productos && Array.isArray(data.productos)) {
                            productos = data.productos;
                        } else if (data.data && Array.isArray(data.data)) {
                            productos = data.data;
                        }
                        
                        // Si el backend no devuelve resultados o devuelve todos los productos,
                        // hacer búsqueda local
                        if (productos.length === 0 || productos.length === productosGlobal.length) {
                            console.log('🔄 Usando búsqueda local');
                            productos = productosGlobal.filter(producto => {
                                const terminoLower = termino.toLowerCase();
                                return producto.nombre.toLowerCase().includes(terminoLower) ||
                                       (producto.descripcion && producto.descripcion.toLowerCase().includes(terminoLower)) ||
                                       (producto.categoria && producto.categoria.toLowerCase().includes(terminoLower));
                            }).sort((a, b) => {
                                // Ordenar por ID de menor a mayor
                                const idA = parseInt(a.id) || 0;
                                const idB = parseInt(b.id) || 0;
                                return idA - idB;
                            });
                        }
                        
                    } catch (error) {
                        console.error('❌ Error en búsqueda backend, usando filtro local:', error);
                        
                        // Fallback: filtrar productos locales
                        productos = productosGlobal.filter(producto => {
                            const terminoLower = termino.toLowerCase();
                            return producto.nombre.toLowerCase().includes(terminoLower) ||
                                   (producto.descripcion && producto.descripcion.toLowerCase().includes(terminoLower)) ||
                                   (producto.categoria && producto.categoria.toLowerCase().includes(terminoLower));
                        }).sort((a, b) => {
                            // Ordenar por ID de menor a mayor
                            const idA = parseInt(a.id) || 0;
                            const idB = parseInt(b.id) || 0;
                            return idA - idB;
                        });
                    }
                    
                    console.log(`✅ Búsqueda completada: ${productos.length} resultados para "${termino}"`);
                    
                    // Mostrar productos encontrados
                    await mostrarProductos(productos);
                    
                    // Actualizar select de categorías con los productos encontrados
                    poblarSelectCategorias(productos);
                    
                    // Mostrar mensaje de resultados
                    if (productos.length === 0) {
                        mostrarNotificacion(`No se encontraron productos para "${termino}"`, 'info');
                    } else {
                        console.log(`📊 ${productos.length} producto(s) encontrado(s)`);
                    }
                }
            } catch (error) {
                console.error('💥 Error general en búsqueda:', error);
                mostrarNotificacion('Error al realizar búsqueda', 'error');
            }
        }, 300); // Reducido a 300ms para mejor responsividad
    });
    
    // Limpiar búsqueda con Escape
    inputBusqueda.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            inputBusqueda.value = '';
            inputBusqueda.dispatchEvent(new Event('input'));
        }
    });
    
    console.log('✅ Búsqueda configurada correctamente');
}

// Función para limpiar modales duplicados del carrito
function limpiarModalesDuplicados() {
    const modales = document.querySelectorAll('#modal-carrito');
    console.log(`🧹 Encontrados ${modales.length} modales del carrito`);
    
    // Eliminar TODOS los modales existentes
    modales.forEach((modal, index) => {
        console.log(`🗑️ Eliminando modal del carrito ${index + 1}`);
        modal.remove();
    });
    
    // También eliminar modales por clase si existen
    const modalesPorClase = document.querySelectorAll('.modal-carrito, [data-modal="carrito"]');
    modalesPorClase.forEach((modal, index) => {
        console.log(`🗑️ Eliminando modal del carrito por clase ${index + 1}`);
        modal.remove();
    });
    
    console.log('✅ Todos los modales del carrito han sido eliminados');
}

// Función para abrir el modal del carrito
function abrirModalCarrito() {
    console.log('🛒 Abriendo modal del carrito...');
    
    // Evitar múltiples aperturas simultáneas
    if (window.modalCarritoAbierto) {
        console.log('⚠️ Modal del carrito ya está abierto, ignorando nueva solicitud');
        return;
    }
    
    // Limpiar modales duplicados antes de crear uno nuevo
    limpiarModalesDuplicados();
    
    // Verificar si hay productos en el carrito
    const totalProductos = Object.keys(carrito).length;
    if (totalProductos === 0) {
        mostrarNotificacion('Tu carrito está vacío', 'info');
        return;
    }
    
    // Marcar que el modal está siendo abierto
    window.modalCarritoAbierto = true;
    
    // Verificar autenticación SOLO al abrir el carrito
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('🔐 Usuario no autenticado, redirigiendo al login...');
        
        // Resetear estado del modal
        window.modalCarritoAbierto = false;
        
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
    
    // Buscar modal existente primero
    let modal = document.getElementById('modal-carrito');
    
    // Si ya existe un modal, solo mostrarlo
    if (modal) {
        console.log('🔄 Modal ya existe, reutilizando...');
        actualizarCarrito();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        return;
    }
    
    // Crear modal solo si no existe
    console.log('🆕 Creando nuevo modal del carrito...');
    modal = document.createElement('div');
    modal.id = 'modal-carrito';
    modal.className = 'fixed inset-0 bg-white/50 z-[9999] hidden flex items-center justify-center p-4';
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
    
    // Agregar evento para cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalCarrito();
        }
    });
    
    document.body.appendChild(modal);
    console.log('✅ Modal creado y agregado al DOM');
    
    // Actualizar contenido del carrito
    actualizarCarrito();
    
    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    console.log('🎉 Modal del carrito mostrado exitosamente');
}

// Función para cerrar el modal del carrito
window.cerrarModalCarrito = function() {
    console.log('🔒 Cerrando modal del carrito...');
    
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        console.log('✅ Modal del carrito cerrado exitosamente');
    } else {
        console.log('⚠️ No se encontró el modal del carrito para cerrar');
    }
    
    // Marcar que el modal ya no está abierto
    window.modalCarritoAbierto = false;
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
    
    try {
        // Verificar que el usuario esté autenticado
        const userToken = localStorage.getItem('token');
        if (!userToken) {
            console.log('❌ Usuario no autenticado');
            mostrarNotificacion('Debes iniciar sesión para realizar una compra', 'error');
            // Redirigir al login
            localStorage.setItem('urlRegreso', window.location.href);
            window.location.href = './login.html';
            return;
        }
        
        console.log('✅ Usuario autenticado');

        // Validar carrito antes de proceder
        const validacion = validarCarrito();
        if (!validacion.valido) {
            console.log('❌ Validación fallida:', validacion.error);
            mostrarNotificacion(validacion.error, 'error');
            return;
        }
        
        console.log('✅ Carrito validado');

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
    console.log('🛒 Carrito actual:', carrito);
    
    for (const id in carrito) {
        const item = carrito[id];
        console.log(`Procesando item: ${item.nombre} x${item.cantidad} @ $${item.precio}`);
        
        // Usar el ID que ya está en el objeto item
        const productoIdOriginal = item.id || id;
        
        // Obtener ID numérico usando la función de mapeo
        const productoIdNumerico = obtenerIdNumerico(productoIdOriginal);
        
        // Validar que el ID numérico sea válido antes de continuar
        if (!productoIdNumerico || 
            typeof productoIdNumerico !== 'number' || 
            productoIdNumerico <= 0 || 
            !Number.isInteger(productoIdNumerico)) {
            console.error('❌ ID numérico inválido obtenido:', {
                original: productoIdOriginal,
                numerico: productoIdNumerico,
                tipo: typeof productoIdNumerico
            });
            mostrarNotificacion(`Error: No se pudo obtener un ID válido para el producto ${productoIdOriginal}`, 'error');
            return;
        }
        console.log(`� ID numérico para backend: ${productoIdNumerico}`);
        
        // Validar que el item tenga todos los campos necesarios
        if (!item.cantidad || !item.precio) {
            console.error('❌ Item inválido en carrito:', item);
            console.error('❌ Campos faltantes:', {
                productoId: productoIdOriginal,
                cantidad: item.cantidad,
                precio: item.precio
            });
            mostrarNotificacion('Error: Producto inválido en el carrito', 'error');
            return;
        }
        
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        const detalleVenta = {
            producto_id: productoIdNumerico, // Usar el ID numérico mapeado
            nombre: item.nombre,
            cantidad: parseInt(item.cantidad),
            precio_unitario: parseFloat(item.precio),
            subtotal: parseFloat(subtotal)
        };
        
        console.log(`✅ Detalle de venta preparado:`, detalleVenta);
        productosVenta.push(detalleVenta);
    }
    
    console.log('💰 Total calculado:', total);
    console.log('📦 Productos para venta:', productosVenta);
    
    // Obtener información del usuario logueado
    const infoUsuario = obtenerInfoUsuario();
    console.log('🔍 Info completa del usuario:', infoUsuario);
    
    // Verificar token
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
    modalContainer.className = 'modal-confirmacion fixed inset-0 bg-white/50 flex items-center justify-center z-[9999] p-4';
    
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
                    <span class="text-2xl font-bold text-emerald-600" id="total-carrito">$${total.toFixed(2)}</span>
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
            
            // Preparar datos para el backend según el schema
            const ventaData = {
                detalles: productosVenta.map(p => ({
                    id_producto: parseInt(p.producto_id),
                    cantidad: parseInt(p.cantidad),
                    precio_unitario: parseFloat(p.precio_unitario),
                    subtotal: parseFloat(p.subtotal)
                })),
                total: parseFloat(total.toFixed(2))
            };
            
            console.log('📊 Datos de venta preparados para backend:', ventaData);
            console.log('🔍 Validando estructura de datos...');
            
            // Validar estructura antes de enviar
            if (!ventaData.detalles || ventaData.detalles.length === 0) {
                throw new Error('No hay productos en la venta');
            }
            
            for (let i = 0; i < ventaData.detalles.length; i++) {
                const detalle = ventaData.detalles[i];
                console.log(`🔍 Validando detalle ${i}:`, detalle);
                
                // Validar que id_producto sea un número válido y mayor a 0
                if (!detalle.id_producto || 
                    typeof detalle.id_producto !== 'number' || 
                    detalle.id_producto <= 0 || 
                    !Number.isInteger(detalle.id_producto)) {
                    console.error(`❌ ID de producto inválido en detalle ${i}:`, detalle.id_producto);
                    throw new Error(`Detalle ${i} tiene ID de producto inválido: ${JSON.stringify(detalle)}`);
                }
                
                // Validar cantidad
                if (!detalle.cantidad || detalle.cantidad <= 0) {
                    console.error(`❌ Cantidad inválida en detalle ${i}:`, detalle.cantidad);
                    throw new Error(`Detalle ${i} tiene cantidad inválida: ${JSON.stringify(detalle)}`);
                }
                
                // Validar precio unitario
                if (!detalle.precio_unitario || detalle.precio_unitario <= 0) {
                    console.error(`❌ Precio unitario inválido en detalle ${i}:`, detalle.precio_unitario);
                    throw new Error(`Detalle ${i} tiene precio unitario inválido: ${JSON.stringify(detalle)}`);
                }
                
                console.log(`✅ Detalle ${i} válido`);
            }
            
            console.log('✅ Estructura de datos validada correctamente');
            
            // Intentar registrar la venta usando el módulo de ventas
            let ventaRegistrada = false;
            let ventaCreada = null;
            
            try {
                console.log('📡 Enviando venta al backend usando módulo de ventas...');
                console.log('🚀 Llamando a crearVenta con:', ventaData);
                
                ventaCreada = await crearVenta(ventaData);
                
                console.log('✅ Venta registrada exitosamente:', ventaCreada);
                ventaRegistrada = true;
                
                mostrarNotificacion('¡Venta registrada en el sistema correctamente!', 'success');
                
            } catch (error) {
                console.error('❌ Error detallado al registrar venta:', error);
                console.error('❌ Mensaje de error:', error.message);
                console.error('❌ Stack trace:', error.stack);
                
                // Verificar si es un error de autenticación
                if (error.message.includes('logueado') || error.message.includes('autenticación')) {
                    mostrarNotificacion('Error de autenticación. Redirigiendo al login...', 'error');
                    localStorage.removeItem('token');
                    setTimeout(() => {
                        window.location.href = './login.html';
                    }, 2000);
                    return;
                }
                
                // Mostrar error específico al usuario
                mostrarNotificacion(`Error al registrar venta: ${error.message}`, 'error');
                throw error; // Re-lanzar para que sea manejado por el catch externo
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
            setTimeout(async () => {
                await generarFactura(productosVenta, total, nombreUsuario, ventaRegistrada);
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
    }); // <- Llave de cierre y paréntesis para el addEventListener

    // Cerrar modal al hacer clic en el overlay
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            console.log('👆 Modal cerrado por click en overlay');
            modalContainer.remove();
        }
    });
    
    } catch (error) {
        console.error('💥 Error crítico en procesarCompra:', error);
        console.error('💥 Stack trace:', error.stack);
        mostrarNotificacion(`Error al procesar compra: ${error.message}`, 'error');
        
        // Limpiar cualquier modal que pueda haber quedado
        const modales = document.querySelectorAll('.modal-confirmacion');
        modales.forEach(modal => modal.remove());
    }
}

// Función para generar y mostrar factura con nombre del usuario
async function generarFactura(productos, total, nombreUsuario, registrada = false) {
    console.log('🧾 Generando factura para:', nombreUsuario);
    // Remover factura existente si la hay
    const facturaExistente = document.querySelector('.modal-factura');
    if (facturaExistente) {
        facturaExistente.remove();
    }
    // Usar el nombre completo del usuario en la factura
    let nombreCompleto = 'Cliente';
    // Intentar obtener el nombre completo del token
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.nombre_completo) {
                nombreCompleto = payload.nombre_completo;
            } else if (payload.nombre_usuario) {
                nombreCompleto = payload.nombre_usuario;
            } else if (payload.nombre) {
                nombreCompleto = payload.nombre;
            } else if (payload.username) {
                nombreCompleto = payload.username;
            }
        }
    } catch (error) {
        console.warn('No se pudo obtener el nombre completo del token:', error);
    }
    // Si no se obtuvo del token, buscar en usuariosLista
    const usuarioId = localStorage.getItem('usuario_id') || localStorage.getItem('userId');
    if (usuarioId && window.usuariosLista && Array.isArray(window.usuariosLista)) {
        const usuario = window.usuariosLista.find(u => String(u.id) === String(usuarioId));
        if (usuario && usuario.nombre_completo) {
            nombreCompleto = usuario.nombre_completo;
        }
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
    modalFactura.className = 'modal-factura fixed inset-0 bg-white/50 flex items-center justify-center z-[9999] p-4';
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
                        <p class="text-lg font-semibold">${nombreCompleto}</p>
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
                    <p>¡Gracias por su compra, ${nombreCompleto}!</p>
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
        
        // Usar la función de verificación mejorada
        const { verificarAutenticacion, verificarEsAdministrador } = await import('./auth.js');
        
        if (!verificarAutenticacion()) {
            console.log('❌ Sin autenticación válida, redirigiendo al login...');
            return; // La función de verificación ya maneja la redirección
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

    // Botón de cerrar sesión (logout)
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesion);
    }

    // Botón del carrito (disponible sin login)
    const btnCarrito = document.getElementById('btn-carrito');
    if (btnCarrito) {
        // Remover event listeners existentes para evitar duplicados
        btnCarrito.removeEventListener('click', abrirModalCarrito);
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
            
            // Inicializar productos
            console.log('⚡ Iniciando carga de productos...');
            try {
                const productos = await obtenerProductos();
                console.log('✅ Productos obtenidos exitosamente');
                if (productos && productos.productos) {
                    await mostrarProductos(productos.productos);
                } else {
                    await mostrarProductos();
                }
                // Configurar funcionalidades después de cargar productos
                configurarBusqueda();
                filtrarPorCategoria();
                
                // Verificar módulo de ventas
                console.log('🔍 Verificando módulo de ventas...');
                console.log('📦 Función crearVenta disponible:', typeof crearVenta);
                if (typeof crearVenta === 'function') {
                    console.log('✅ Módulo de ventas conectado correctamente');
                } else {
                    console.error('❌ Error: Módulo de ventas no disponible');
                }
                
                // Verificar configuración de endpoints
                console.log('🌐 Verificando endpoints...');
                console.log('📡 Endpoint ventas crear:', ENDPOINTS.ventas.crear);
                
                console.log('🎉 Inicialización de página principal completada');
            } catch (error) {
                console.error('❌ Error crítico al cargar productos:', error);
                if (seccionProductos) {
                    seccionProductos.innerHTML = `
                        <div class="col-span-full text-center py-12">
                            <div class="text-red-500 text-6xl mb-4">⚠️</div>
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">Error de conexión</h3>
                            <p class="text-gray-600 mb-4">No se pudo conectar con el servidor</p>
                            <p class="text-sm text-gray-500 mb-6">${error?.message || 'Error desconocido'}</p>
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
    }
    // cierre del if principal de página
    else if (currentPage === "inventario.html") {
        console.log('📦 Iniciando gestión de inventario...');
        console.log('🔧 Llamando a inicializarProductos()...');
        inicializarProductos();
        console.log('✅ inicializarProductos() llamado exitosamente');
    } else if (currentPage === "usuarios.html") {
        console.log('👥 Iniciando gestión de usuarios...');
        inicializarUsuarios();
    } else if (currentPage === "ventas.html") {
        console.log('💰 Iniciando gestión de ventas...');
        inicializarVentas();
    }

    // Validación de contraseña en registro
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', function(e) {
            const pass = document.getElementById('registro_contrasena').value;
            const pass2 = document.getElementById('registro_contrasena2').value;
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
            if (!regex.test(pass)) {
                e.preventDefault();
                mostrarNotificacion('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.', 'error');
                return false;
            }
            if (pass !== pass2) {
                e.preventDefault();
                mostrarNotificacion('Las contraseñas no coinciden.', 'error');
                return false;
            }
        });
    }

    verificarAccesoProtegido();
});

// Resetear estado del modal al cargar/recargar la página
window.addEventListener('load', function() {
    window.modalCarritoAbierto = false;
    console.log('🔄 Estado del modal del carrito reseteado');
});

// Resetear estado del modal antes de cerrar/recargar la página
window.addEventListener('beforeunload', function() {
    window.modalCarritoAbierto = false;
});

// Funciones globales para manejar modales
window.cerrarModalVenta = function() {
    console.log('🚫 Cerrando modal venta...');
    const modalVenta = document.getElementById("modal-venta");
    if (modalVenta) {
        modalVenta.classList.add("hidden");
        modalVenta.style.display = 'none';
        console.log('✅ Modal venta cerrado');
        
        // Limpiar formulario
        const formVenta = document.getElementById("form-venta");
        if (formVenta) {
            formVenta.reset();
        }
    } else {
        console.error("❌ Modal venta no encontrado");
    }
};

// Configurar event listeners para modales cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Botón cancelar venta
    const btnCancelarVenta = document.getElementById("btn-cancelar-venta");
    if (btnCancelarVenta) {
        btnCancelarVenta.addEventListener("click", () => {
            console.log('🚫 Botón cancelar venta clickeado');
            window.cerrarModalVenta();
        });
        console.log('✅ Event listener cancelar venta configurado');
    }
    
    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Cerrar cualquier modal visible
            const modales = ['modal-venta', 'modal-usuario', 'modal-producto'];
            modales.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && !modal.classList.contains('hidden')) {
                    if (modalId === 'modal-venta' && window.cerrarModalVenta) {
                        window.cerrarModalVenta();
                    } else if (modalId === 'modal-usuario' && window.cerrarModalUsuario) {
                        window.cerrarModalUsuario();
                    } else if (modalId === 'modal-producto' && window.cerrarModalProducto) {
                        window.cerrarModalProducto();
                    }
                }
            });
        }
    });
});
