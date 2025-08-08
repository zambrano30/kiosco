import { ENDPOINTS, fetchAPI } from './config.js';

// Variables globales
let ventasLista = [];
let productosCache = {}; 
let usuariosCache = {}; 
let currentPage = 1;
const ventasPorPagina = 10;
let estadisticasVentas = {
    ventasHoy: 0,
    ventasMes: 0,
    totalVentas: 0,
    promedioVenta: 0,
    cantidadVentas: 0,
    ventasAnio: 0
};

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Si existe la función global, usarla
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    } else {
        // Fallback a console
        if (tipo === 'error') {
            console.error('❌', mensaje);
        } else if (tipo === 'success') {
            console.log('✅', mensaje);
        } else {
            console.log('ℹ️', mensaje);
        }
    }
}

// Calcular estadísticas de ventas
function calcularEstadisticas() {
    console.log('📊 Calculando estadísticas de ventas...');
    
    if (!ventasLista || ventasLista.length === 0) {
        console.log('⚠️ No hay ventas para calcular estadísticas');
        estadisticasVentas = {
            ventasHoy: 0,
            ventasMes: 0,
            totalVentas: 0,
            promedioVenta: 0,
            cantidadVentas: 0,
            ventasAnio: 0
        };
        actualizarPanelEstadisticas();
        return;
    }

    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

    let ventasHoy = 0;
    let ventasMes = 0;
    let ventasAnio = 0;
    let totalGeneral = 0;
    let cantidadTotal = 0;

    ventasLista.forEach(venta => {
        const fechaVenta = new Date(venta.fecha_venta);
        const totalVenta = parseFloat(venta.total || 0);
        
        // Contar para total general
        totalGeneral += totalVenta;
        cantidadTotal++;

        // Ventas de hoy
        if (fechaVenta >= inicioHoy) {
            ventasHoy += totalVenta;
        }

        // Ventas del mes
        if (fechaVenta >= inicioMes) {
            ventasMes += totalVenta;
        }

        // Ventas del año
        if (fechaVenta >= inicioAnio) {
            ventasAnio += totalVenta;
        }
    });

    // Calcular promedio
    const promedioVenta = cantidadTotal > 0 ? totalGeneral / cantidadTotal : 0;

    // Actualizar estadísticas globales
    estadisticasVentas = {
        ventasHoy: ventasHoy,
        ventasMes: ventasMes,
        totalVentas: totalGeneral,
        promedioVenta: promedioVenta,
        cantidadVentas: cantidadTotal,
        ventasAnio: ventasAnio
    };

    console.log('📈 Estadísticas calculadas:', estadisticasVentas);
    actualizarPanelEstadisticas();
}

// Actualizar el panel de estadísticas en el DOM
function actualizarPanelEstadisticas() {
    console.log('🔄 Actualizando panel de estadísticas...');
    
    // Actualizar ventas de hoy
    const ventasHoyElement = document.getElementById('ventas-hoy');
    if (ventasHoyElement) {
        ventasHoyElement.textContent = `$${estadisticasVentas.ventasHoy.toFixed(2)}`;
        // Agregar efecto visual de actualización
        ventasHoyElement.parentElement.parentElement.classList.add('animate-pulse');
        setTimeout(() => {
            ventasHoyElement.parentElement.parentElement.classList.remove('animate-pulse');
        }, 1000);
    }

    // Actualizar ventas del mes
    const ventasMesElement = document.getElementById('ventas-mes');
    if (ventasMesElement) {
        ventasMesElement.textContent = `$${estadisticasVentas.ventasMes.toFixed(2)}`;
    }

    // Actualizar total de ventas (cantidad)
    const totalVentasElement = document.getElementById('total-ventas');
    if (totalVentasElement) {
        totalVentasElement.textContent = estadisticasVentas.cantidadVentas.toString();
    }

    // Actualizar promedio de venta
    const promedioElement = document.getElementById('promedio-venta');
    if (promedioElement) {
        promedioElement.textContent = `$${estadisticasVentas.promedioVenta.toFixed(2)}`;
    }

    console.log('✅ Panel de estadísticas actualizado');
}

