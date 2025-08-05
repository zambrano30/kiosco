const URL_PRODUCTOS =
  "https://funval-backend.onrender.com/productos/?skip=0&limit=100";
const URL_LOGIN = "https://funval-backend.onrender.com/login";
const URL_REGISTRO = "https://funval-backend.onrender.com/registro-comprador";
const URL_USUARIOS = "https://funval-backend.onrender.com/usuarios/";

let productosGlobal = [];
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 10;

const btnAnterior = document.getElementById("anterior");
const btnSiguiente = document.getElementById("siguiente");
let categorias = document.querySelector("#categorias");
const inputBusqueda = document.querySelector('input[type="search"]');
let textoBusqueda = "";

// 1. Utilidades
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function verificarAutenticacion() {
  const token = getCookie("token");
  return token !== null && token !== "";
}

function verificarEsAdministrador() {
  const token = getCookie("token");
  if (!token) return false;

  try {
    // Decodificar el token JWT para obtener el rol
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.rol === "administrador";
  } catch (error) {
    console.error("Error al verificar rol:", error);
    return false;
  }
}

function protegerRutaAdmin() {
  if (!verificarAutenticacion()) {
    alert("Debes iniciar sesión para acceder a esta página");
    window.location.href = "index.html";
    return false;
  }

  if (!verificarEsAdministrador()) {
    alert("No tienes permisos de administrador para acceder a esta página");
    window.location.href = "home.html";
    return false;
  }

  return true;
}

function protegerRutaUsuario() {
  if (!verificarAutenticacion()) {
    alert("Debes iniciar sesión para acceder a esta página");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function cerrarSesion() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    // Eliminar token
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    alert("Sesión cerrada correctamente");
    window.location.href = "index.html";
  }
}

// 2. Autenticación
function login() {
  const formLogin = document.getElementById("form-login");
  if (!formLogin) return;
  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();
    const nombre_usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contrasena").value;
    try {
      const respuesta = await fetch(URL_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre_usuario, contraseña }),
      });
      if (!respuesta.ok) {
        let mensajeError = "Error de autenticación";
        try {
          const errorData = await respuesta.json();
          if (errorData.detail) mensajeError = errorData.detail;
        } catch {}
        throw new Error(mensajeError);
      }
      const datos = await respuesta.json();
      setCookie("token", datos.access_token, 1); // Guarda por 1 día

      // Verificar el rol del usuario y redirigir
      try {
        const payload = JSON.parse(atob(datos.access_token.split(".")[1]));
        const rol = payload.rol;

        if (rol === "administrador") {
          alert("Login exitoso - Redirigiendo al panel de administración");
          window.location.href = "administracion.html";
        } else {
          alert("Login exitoso - Redirigiendo a la tienda");
          window.location.href = "home.html";
        }
      } catch (error) {
        // Si no se puede decodificar el token, redirigir a home por defecto
        alert("Login exitoso");
        window.location.href = "home.html";
      }
    } catch (error) {
      alert(error.message || "Ocurrió un error");
    }
  });
}
function abrirRegistro() {
  const registro = document.querySelector(".registrarse");
  const formulario_registro = document.querySelector("#form-registro");
  registro.addEventListener("click", function (e) {
    formulario_registro.classList.remove("hidden");
  });
}

