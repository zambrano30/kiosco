import { ENDPOINTS, fetchAPI } from './config.js';

// Gestión de productos
export function inicializarProductos() {
  const tablaProductos = document.getElementById("tabla-productos");
  const btnAgregarProducto = document.getElementById("btn-agregar-producto");
  const modalProducto = document.getElementById("modal-producto");
  const formProducto = document.getElementById("form-producto");
  const btnCancelar = document.getElementById("btn-cancelar");
  const buscarProducto = document.getElementById("buscar-producto");
  const filtroCategoria = document.getElementById("filtro-categoria");

  let productosInventario = [];
  let productoEditando = null;

  if (tablaProductos) {
    cargarProductosInventario();
  }

  if (btnAgregarProducto) {
    btnAgregarProducto.addEventListener("click", () => {
      abrirModal();
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      cerrarModal();
    });
  }

  if (formProducto) {
    formProducto.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarProducto();
    });
  }

  if (buscarProducto) {
    buscarProducto.addEventListener("input", filtrarProductosInventario);
  }

  if (filtroCategoria) {
    filtroCategoria.addEventListener("change", filtrarProductosInventario);
  }

  if (modalProducto) {
    modalProducto.addEventListener("click", (e) => {
      if (e.target === modalProducto) {
        cerrarModal();
      }
    });
  }

  async function cargarProductosInventario() {
    try {
      if (!tablaProductos) return;
      
      // Mostrar estado de carga
      tablaProductos.innerHTML = `
        <tr>
          <td class="border border-gray-300 p-3" colspan="7">
            <div class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p class="mt-2 text-gray-600">Cargando productos...</p>
            </div>
          </td>
        </tr>
      `;

      const respuesta = await fetchAPI(ENDPOINTS.productos.listar);
      
      if (!Array.isArray(respuesta)) {
        throw new Error("Formato de respuesta inválido");
      }
      
      productosInventario = respuesta;
      mostrarProductosInventario(productosInventario);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      if (tablaProductos) {
        tablaProductos.innerHTML = `
          <tr>
            <td class="border border-gray-300 p-3 text-center" colspan="7">
              <div class="flex flex-col items-center justify-center py-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-red-500 font-medium">Error al cargar productos</p>
                <p class="text-gray-500 text-sm mt-1">${error.message}</p>
                <button onclick="location.reload()" class="mt-3 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
                  Reintentar
                </button>
              </div>
          </tr>
        `;
      }
    }
  }

  function mostrarProductosInventario(productos) {
    if (!tablaProductos) return;
    
    if (productos.length === 0) {
      tablaProductos.innerHTML = `
        <tr>
          <td class="border border-gray-300 p-3 text-center" colspan="7">
            <div class="py-8">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-gray-500 text-lg">No hay productos disponibles</p>
              <p class="text-gray-400 text-sm mt-1">Agrega productos usando el botón "Agregar Producto"</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tablaProductos.innerHTML = productos
      .map(
        (producto) => `
      
            </td>
            <td class="border border-gray-300 p-3 text-gray-600">${producto.id_producto || producto.id}</td>
            <td class="border border-gray-300 p-3 font-medium">${producto.nombre}</td>
            <td class="border border-gray-300 p-3">
              <span class="font-medium text-emerald-600">$${Number(producto.precio).toFixed(2)}</span>
            </td>
            <td class="border border-gray-300 p-3">
              <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                ${producto.categoria || "Sin categoría"}
              </span>
            </td>
            <td class="border border-gray-300 p-3">
              <span class="font-medium ${parseInt(producto.stock) <= 10 ? 'text-red-500' : 'text-gray-600'}">
                ${producto.stock || "N/A"}
              </span>
            </td>
            <td class="border border-gray-300 p-3">
              <div class="flex gap-2 justify-center">
                <button 
                  onclick="editarProducto(${producto.id_producto || producto.id})" 
                  class="bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium shadow-sm hover:shadow flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button 
                  onclick="eliminarProducto(${producto.id_producto || producto.id})" 
                  class="bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm hover:shadow flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function filtrarProductosInventario() {
    const textoBusqueda = buscarProducto ? buscarProducto.value.toLowerCase() : "";
    const categoriaSeleccionada = filtroCategoria ? filtroCategoria.value : "";
    const productosFiltrados = productosInventario.filter((producto) => {
      const coincideTexto = producto.nombre.toLowerCase().includes(textoBusqueda);
      const coincideCategoria = !categoriaSeleccionada || producto.categoria === categoriaSeleccionada;
      return coincideTexto && coincideCategoria;
    });
    mostrarProductosInventario(productosFiltrados);
  }

  function abrirModal(producto = null) {
    if (!modalProducto || !formProducto) return;
    productoEditando = producto;
    const modalTitulo = document.getElementById("modal-titulo");
    if (producto) {
      modalTitulo.textContent = "Editar Producto";
      document.getElementById("producto-nombre").value = producto.nombre;
      document.getElementById("producto-precio").value = producto.precio;
      document.getElementById("producto-categoria").value = producto.categoria || "";
      document.getElementById("producto-stock").value = producto.stock || "";
    } else {
      modalTitulo.textContent = "Agregar Producto";
      formProducto.reset();
    }
    modalProducto.classList.remove("hidden");
  }

  function cerrarModal() {
    if (modalProducto) {
      modalProducto.classList.add("hidden");
    }
    productoEditando = null;
  }

  async function guardarProducto() {
    const nombre = document.getElementById("producto-nombre").value;
    const precio = parseFloat(document.getElementById("producto-precio").value);
    const categoria = document.getElementById("producto-categoria").value;
    const stock = parseInt(document.getElementById("producto-stock").value);
    
    if (!nombre || !precio || !categoria || !stock) {
      alert("Por favor, completa todos los campos");
      return;
    }

    const productoData = {
      nombre,
      descripcion: categoria,
      precio,
      stock,
      categoria,
    };

    try {
      let respuesta;
      if (productoEditando) {
        respuesta = await fetchAPI(
          ENDPOINTS.productos.actualizar(productoEditando.id_producto || productoEditando.id),
          {
            method: "PUT",
            body: JSON.stringify(productoData),
          }
        );
      } else {
        respuesta = await fetchAPI(ENDPOINTS.productos.crear, {
          method: "POST",
          body: JSON.stringify(productoData),
        });
      }
      
      cerrarModal();
      await cargarProductosInventario();
      alert(productoEditando ? "Producto actualizado correctamente" : "Producto agregado correctamente");
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert(error.message || "Error al guardar el producto. Por favor, inténtalo de nuevo.");
    }
  }

  window.editarProducto = function (id) {
    const producto = productosInventario.find((p) => (p.id_producto || p.id) === id);
    if (producto) {
      abrirModal(producto);
    }
  };

  window.eliminarProducto = async function (id) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await fetchAPI(ENDPOINTS.productos.eliminar(id), {
          method: "DELETE",
        });
        
        await cargarProductosInventario();
        alert("Producto eliminado correctamente");
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(error.message || "Error al eliminar el producto. Por favor, inténtalo de nuevo.");
      }
    }
  };
}