// Actualizar estadísticas de manera optimista (sin recargar todo)
function actualizarEstadisticasOptimista(nuevaVenta) {
    console.log('⚡ Actualizando estadísticas de manera optimista...');
    
    const totalNuevaVenta = parseFloat(nuevaVenta.total || 0);
    const fechaVenta = new Date(nuevaVenta.fecha_venta || new Date());
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Actualizar contadores
    estadisticasVentas.cantidadVentas++;
    estadisticasVentas.totalVentas += totalNuevaVenta;
    
    // Si es de hoy
    if (fechaVenta >= inicioHoy) {
        estadisticasVentas.ventasHoy += totalNuevaVenta;
    }
    
    // Si es del mes
    if (fechaVenta >= inicioMes) {
        estadisticasVentas.ventasMes += totalNuevaVenta;
    }
    
    // Recalcular promedio
    estadisticasVentas.promedioVenta = estadisticasVentas.cantidadVentas > 0 ? 
        estadisticasVentas.totalVentas / estadisticasVentas.cantidadVentas : 0;

    console.log('⚡ Estadísticas actualizadas optimísticamente:', estadisticasVentas);
    actualizarPanelEstadisticas();
}

// Obtener información de un producto
async function obtenerProducto(idProducto) {
    if (productosCache[idProducto]) {
        return productosCache[idProducto];
    }
    
    try {
        const producto = await fetchAPI(ENDPOINTS.productos.obtener(idProducto));
        productosCache[idProducto] = producto;
        return producto;
    } catch (error) {
        console.error(`Error al obtener producto ${idProducto}:`, error);
        return { nombre: `Producto #${idProducto}`, descripcion: '' };
    }
}

// Obtener información de un usuario
async function obtenerUsuario(idUsuario) {
    if (usuariosCache[idUsuario]) {
        return usuariosCache[idUsuario];
    }
    
    try {
        const usuario = await fetchAPI(ENDPOINTS.usuarios.obtener(idUsuario));
        usuariosCache[idUsuario] = usuario;
        return usuario;
    } catch (error) {
        console.error(`Error al obtener usuario ${idUsuario}:`, error);
        return { nombre_completo: `Usuario #${idUsuario}`, nombre_usuario: `user${idUsuario}` };
    }
}

// Obtener todas las ventas del backend
async function obtenerVentas() {
    try {
        console.log('Obteniendo ventas del backend...');
        const ventas = await fetchAPI(ENDPOINTS.ventas.listar);
        ventasLista = ventas;
        
        // Calcular estadísticas después de cargar las ventas
        console.log('📊 Calculando estadísticas después de cargar ventas...');
        calcularEstadisticas();
        
        await renderizarVentas();
        mostrarNotificacion('Ventas cargadas correctamente', 'success');
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        mostrarNotificacion('Error al cargar las ventas: ' + error.message, 'error');
        
        await renderizarVentas();
    }
}


async function crearVenta(ventaData) {
    try {
        console.log('🛒 Iniciando creación de venta...');
        console.log('📊 Datos recibidos:', ventaData);
        
        // Verificar que el usuario esté autenticado
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No hay token de autenticación');
            throw new Error('Debes estar logueado para realizar una venta');
        }
        
        // Estructura de la venta según el schema
        const nuevaVenta = {
            detalles: ventaData.detalles.map(detalle => ({
                id_producto: parseInt(detalle.id_producto),
                cantidad: parseInt(detalle.cantidad),
                precio_unitario: parseFloat(detalle.precio_unitario),
                subtotal: parseFloat(detalle.subtotal)
            })),
            total: parseFloat(ventaData.total)
        };

        console.log('📤 Enviando al backend:', nuevaVenta);

        const response = await fetchAPI(ENDPOINTS.ventas.crear, {
            method: 'POST',
            body: JSON.stringify(nuevaVenta)
        });

        console.log('✅ Venta creada exitosamente:', response);
        mostrarNotificacion('¡Venta registrada en el sistema!', 'success');
        
        // Actualizar estadísticas de manera optimista primero
        const ventaConFecha = {
            ...nuevaVenta,
            fecha_venta: new Date().toISOString(),
            id_venta: response.id_venta || Date.now()
        };
        actualizarEstadisticasOptimista(ventaConFecha);
        
        // Recargar la lista de ventas si estamos en la página de ventas
        if (document.getElementById('tabla-ventas')) {
            await obtenerVentas();
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error al crear venta:', error);
        mostrarNotificacion('Error al registrar la venta: ' + error.message, 'error');
        throw error;
    }
}

