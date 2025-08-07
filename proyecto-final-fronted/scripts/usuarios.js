import { ENDPOINTS, fetchAPI } from './config.js';

// Gestión de usuarios
export function inicializarUsuarios() {
  const tablaUsuarios = document.getElementById("tabla-usuarios");
  const btnAgregarUsuario = document.getElementById("btn-agregar-usuario");
  const modalUsuario = document.getElementById("modal-usuario");
  const formUsuario = document.getElementById("form-usuario");
  const btnCancelarUsuario = document.getElementById("btn-cancelar-usuario");
  const buscarUsuario = document.getElementById("buscar-usuario");
  const filtroTipo = document.getElementById("filtro-tipo");

  let usuariosLista = [];
  let usuarioEditando = null;

  if (tablaUsuarios) {
    cargarUsuarios();
  }

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

  async function cargarUsuarios() {
    try {
      if (!tablaUsuarios) return;
      
      // Mostrar estado de carga
      tablaUsuarios.innerHTML = `
        <tr>
          <td class="border border-gray-300 p-3" colspan="7">
            <div class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p class="mt-2 text-gray-600">Cargando usuarios...</p>
            </div>
          </td>
        </tr>
      `;

      const data = await fetchAPI(ENDPOINTS.usuarios.listar);
      
      usuariosLista = data.map((usuario) => ({
        id: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        email: usuario.correo,
        nombre_completo: usuario.nombre_completo,
        telefono: usuario.telefono || "N/A",
        tipo: usuario.rol,
        estado: "activo",
        fecha_registro: usuario.fecha_registro
          ? usuario.fecha_registro.split("T")[0]
          : "N/A",
      }));
      
      mostrarUsuarios(usuariosLista);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      if (tablaUsuarios) {
        tablaUsuarios.innerHTML = `
          <tr>
            <td class="border border-gray-300 p-3 text-center" colspan="7">
              <div class="flex flex-col items-center justify-center py-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-red-500 font-medium">Error al cargar usuarios</p>
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
                <td class="border border-gray-300 p-3">${usuario.nombre_usuario}</td>
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
                            : usuario.tipo.charAt(0).toUpperCase() + usuario.tipo.slice(1)
                        }
                    </span>
                </td>
                <td class="border border-gray-300 p-3">
                    <span class="px-2 py-1 rounded text-sm ${
                      usuario.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }">
                        ${usuario.estado.charAt(0).toUpperCase() + usuario.estado.slice(1)}
                    </span>
                </td>
                <td class="border border-gray-300 p-3">${usuario.fecha_registro}</td>
                <td class="border border-gray-300 p-3">
                    <button onclick="editarUsuario(${usuario.id})" class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 mr-2 text-sm">Editar</button>
                    <button onclick="eliminarUsuario(${usuario.id})" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">Eliminar</button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  function filtrarUsuarios() {
    const textoBusqueda = buscarUsuario ? buscarUsuario.value.toLowerCase() : "";
    const tipoSeleccionado = filtroTipo ? filtroTipo.value : "";
    const usuariosFiltrados = usuariosLista.filter((usuario) => {
      const coincideTexto =
        usuario.nombre_usuario.toLowerCase().includes(textoBusqueda) ||
        usuario.email.toLowerCase().includes(textoBusqueda);
      const coincideTipo = !tipoSeleccionado || usuario.tipo === tipoSeleccionado;
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
    if (usuarioEditando) {
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
