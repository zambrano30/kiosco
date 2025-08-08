import { ENDPOINTS, fetchAPI } from './config.js';

// Gestión de ventas
export function inicializarVentas() {
  const tablaVentas = document.getElementById("tabla-ventas");
  const btnNuevaVenta = document.getElementById("btn-nueva-venta");
  const modalVenta = document.getElementById("modal-venta");
  const formVenta = document.getElementById("form-venta");
  const btnCancelarVenta = document.getElementById("btn-cancelar-venta");

  let ventasLista = [];

  if (tablaVentas) {
    cargarVentas();
  }

  if (btnNuevaVenta) {
    btnNuevaVenta.addEventListener("click", () => {
      abrirModalVenta();
    });
  }

  if (btnCancelarVenta) {
    btnCancelarVenta.addEventListener("click", () => {
      cerrarModalVenta();
    });
  }

  if (modalVenta) {
    modalVenta.addEventListener("click", (e) => {
      if (e.target === modalVenta) {
        cerrarModalVenta();
      }
    });
  }

  async function cargarVentas() {
    try {
      if (!tablaVentas) return;
      
      // Mostrar estado de carga
      tablaVentas.innerHTML = `
        <tr>
          <td class="border border-gray-300 p-3" colspan="7">
            <div class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p class="mt-2 text-gray-600">Cargando ventas...</p>
            </div>
          </td>
        </tr>
      `;

      const data = await fetchAPI(ENDPOINTS.ventas.listar);
      
      if (!Array.isArray(data)) {
        throw new Error("Formato de respuesta inválido");
      }
      
      ventasLista = data.map((venta) => ({
        id: venta.id_venta || venta.id,
        cliente: venta.nombre_cliente || venta.cliente || "Cliente no especificado",
        fecha: venta.fecha_venta ? venta.fecha_venta.split("T")[0] : new Date().toISOString().split("T")[0],
        productos: venta.productos ? venta.productos.map(p => p.nombre).join(", ") : "Sin productos",
        total: parseFloat(venta.total) || 0,
        estado: venta.estado || "completada",
      }));
      
      mostrarVentas(ventasLista);
      actualizarEstadisticas();
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      if (tablaVentas) {
        tablaVentas.innerHTML = `
          <tr>
            <td class="border border-gray-300 p-3 text-center" colspan="7">
              <div class="flex flex-col items-center justify-center py-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-red-500 font-medium">Error al cargar ventas</p>
                <p class="text-gray-500 text-sm mt-1">${error.message}</p>
                <button onclick="location.reload()" class="mt-3 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
                  Reintentar
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    }
  }

  function mostrarVentas(ventas) {
    if (!tablaVentas) return;
    if (ventas.length === 0) {
      tablaVentas.innerHTML = `
                <tr>
                    <td class="border border-gray-300 p-3 text-center text-gray-500" colspan="7">
                        No hay ventas disponibles
                    </td>
                </tr>
            `;
      return;
    }
    tablaVentas.innerHTML = ventas
      .map(
        (venta) => `
            <tr>
                <td class="border border-gray-300 p-3">#${venta.id}</td>
                <td class="border border-gray-300 p-3">${venta.cliente}</td>
                <td class="border border-gray-300 p-3">${venta.fecha}</td>
                <td class="border border-gray-300 p-3">${typeof venta.productos === 'string' ? venta.productos : venta.productos.join(", ")}</td>
                <td class="border border-gray-300 p-3">$${venta.total.toFixed(2)}</td>
                <td class="border border-gray-300 p-3">
                    <span class="px-2 py-1 rounded text-sm ${
                      venta.estado === "completada"
                        ? "bg-green-100 text-green-800"
                        : venta.estado === "pendiente"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }">
                        ${venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}
                    </span>
                </td>
                <td class="border border-gray-300 p-3">
                    <button onclick="verDetalleVenta(${venta.id})" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mr-2 text-sm">Ver</button>
                    <button onclick="eliminarVenta(${venta.id})" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">Eliminar</button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function actualizarEstadisticas() {
    const hoy = new Date().toISOString().split("T")[0];
    const ventasHoy = ventasLista.filter((v) => v.fecha === hoy);
    const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
    const mesActual = new Date().getMonth();
    const añoActual = new Date().getFullYear();
    const ventasMes = ventasLista.filter((v) => {
      const fechaVenta = new Date(v.fecha);
      return (
        fechaVenta.getMonth() === mesActual &&
        fechaVenta.getFullYear() === añoActual
      );
    });
    const totalVentasMes = ventasMes.reduce((sum, v) => sum + v.total, 0);
    const totalVentas = ventasLista.length;
    const promedioVenta = ventasLista.length > 0 ? ventasLista.reduce((sum, v) => sum + v.total, 0) / ventasLista.length : 0;

    // Actualizar elementos en el DOM
    const ventasHoyElement = document.getElementById("ventas-hoy");
    const ventasMesElement = document.getElementById("ventas-mes");
    const totalVentasElement = document.getElementById("total-ventas");
    const promedioVentaElement = document.getElementById("promedio-venta");

    if (ventasHoyElement) ventasHoyElement.textContent = `$${totalVentasHoy.toFixed(2)}`;
    if (ventasMesElement) ventasMesElement.textContent = `$${totalVentasMes.toFixed(2)}`;
    if (totalVentasElement) totalVentasElement.textContent = totalVentas.toString();
    if (promedioVentaElement) promedioVentaElement.textContent = `$${promedioVenta.toFixed(2)}`;
  }
    const elementoVentasHoy = document.getElementById("ventas-hoy");
    const elementoVentasMes = document.getElementById("ventas-mes");
    const elementoTotalVentas = document.getElementById("total-ventas");
    const elementoPromedioVenta = document.getElementById("promedio-venta");
    if (elementoVentasHoy) elementoVentasHoy.textContent = `$${totalVentasHoy.toFixed(2)}`;
    if (elementoVentasMes) elementoVentasMes.textContent = `$${totalVentasMes.toFixed(2)}`;
    if (elementoTotalVentas) elementoTotalVentas.textContent = totalVentas;
    if (elementoPromedioVenta) elementoPromedioVenta.textContent = `$${promedioVenta.toFixed(2)}`;
  }

  function abrirModalVenta() {
    if (!modalVenta) return;
    const fechaHoy = new Date().toISOString().split("T")[0];
    const inputFecha = document.getElementById("venta-fecha");
    if (inputFecha) inputFecha.value = fechaHoy;
    modalVenta.classList.remove("hidden");
    modalVenta.classList.add("flex");
  }

  function cerrarModalVenta() {
    if (modalVenta) {
      modalVenta.classList.add("hidden");
      modalVenta.classList.remove("flex");
    }
  }

  window.verDetalleVenta = function (id) {
    const venta = ventasLista.find((v) => v.id === id);
    if (venta) {
      const productos = typeof venta.productos === 'string' ? venta.productos : venta.productos.join(", ");
      alert(
        `Detalles de la venta #${venta.id}:\nCliente: ${venta.cliente}\nFecha: ${venta.fecha}\nProductos: ${productos}\nTotal: $${venta.total.toFixed(2)}\nEstado: ${venta.estado}`
      );
    }
  };

  window.eliminarVenta = function (id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta venta?")) {
      ventasLista = ventasLista.filter((v) => v.id !== id);
      mostrarVentas(ventasLista);
      actualizarEstadisticas();
      alert("Venta eliminada correctamente");
    }
  };