// Renderizar tabla de ventas
async function renderizarVentas() {
    console.log('🎨 Renderizando ventas...', ventasLista.length, 'ventas');
    const tbody = document.getElementById('tabla-ventas'); // Usar el ID correcto del HTML
    
    if (!tbody) {
        console.error('❌ No se encontró el elemento tabla-ventas');
        return;
    }

    console.log('✅ Elemento tabla encontrado, limpiando...');
    // Limpiar tabla
    tbody.innerHTML = '';

    if (!ventasLista || ventasLista.length === 0) {
        console.log('⚠️ No hay ventas para mostrar');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-4">No hay ventas registradas</td></tr>';
        return;
    }

    console.log('📋 Procesando', ventasLista.length, 'ventas...');

    // Calcular paginación
    const inicio = (currentPage - 1) * ventasPorPagina;
    const fin = inicio + ventasPorPagina;
    const ventasPagina = ventasLista.slice(inicio, fin);

    // Mostrar mensaje de carga mientras se obtienen los datos de usuario
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-4">Cargando información de usuarios...</td></tr>';

    // Renderizar ventas con información de usuario
    for (const venta of ventasPagina) {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        // Formatear fecha con hora
        const fecha = venta.fecha_venta ? 
            new Date(venta.fecha_venta).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Sin fecha';
        
        // Calcular cantidad total de productos
        const cantidadTotal = venta.detalles ? 
            venta.detalles.reduce((sum, detalle) => sum + parseInt(detalle.cantidad || 0), 0) : 0;
        
        // Obtener información del usuario
        let nombreUsuario = 'Cargando...';
        try {
            const usuario = await obtenerUsuario(venta.id_usuario);
            nombreUsuario = usuario.nombre_completo || usuario.nombre_usuario || `Usuario ${venta.id_usuario}`;
        } catch (error) {
            console.error(`Error al obtener usuario ${venta.id_usuario}:`, error);
            nombreUsuario = `Usuario #${venta.id_usuario}`;
        }
        
        row.innerHTML = `
            <td class="px-4 py-2 font-medium">${venta.id_venta}</td>
            <td class="px-4 py-2">${nombreUsuario}</td>
            <td class="px-4 py-2 text-sm">${fecha}</td>
            <td class="px-4 py-2 text-center">${cantidadTotal}</td>
            <td class="px-4 py-2 font-semibold text-green-600">$${parseFloat(venta.total || 0).toFixed(2)}</td>
            <td class="px-4 py-2">
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Completada
                </span>
            </td>
            <td class="px-4 py-2">
                <button data-venta-id="${venta.id_venta}" 
                        class="btn-ver-detalle bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm">
                    Ver Detalle
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    }

    // Agregar event listeners a los botones "Ver Detalle"
    console.log('🎯 Agregando event listeners a botones...');
    const botonesDetalle = document.querySelectorAll('.btn-ver-detalle');
    botonesDetalle.forEach(boton => {
        boton.addEventListener('click', function() {
            const ventaId = this.getAttribute('data-venta-id');
            console.log('🔴 Botón clickeado para venta:', ventaId);
            verDetalleVenta(parseInt(ventaId));
        });
    });
    console.log(`✅ ${botonesDetalle.length} event listeners agregados`);

    // Actualizar información de paginación
    actualizarPaginacion();
}

// Actualizar controles de paginación
function actualizarPaginacion() {
    const totalPaginas = Math.ceil(ventasLista.length / ventasPorPagina);
    const paginaInfo = document.getElementById('pagina-info');
    const btnAnterior = document.getElementById('btn-anterior-ventas'); // Usar ID correcto
    const btnSiguiente = document.getElementById('btn-siguiente-ventas'); // Usar ID correcto

    if (paginaInfo) {
        paginaInfo.textContent = `Página ${currentPage} de ${totalPaginas}`;
    }

    if (btnAnterior) {
        btnAnterior.disabled = currentPage <= 1;
        btnAnterior.className = currentPage <= 1 
            ? 'bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer';
    }

    if (btnSiguiente) {
        btnSiguiente.disabled = currentPage >= totalPaginas;
        btnSiguiente.className = currentPage >= totalPaginas
            ? 'bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer';
    }
}

// Ver detalle de una venta específica (NUEVA VERSIÓN SIN MODAL)
async function verDetalleVenta(idVenta) {
    console.log('🔍 Ver detalle de venta ID:', idVenta);
    
    // Buscar en la lista local primero
    const venta = ventasLista.find(v => v.id_venta == idVenta);
    
    if (venta) {
        console.log('✅ Venta encontrada:', venta);
        // Usar la nueva función que NO requiere modal
        await mostrarDetalleEnPagina(venta);
    } else {
        console.error('❌ Venta no encontrada en la lista local');
        mostrarNotificacion('Venta no encontrada', 'error');
    }
}

// Mostrar detalle reemplazando el contenido de la página
async function mostrarDetalleEnPagina(venta) {
    console.log('📄 Mostrando detalle en la página principal...');
    
    const main = document.querySelector('main');
    if (!main) {
        console.error('❌ No se encontró el elemento main');
        mostrarNotificacionVentas('Error: No se pudo mostrar el detalle', 'error');
        return;
    }

    // Guardar contenido original
    if (!window.contenidoOriginalVentas) {
        window.contenidoOriginalVentas = main.innerHTML;
    }

    // Formatear fecha
    const fechaFormateada = venta.fecha_venta ? 
        new Date(venta.fecha_venta).toLocaleString('es-ES') : 'Sin fecha';

    // Obtener información del usuario
    let nombreUsuario = 'Cargando...';
    try {
        const usuario = await obtenerUsuario(venta.id_usuario);
        nombreUsuario = usuario.nombre_completo || usuario.nombre_usuario || `Usuario ${venta.id_usuario}`;
    } catch (error) {
        console.error(`Error al obtener usuario ${venta.id_usuario}:`, error);
        nombreUsuario = `Usuario #${venta.id_usuario}`;
    }

    // Obtener información de todos los productos en los detalles
    let detallesConProductos = [];
    if (venta.detalles && venta.detalles.length > 0) {
        for (const detalle of venta.detalles) {
            try {
                const producto = await obtenerProducto(detalle.id_producto);
                detallesConProductos.push({
                    ...detalle,
                    producto_info: {
                        nombre: producto.nombre || `Producto #${detalle.id_producto}`,
                        descripcion: producto.descripcion || ''
                    }
                });
            } catch (error) {
                console.error(`Error al obtener producto ${detalle.id_producto}:`, error);
                detallesConProductos.push({
                    ...detalle,
                    producto_info: {
                        nombre: `Producto ${detalle.id_producto}`,
                        descripcion: 'Información no disponible'
                    }
                });
            }
        }
    }

    // Crear contenido del detalle
    const detalleHTML = `
        <div class="container mx-auto p-6">
            <div class="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
                <div class="flex items-center justify-between mb-6 border-b pb-4">
                    <h1 class="text-3xl font-bold text-gray-900">📋 Detalle de Venta ${venta.id_venta}</h1>
                    <button onclick="volverAVentas()" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        ← Volver a Ventas
                    </button>
                </div>
                
                <                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-700 mb-2">Información General</h3>
                        <p><span class="font-medium">ID Venta:</span> ${venta.id_venta}</p>
                        <p><span class="font-medium">Usuario:</span> ${nombreUsuario}</p>
                        <p><span class="font-medium">Fecha:</span> ${fechaFormateada}</p>
                        <p><span class="font-medium">Total:</span> <span class="text-green-600 font-bold text-xl">$${parseFloat(venta.total || 0).toFixed(2)}</span></p>
                    </div>
                    
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-700 mb-2">Resumen</h3>
                        <p><span class="font-medium">Productos:</span> ${detallesConProductos ? detallesConProductos.length : 0}</p>
                        <p><span class="font-medium">Cantidad Total:</span> ${detallesConProductos ? detallesConProductos.reduce((sum, d) => sum + parseInt(d.cantidad || 0), 0) : 0}</p>
                        <p><span class="font-medium">Estado:</span> <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Completada</span></p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-xl font-semibold mb-4">🛍️ Productos Vendidos</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full border border-gray-200 rounded-lg">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left font-medium text-gray-700">Producto</th>
                                    <th class="px-4 py-3 text-center font-medium text-gray-700">Cantidad</th>
                                    <th class="px-4 py-3 text-right font-medium text-gray-700">Precio Unit.</th>
                                    <th class="px-4 py-3 text-right font-medium text-gray-700">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detallesConProductos && detallesConProductos.length > 0 ? 
                                    detallesConProductos.map(detalle => `
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="px-4 py-3">
                                                <div class="font-medium">${detalle.producto_info.nombre}</div>
                                                <div class="text-sm text-gray-500">${detalle.producto_info.descripcion}</div>
                                                <div class="text-xs text-gray-400">ID: ${detalle.id_producto}</div>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                                                    ${detalle.cantidad}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-right font-medium">$${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                                            <td class="px-4 py-3 text-right font-bold text-green-600">$${parseFloat(detalle.subtotal).toFixed(2)}</td>
                                        </tr>
                                    `).join('')
                                    : '<tr><td colspan="4" class="text-center text-gray-500 py-8">Sin productos en esta venta</td></tr>'
                                }
                            </tbody>
                            <tfoot class="bg-gray-50">
                                <tr>
                                    <td colspan="3" class="px-4 py-3 text-right font-bold">TOTAL:</td>
                                    <td class="px-4 py-3 text-right font-bold text-green-600 text-xl">$${parseFloat(venta.total || 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                
                <div class="text-center">
                    <button onclick="volverAVentas()" class="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors text-lg">
                        🔙 Volver al Listado de Ventas
                    </button>
                </div>
            </div>
        </div>
    `;

    // Reemplazar contenido
    main.innerHTML = detalleHTML;
    
    // Scroll al top
    window.scrollTo(0, 0);
    
    console.log('✅ Detalle mostrado en la página');
}