function registrarUsuario() {
  const formRegistro = document.getElementById("form-registro");
  if (!formRegistro) return;
  formRegistro.addEventListener("submit", async function (e) {
    e.preventDefault();
    const nombre_usuario = document.getElementById("registro_usuario").value;
    const nombre_completo = document.getElementById("registro_nombre").value;
    const email = document.getElementById("registro_correo").value;
    const telefono = document.getElementById("telefono").value;
    const password = document.getElementById("registro_contrasena").value;
    const password2 = document.getElementById("registro_contrasena2").value;

    if (password !== password2) {
      alert("Las contraseñas no coinciden");
      return;
    }
    try {
      const respuesta = await fetch(URL_REGISTRO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario,
          nombre_completo,
          correo: email,
          telefono,
          contraseña: password,
        }),
      });
      if (!respuesta.ok) {
        let errorMsg = "Error al registrar usuario";
        try {
          // Intenta mostrar el error real del backend
          const errorData = await respuesta.json();
          if (errorData.detail) errorMsg = errorData.detail;
          else if (errorData.message) errorMsg = errorData.message;
        } catch {
          // Si no es JSON, muestra el texto plano
          try {
            const errorText = await respuesta.text();
            if (errorText) errorMsg = errorText;
          } catch {}
        }
        throw new Error(errorMsg);
      }
      alert("Usuario registrado correctamente. Ahora puedes iniciar sesión");
      document.getElementById("form-registro").classList.add("hidden");
      document.querySelector(".form").classList.remove("hidden");
    } catch (error) {
      alert(error.message || "Ocurrió un error");
    }
  });
}

// 3. Productos
async function mostrarProductos() {
  try {
    const respuesta = await fetch(URL_PRODUCTOS);
    const datos = await respuesta.json();
    return datos;
  } catch (error) {
    console.log("Error al obtener productos", error);
  }
}

function renderizarProductos(productos) {
  const contenedor = document.querySelector(".productos");
  if (!contenedor) {
    console.error("No se encontró el contenedor con la clase .productos");
    return;
  }
  contenedor.innerHTML = "";
  productos.forEach((producto) => {
    contenedor.innerHTML += `
        <div class="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center mb-4 transition-transform hover:scale-105 duration-200 max-w-xs mx-auto w-full">
            <img src="productos/${
              producto.imagen || "ImageEcommerce.jpg"
            }" alt="${
      producto.nombre
    }" class="w-28 h-28 object-contain mb-3 rounded-xl bg-gray-100" loading="lazy" />
            <h3 class="text-lg font-bold text-gray-800 mb-1 text-center truncate w-full">${
              producto.nombre
            }</h3>
            <p class="text-gray-500 text-sm mb-2 text-center line-clamp-2">${
              producto.descripcion || ""
            }</p>
            <span class="text-green-600 font-bold text-xl mb-2">Bs. ${
              producto.precio
            }</span>
            <button class="mt-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-xl shadow transition-colors w-full">Agregar</button>
        </div>
        `;
  });
}

function filtrarProductos() {
  const categoriaSeleccionada = categorias.value;
  let filtrados = productosGlobal;
  if (
    categoriaSeleccionada &&
    categoriaSeleccionada !== "Todas las categorias"
  ) {
    filtrados = filtrados.filter((p) => p.categoria === categoriaSeleccionada);
  }
  if (textoBusqueda.trim() !== "") {
    const texto = textoBusqueda.trim().toLowerCase();
    filtrados = filtrados.filter(
      (p) =>
        (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(texto))
    );
  }
  productosFiltrados = filtrados;
  paginaActual = 1;
  renderizarPaginado();
}

function renderizarPaginado() {
  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  renderizarProductos(productosFiltrados.slice(inicio, fin));
  actualizarPaginacion();
}

function actualizarPaginacion() {
  if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
  const totalPaginas = Math.ceil(
    productosFiltrados.length / productosPorPagina
  );
  if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas;
}

// 4. Carrito
function agregarAlCarrito() {
  /* ... */
}
function guardarCarrito() {
  /* ... */
}

// Menú toggle (solo si los elementos existen)
const menu = document.getElementById("menu");
const lista = document.getElementById("lista");
if (menu && lista) {
  menu.addEventListener("click", () => {
    lista.classList.toggle("hidden");
  });
}