// Función para volver al listado de ventas
function volverAVentas() {
    console.log('🔙 Volviendo al listado de ventas...');
    const main = document.querySelector('main');
    if (main && window.contenidoOriginalVentas) {
        main.innerHTML = window.contenidoOriginalVentas;
        // Recargar ventas
        if (typeof obtenerVentas === 'function') {
            obtenerVentas();
        }
        console.log('✅ Contenido restaurado');
    }
}

// Exportar función al scope global
window.volverAVentas = volverAVentas;

// Mostrar modal con detalle de venta
function mostrarModalDetalle(venta) {
    console.log('🎭 Mostrando modal para venta:', venta);
    
    const modal = document.getElementById('modal-detalle-venta');
    const contenido = document.getElementById('contenido-detalle-venta');
    
    console.log('🔍 Elementos encontrados:', {
        modal: !!modal,
        contenido: !!contenido,
        modalElement: modal,
        contenidoElement: contenido
    });
    
    if (!modal) {
        console.error('❌ No se encontró el modal con ID: modal-detalle-venta');
        console.log('🔍 Elementos con ID modal:', document.querySelectorAll('[id*="modal"]'));
        mostrarNotificacionVentas('Error: No se encontró el modal', 'error');
        return;
    }
    
    if (!contenido) {
        console.error('❌ No se encontró el contenido con ID: contenido-detalle-venta');
        console.log('🔍 Elementos con ID contenido:', document.querySelectorAll('[id*="contenido"]'));
        mostrarNotificacionVentas('Error: No se encontró el contenido del modal', 'error');
        return;
    }

    // Formatear fecha completa
    const fechaFormateada = venta.fecha_venta ? 
        new Date(venta.fecha_venta).toLocaleString('es-ES') : 'Sin fecha';

    console.log('📝 Generando contenido del modal...');
    
    contenido.innerHTML = `
        <div class="space-y-4">
            <div class="border-b pb-3">
                <h4 class="font-semibold text-lg">Venta #${venta.id_venta}</h4>
                <p class="text-sm text-gray-600">Usuario: #${venta.id_usuario}</p>
                <p class="text-sm text-gray-600">Fecha: ${fechaFormateada}</p>
            </div>
            
            <div>
                <h5 class="font-medium mb-2">Productos:</h5>
                <div class="space-y-2">
                    ${venta.detalles && venta.detalles.length > 0 ? 
                        venta.detalles.map(detalle => `
                            <div class="bg-gray-50 p-3 rounded">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="font-medium">Producto #${detalle.id_producto}</p>
                                        <p class="text-sm text-gray-600">Cantidad: ${detalle.cantidad} | Precio: $${parseFloat(detalle.precio_unitario).toFixed(2)}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-semibold text-green-600">$${parseFloat(detalle.subtotal).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')
                        : '<p class="text-gray-500">Sin productos</p>'
                    }
                </div>
            </div>
            
            <div class="border-t pt-3">
                <div class="flex justify-between items-center">
                    <span class="font-semibold">Total:</span>
                    <span class="text-xl font-bold text-green-600">$${parseFloat(venta.total || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;

    console.log('✅ Contenido generado, mostrando modal con estilos inline...');
    
    // Usar estilos inline para asegurar que se muestre
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
    modal.style.zIndex = '99999';
    modal.classList.remove('hidden');
    
    console.log('🎉 Modal mostrado con estilos inline');
    
    // Verificar estilos aplicados
    setTimeout(() => {
        console.log('🔍 Estilos finales del modal:', {
            display: modal.style.display,
            position: modal.style.position,
            zIndex: modal.style.zIndex,
            backgroundColor: modal.style.backgroundColor,
            computedDisplay: window.getComputedStyle(modal).display,
            computedPosition: window.getComputedStyle(modal).position,
            computedZIndex: window.getComputedStyle(modal).zIndex
        });
    }, 500);
    
    // Verificar si se aplicó el cambio
    setTimeout(() => {
        console.log('🔍 Verificación después de 500ms:', {
            isHidden: modal.classList.contains('hidden'),
            display: window.getComputedStyle(modal).display,
            visibility: window.getComputedStyle(modal).visibility,
            opacity: window.getComputedStyle(modal).opacity
        });
    }, 500);
}

// Cerrar modal
function cerrarModalDetalle() {
    console.log('🚫 Cerrando modal...');
    const modal = document.getElementById('modal-detalle-venta');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        console.log('✅ Modal cerrado');
    }
}

// Navegación de páginas
async function paginaAnterior() {
    if (currentPage > 1) {
        currentPage--;
        await renderizarVentas();
    }
}

async function paginaSiguiente() {
    const totalPaginas = Math.ceil(ventasLista.length / ventasPorPagina);
    if (currentPage < totalPaginas) {
        currentPage++;
        await renderizarVentas();
    }
}

// Event listeners cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando módulo de ventas...');

    // Verificar si estamos en la página de ventas
    const tablaVentas = document.getElementById('tabla-ventas');
    console.log('📊 Elemento tabla-ventas encontrado:', !!tablaVentas);
    
    if (tablaVentas) {
        console.log('✅ Cargando ventas...');
        // Inicializar estadísticas vacías primero
        actualizarPanelEstadisticas();
        // Luego cargar datos reales
        obtenerVentas();
    } else {
        console.log('❌ No se encontró la tabla de ventas');
    }

    // Agregar botón de prueba de venta (solo para debugging)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        console.log('🧪 Agregando función de prueba de venta...');
        window.testVenta = async function() {
            const ventaPrueba = {
                detalles: [
                    {
                        id_producto: 1,
                        cantidad: 1,
                        precio_unitario: 5.0,
                        subtotal: 5.0
                    }
                ],
                total: 5.0
            };
            
            try {
                console.log('🧪 Probando crear venta...');
                const resultado = await crearVenta(ventaPrueba);
                console.log('✅ Prueba exitosa:', resultado);
            } catch (error) {
                console.error('❌ Error en prueba:', error);
            }
        };
    }

    // Agregar función de prueba del modal
    window.probarModal = function() {
        console.log('🧪 Probando modal...');
        const ventaPrueba = {
            id_venta: 999,
            id_usuario: 1,
            fecha_venta: "2025-08-08T15:30:00",
            total: 15.50,
            detalles: [
                {
                    id_producto: 1,
                    cantidad: 2,
                    precio_unitario: 7.75,
                    id_detalle: 1,
                    subtotal: 15.50,
                    producto_info: {
                        nombre: "Producto de Prueba",
                        descripcion: "Descripción del producto"
                    }
                }
            ]
        };
        mostrarModalDetalle(ventaPrueba);
    };

    console.log('🧪 Función probarModal() disponible. Ejecuta probarModal() en la consola para probar.');

    // Event listeners para botones de paginación
    const btnAnterior = document.getElementById('btn-anterior-ventas');
    const btnSiguiente = document.getElementById('btn-siguiente-ventas');
    const btnCerrarModal = document.getElementById('btn-cerrar-detalle'); // ID correcto

    if (btnAnterior) {
        btnAnterior.addEventListener('click', paginaAnterior);
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', paginaSiguiente);
    }

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModalDetalle);
    }

    // Cerrar modal al hacer click fuera
    const modal = document.getElementById('modal-detalle-venta');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModalDetalle();
            }
        });
    }
});

// Exportar funciones para uso global
window.verDetalleVenta = verDetalleVenta;
window.cerrarModalDetalle = cerrarModalDetalle;
window.paginaAnterior = paginaAnterior;
window.paginaSiguiente = paginaSiguiente;

console.log('✅ Funciones de ventas exportadas al objeto window');

// Exportar para uso en otros módulos
export { 
    obtenerVentas, 
    crearVenta, 
    verDetalleVenta, 
    renderizarVentas,
    calcularEstadisticas,
    actualizarPanelEstadisticas,
    actualizarEstadisticasOptimista
};