// 5. Inicialización
function init() {
  login();
  abrirRegistro();
  registrarUsuario();

  // Inicialización de productos
  mostrarProductos().then((productos) => {
    if (productos) {
      productosGlobal = productos;
      productosFiltrados = productosGlobal;
      paginaActual = 1;
      renderizarPaginado();
    }
  });

  if (categorias) {
    categorias.addEventListener("change", function () {
      filtrarProductos();
    });
  }

  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", function () {
      textoBusqueda = inputBusqueda.value;
      filtrarProductos();
    });
  }

  if (btnAnterior) {
    btnAnterior.addEventListener("click", function () {
      if (paginaActual > 1) {
        paginaActual--;
        renderizarPaginado();
      }
    });
  }

  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", function () {
      const totalPaginas = Math.ceil(
        productosFiltrados.length / productosPorPagina
      );
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarPaginado();
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", init);

// Funcionalidad específica para la página de inventario
function inicializarInventario() {
  const tablaProductos = document.getElementById("tabla-productos");
  const btnAgregarProducto = document.getElementById("btn-agregar-producto");
  const modalProducto = document.getElementById("modal-producto");
  const formProducto = document.getElementById("form-producto");
  const btnCancelar = document.getElementById("btn-cancelar");
  const buscarProducto = document.getElementById("buscar-producto");
  const filtroCategoria = document.getElementById("filtro-categoria");

  let productosInventario = [];
  let productoEditando = null;

  // Cargar productos al inicializar
  if (tablaProductos) {
    cargarProductosInventario();
  }

  // Event listeners
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

  // Cerrar modal al hacer clic fuera
  if (modalProducto) {
    modalProducto.addEventListener("click", (e) => {
      if (e.target === modalProducto) {
        cerrarModal();
      }
    });
  }

  async function cargarProductosInventario() {
    try {
      const respuesta = await fetch(URL_PRODUCTOS);
      if (!respuesta.ok) throw new Error("Error al cargar productos");

      productosInventario = await respuesta.json();
      mostrarProductosInventario(productosInventario);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      if (tablaProductos) {
        tablaProductos.innerHTML = `
                    <tr>
                        <td class="border border-gray-300 p-3 text-center text-red-500" colspan="7">
                            Error al cargar productos. Por favor, recarga la página.
                        </td>
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
                    <td class="border border-gray-300 p-3 text-center text-gray-500" colspan="7">
                        No hay productos disponibles
                    </td>
                </tr>
            `;
      return;
    }

    tablaProductos.innerHTML = productos
      .map(
        (producto) => `
            <tr>
                <td class="border border-gray-300 p-3">
                    <img src="${
                      producto.imagen || "./productos/ImageEcommerce.jpg"
                    }" 
                         alt="${producto.nombre}" 
                         class="w-12 h-12 object-cover rounded"
                         onerror="this.src='./productos/ImageEcommerce.jpg'">
                </td>
                <td class="border border-gray-300 p-3">${producto.id_producto || producto.id}</td>
                <td class="border border-gray-300 p-3">${producto.nombre}</td>
                <td class="border border-gray-300 p-3">$${producto.precio}</td>
                <td class="border border-gray-300 p-3">${
                  producto.categoria || "Sin categoría"
                }</td>
                <td class="border border-gray-300 p-3">${
                  producto.stock || "N/A"
                }</td>
                <td class="border border-gray-300 p-3">
                    <button onclick="editarProducto(${producto.id_producto || producto.id})" 
                            class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 mr-2 text-sm">
                        Editar
                    </button>
                    <button onclick="eliminarProducto(${producto.id_producto || producto.id})" 
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                        Eliminar
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function filtrarProductosInventario() {
    const textoBusqueda = buscarProducto
      ? buscarProducto.value.toLowerCase()
      : "";
    const categoriaSeleccionada = filtroCategoria ? filtroCategoria.value : "";

    const productosFiltrados = productosInventario.filter((producto) => {
      const coincideTexto = producto.nombre
        .toLowerCase()
        .includes(textoBusqueda);
      const coincideCategoria =
        !categoriaSeleccionada || producto.categoria === categoriaSeleccionada;
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
      document.getElementById("producto-categoria").value =
        producto.categoria || "";
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

    // Validar que todos los campos estén completos
    if (!nombre || !precio || !categoria || !stock) {
      alert("Por favor, completa todos los campos");
      return;
    }

    const token = getCookie("token");
    if (!token) {
      alert("No tienes permisos para realizar esta acción");
      return;
    }

    const productoData = {
      nombre,
      descripcion: categoria, // Usando categoría como descripción temporalmente
      precio,
      stock,
      categoria,
    };

    try {
      let respuesta;
      if (productoEditando) {
        // Actualizar producto existente
        respuesta = await fetch(
          `${URL_PRODUCTOS.replace("?skip=0&limit=100", "")}${
            productoEditando.id_producto || productoEditando.id
          }`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(productoData),
          }
        );
      } else {
        // Crear nuevo producto
        respuesta = await fetch(
          URL_PRODUCTOS.replace("?skip=0&limit=100", ""),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(productoData),
          }
        );
      }

      if (respuesta.ok) {
        cerrarModal();
        await cargarProductosInventario();
        alert(
          productoEditando
            ? "Producto actualizado correctamente"
            : "Producto agregado correctamente"
        );
      } else {
        // Manejo de errores más específico
        let errorMessage = "Error al guardar el producto";
        try {
          const errorData = await respuesta.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // Si no se puede parsear como JSON, usar el status
          errorMessage = `Error ${respuesta.status}: ${respuesta.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert(error.message || "Error al guardar el producto. Por favor, inténtalo de nuevo.");
    }
  }

  // Funciones globales para los botones
  window.editarProducto = function (id) {
    const producto = productosInventario.find((p) => (p.id_producto || p.id) === id);
    if (producto) {
      abrirModal(producto);
    }
  };

  window.eliminarProducto = async function (id) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        const token = getCookie("token");
        const respuesta = await fetch(
          `${URL_PRODUCTOS.replace("?skip=0&limit=100", "")}${id}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          }
        );

        if (respuesta.ok) {
          await cargarProductosInventario();
          alert("Producto eliminado correctamente");
        } else {
          const errorData = await respuesta.json().catch(() => null);
          throw new Error(errorData?.detail || "Error al eliminar el producto");
        }
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert(error.message || "Error al eliminar el producto. Por favor, inténtalo de nuevo.");
      }
    }
  };
}

// Inicializar funcionalidad específica según la página
document.addEventListener("DOMContentLoaded", function () {
  // Detectar qué página estamos cargando
  const currentPage = window.location.pathname.split("/").pop();

  // Proteger páginas según el tipo
  if (
    [
      "administracion.html",
      "inventario.html",
      "usuarios.html",
      "ventas.html",
    ].includes(currentPage)
  ) {
    if (!protegerRutaAdmin()) {
      return; // Si la protección falla, no continuar
    }
    inicializarLogoutAdmin();
  } else if (currentPage === "home.html") {
    if (!protegerRutaUsuario()) {
      return; // Si la protección falla, no continuar
    }
    inicializarHome();
  }

  // Inicializar funcionalidad específica de cada página
  if (
    document.getElementById("tabla-productos") &&
    document.getElementById("btn-agregar-producto")
  ) {
    inicializarInventario();
  }

  if (
    document.getElementById("tabla-usuarios") &&
    document.getElementById("btn-agregar-usuario")
  ) {
    inicializarUsuarios();
  }

  if (
    document.getElementById("tabla-ventas") &&
    document.getElementById("btn-nueva-venta")
  ) {
    inicializarVentas();
  }
});

function inicializarLogoutAdmin() {
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", cerrarSesion);
  }
}

function inicializarHome() {
  // Mostrar botón de administración solo si es administrador
  const btnAdmin = document.getElementById("btn-admin");
  if (btnAdmin && verificarEsAdministrador()) {
    btnAdmin.classList.remove("hidden");
  }

  // Manejar logout en home
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", cerrarSesion);
  }
}

// Funcionalidad para la página de usuarios
function inicializarUsuarios() {
  const tablaUsuarios = document.getElementById("tabla-usuarios");
  const btnAgregarUsuario = document.getElementById("btn-agregar-usuario");
  const modalUsuario = document.getElementById("modal-usuario");
  const formUsuario = document.getElementById("form-usuario");
  const btnCancelarUsuario = document.getElementById("btn-cancelar-usuario");
  const buscarUsuario = document.getElementById("buscar-usuario");
  const filtroTipo = document.getElementById("filtro-tipo");

  let usuariosLista = [];
  let usuarioEditando = null;

  // Cargar usuarios simulados (hasta que tengas la API)
  if (tablaUsuarios) {
    cargarUsuarios();
  }

  // Event listeners
  if (btnAgregarUsuario) {
    btnAgregarUsuario.addEventListener("click", () => {
      abrirModalUsuario();
    });
  }

  if (btnCancelarUsuario) {
    btnCancelarUsuario.addEventListener("click", () => {
      cerrarModalUsuario();
    });
  }

  if (formUsuario) {
    formUsuario.addEventListener("submit", (e) => {
      e.preventDefault();
      guardarUsuario();
    });
  }

  if (buscarUsuario) {
    buscarUsuario.addEventListener("input", filtrarUsuarios);
  }

  if (filtroTipo) {
    filtroTipo.addEventListener("change", filtrarUsuarios);
  }

  function cargarUsuarios() {
    // Cargar usuarios desde la API real
    fetch(URL_USUARIOS, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getCookie("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al cargar usuarios");
        }
        return response.json();
      })
      .then((data) => {
        usuariosLista = data.map((usuario) => ({
          id: usuario.id_usuario,
          nombre_usuario: usuario.nombre_usuario,
          email: usuario.correo,
          nombre_completo: usuario.nombre_completo,
          telefono: usuario.telefono || "N/A",
          tipo: usuario.rol,
          estado: "activo", // Por defecto, ya que tu API no tiene estado
          fecha_registro: usuario.fecha_registro
            ? usuario.fecha_registro.split("T")[0]
            : "N/A",
        }));
        mostrarUsuarios(usuariosLista);
      })
      .catch((error) => {
        console.error("Error al cargar usuarios:", error);
        // Mostrar datos simulados si hay error (fallback)
        usuariosLista = [
          {
            id: 1,
            nombre_usuario: "admin",
            email: "admin@kiosco.com",
            nombre_completo: "Administrador",
            telefono: "N/A",
            tipo: "administrador",
            estado: "activo",
            fecha_registro: "2024-01-15",
          },
          {
            id: 2,
            nombre_usuario: "cliente1",
            email: "cliente@email.com",
            nombre_completo: "Cliente Ejemplo",
            telefono: "123456789",
            tipo: "comprador",
            estado: "activo",
            fecha_registro: "2024-03-05",
          },
        ];
        mostrarUsuarios(usuariosLista);

        if (tablaUsuarios) {
          tablaUsuarios.innerHTML =
            `
                    <tr>
                        <td class="border border-gray-300 p-3 text-center text-yellow-600" colspan="7">
                            ⚠️ No se pudieron cargar los usuarios desde el servidor. Mostrando datos de ejemplo.
                        </td>
                    </tr>
                ` + tablaUsuarios.innerHTML;
        }
      });
  }

  function mostrarUsuarios(usuarios) {
    if (!tablaUsuarios) return;

    if (usuarios.length === 0) {
      tablaUsuarios.innerHTML = `
                <tr>
                    <td class="border border-gray-300 p-3 text-center text-gray-500" colspan="7">
                        No hay usuarios disponibles
                    </td>
                </tr>
            `;
      return;
    }

    tablaUsuarios.innerHTML = usuarios
      .map(
        (usuario) => `
            <tr>
                <td class="border border-gray-300 p-3">${usuario.id}</td>
                <td class="border border-gray-300 p-3">${
                  usuario.nombre_usuario
                }</td>
                <td class="border border-gray-300 p-3">${usuario.email}</td>
                <td class="border border-gray-300 p-3">
                    <span class="px-2 py-1 rounded text-sm ${
                      usuario.tipo === "administrador"
                        ? "bg-red-100 text-red-800"
                        : usuario.tipo === "comprador"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }">
                        ${
                          usuario.tipo === "administrador"
                            ? "Administrador"
                            : usuario.tipo === "comprador"
                            ? "Cliente"
                            : usuario.tipo.charAt(0).toUpperCase() +
                              usuario.tipo.slice(1)
                        }
                    </span>
                </td>
                <td class="border border-gray-300 p-3">
                    <span class="px-2 py-1 rounded text-sm ${
                      usuario.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }">
                        ${
                          usuario.estado.charAt(0).toUpperCase() +
                          usuario.estado.slice(1)
                        }
                    </span>
                </td>
                <td class="border border-gray-300 p-3">${
                  usuario.fecha_registro
                }</td>
                <td class="border border-gray-300 p-3">
                    <button onclick="editarUsuario(${usuario.id})" 
                            class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 mr-2 text-sm">
                        Editar
                    </button>
                    <button onclick="eliminarUsuario(${usuario.id})" 
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                        Eliminar
                    </button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function filtrarUsuarios() {
    const textoBusqueda = buscarUsuario
      ? buscarUsuario.value.toLowerCase()
      : "";
    const tipoSeleccionado = filtroTipo ? filtroTipo.value : "";

    const usuariosFiltrados = usuariosLista.filter((usuario) => {
      const coincideTexto =
        usuario.nombre_usuario.toLowerCase().includes(textoBusqueda) ||
        usuario.email.toLowerCase().includes(textoBusqueda);
      const coincideTipo =
        !tipoSeleccionado || usuario.tipo === tipoSeleccionado;
      return coincideTexto && coincideTipo;
    });

    mostrarUsuarios(usuariosFiltrados);
  }

  function abrirModalUsuario(usuario = null) {
    if (!modalUsuario || !formUsuario) return;

    usuarioEditando = usuario;
    const modalTitulo = document.getElementById("modal-titulo-usuario");

    if (usuario) {
      modalTitulo.textContent = "Editar Usuario";
      document.getElementById("usuario-nombre").value = usuario.nombre_usuario;
      document.getElementById("usuario-email").value = usuario.email;
      document.getElementById("usuario-tipo").value = usuario.tipo;
      // No mostrar la contraseña por seguridad
      document.getElementById("usuario-password").required = false;
    } else {
      modalTitulo.textContent = "Agregar Usuario";
      formUsuario.reset();
      document.getElementById("usuario-password").required = true;
    }

    modalUsuario.classList.remove("hidden");
  }

  function cerrarModalUsuario() {
    if (modalUsuario) {
      modalUsuario.classList.add("hidden");
    }
    usuarioEditando = null;
  }

  function guardarUsuario() {
    const nombre = document.getElementById("usuario-nombre").value;
    const email = document.getElementById("usuario-email").value;
    const password = document.getElementById("usuario-password").value;
    const tipo = document.getElementById("usuario-tipo").value;

    // Aquí deberías conectar con tu API
    // Por ahora, simularemos la operación

    if (usuarioEditando) {
      // Actualizar usuario existente
      const index = usuariosLista.findIndex((u) => u.id === usuarioEditando.id);
      if (index !== -1) {
        usuariosLista[index] = {
          ...usuariosLista[index],
          nombre_usuario: nombre,
          email: email,
          tipo: tipo,
        };
      }
      alert("Usuario actualizado correctamente");
    } else {
      // Crear nuevo usuario
      const nuevoUsuario = {
        id: Math.max(...usuariosLista.map((u) => u.id)) + 1,
        nombre_usuario: nombre,
        email: email,
        tipo: tipo,
        estado: "activo",
        fecha_registro: new Date().toISOString().split("T")[0],
      };
      usuariosLista.push(nuevoUsuario);
      alert("Usuario agregado correctamente");
    }

    cerrarModalUsuario();
    mostrarUsuarios(usuariosLista);
  }

  // Funciones globales para los botones
  window.editarUsuario = function (id) {
    const usuario = usuariosLista.find((u) => u.id === id);
    if (usuario) {
      abrirModalUsuario(usuario);
    }
  };

  window.eliminarUsuario = function (id) {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      usuariosLista = usuariosLista.filter((u) => u.id !== id);
      mostrarUsuarios(usuariosLista);
      alert("Usuario eliminado correctamente");
    }
  };
}

// Funcionalidad para la página de ventas
function inicializarVentas() {
  const tablaVentas = document.getElementById("tabla-ventas");
  const btnNuevaVenta = document.getElementById("btn-nueva-venta");
  const modalVenta = document.getElementById("modal-venta");
  const formVenta = document.getElementById("form-venta");
  const btnCancelarVenta = document.getElementById("btn-cancelar-venta");

  let ventasLista = [];

  // Cargar ventas simuladas (hasta que tengas la API)
  if (tablaVentas) {
    cargarVentas();
  }

  // Event listeners
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

  function cargarVentas() {
    // Datos simulados hasta que tengas la API
    ventasLista = [
      {
        id: 1,
        cliente: "Juan Pérez",
        fecha: "2024-12-01",
        productos: ["Coca-Cola", "Papas"],
        total: 25.5,
        estado: "completada",
      },
      {
        id: 2,
        cliente: "María García",
        fecha: "2024-12-02",
        productos: ["Café", "Galletas"],
        total: 15.75,
        estado: "completada",
      },
      {
        id: 3,
        cliente: "Pedro López",
        fecha: "2024-12-03",
        productos: ["Leche", "Pan"],
        total: 8.25,
        estado: "pendiente",
      },
    ];

    mostrarVentas(ventasLista);
    actualizarEstadisticas();
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
                <td class="border border-gray-300 p-3">${venta.productos.join(
                  ", "
                )}</td>
                <td class="border border-gray-300 p-3">$${venta.total.toFixed(
                  2
                )}</td>
                <td class="border border-gray-300 p-3">
                    <span class="px-2 py-1 rounded text-sm ${
                      venta.estado === "completada"
                        ? "bg-green-100 text-green-800"
                        : venta.estado === "pendiente"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }">
                        ${
                          venta.estado.charAt(0).toUpperCase() +
                          venta.estado.slice(1)
                        }
                    </span>
                </td>
                <td class="border border-gray-300 p-3">
                    <button onclick="verDetalleVenta(${venta.id})" 
                            class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mr-2 text-sm">
                        Ver
                    </button>
                    <button onclick="eliminarVenta(${venta.id})" 
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                        Eliminar
                    </button>
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
    const promedioVenta =
      ventasLista.length > 0
        ? ventasLista.reduce((sum, v) => sum + v.total, 0) / ventasLista.length
        : 0;

    // Actualizar elementos
    const elementoVentasHoy = document.getElementById("ventas-hoy");
    const elementoVentasMes = document.getElementById("ventas-mes");
    const elementoTotalVentas = document.getElementById("total-ventas");
    const elementoPromedioVenta = document.getElementById("promedio-venta");

    if (elementoVentasHoy)
      elementoVentasHoy.textContent = `$${totalVentasHoy.toFixed(2)}`;
    if (elementoVentasMes)
      elementoVentasMes.textContent = `$${totalVentasMes.toFixed(2)}`;
    if (elementoTotalVentas) elementoTotalVentas.textContent = totalVentas;
    if (elementoPromedioVenta)
      elementoPromedioVenta.textContent = `$${promedioVenta.toFixed(2)}`;
  }

  function abrirModalVenta() {
    if (!modalVenta) return;

    // Configurar fecha actual
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

  // Funciones globales para los botones
  window.verDetalleVenta = function (id) {
    const venta = ventasLista.find((v) => v.id === id);
    if (venta) {
      alert(
        `Detalles de la venta #${venta.id}:\nCliente: ${
          venta.cliente
        }\nFecha: ${venta.fecha}\nProductos: ${venta.productos.join(
          ", "
        )}\nTotal: $${venta.total.toFixed(2)}\nEstado: ${venta.estado}`
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
}
