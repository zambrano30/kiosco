import { ENDPOINTS, fetchAPI } from './config.js';

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
  window.usuariosLista = usuariosLista;
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
      console.log('🚫 Botón cancelar clickeado');
      cerrarModalUsuario();
    });
  } else {
    console.warn('⚠️ Botón cancelar usuario no encontrado al inicializar');
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
  id: String(usuario.id_usuario),
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
      window.usuariosLista = usuariosLista;
      mostrarUsuarios(usuariosLista);
      mostrarNotificacion('Usuarios cargados correctamente', 'success');
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      mostrarNotificacion('Error al cargar usuarios', 'error');
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
      // Encabezado con columna para nombre completo
      tablaUsuarios.innerHTML = `
        <tr class="bg-gray-50 border-b border-gray-200">
          <th class="border border-gray-300 p-3">ID</th>
          <th class="border border-gray-300 p-3">Usuario</th>
          <th class="border border-gray-300 p-3">Email</th>
          <th class="border border-gray-300 p-3">Nombre completo</th>
          <th class="border border-gray-300 p-3">Teléfono</th>
          <th class="border border-gray-300 p-3">Tipo</th>
          <th class="border border-gray-300 p-3">Estado</th>
          <th class="border border-gray-300 p-3">Fecha registro</th>
          <th class="border border-gray-300 p-3">Acciones</th>
        </tr>
        ` +
        usuarios
        .map(
          (usuario) => `
            <tr>
              <td class="border border-gray-300 p-3">${usuario.id}</td>
              <td class="border border-gray-300 p-3">${usuario.nombre_usuario}</td>
              <td class="border border-gray-300 p-3">${usuario.email}</td>
              <td class="border border-gray-300 p-3">${usuario.nombre_completo || ''}</td>
              <td class="border border-gray-300 p-3">${usuario.telefono}</td>
              <td class="border border-gray-300 p-3">${usuario.tipo}</td>
              <td class="border border-gray-300 p-3">${usuario.estado}</td>
              <td class="border border-gray-300 p-3">${usuario.fecha_registro}</td>
              <td class="border border-gray-300 p-3">
                <div class="flex gap-2 justify-center">
                  <button onclick="editarUsuario('${usuario.id}')" 
                          class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors text-sm flex items-center justify-center"
                          title="Editar usuario">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onclick="eliminarUsuario('${usuario.id}')" 
                          class="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors text-sm flex items-center justify-center"
                          title="Eliminar usuario">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
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
    console.log('🔍 Intentando abrir modal usuario...');
    console.log('📄 Página actual:', window.location.pathname);
    console.log('🌐 Todo el DOM:', document.documentElement.outerHTML.length, 'caracteres');
    
    // Listar todos los elementos con ID
    const todosLosIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    console.log('🏷️ Todos los IDs encontrados:', todosLosIds);
    
    // Buscar específicamente el modal
    const modalUsuario = document.getElementById("modal-usuario");
    console.log('🎭 Modal encontrado:', modalUsuario);
    console.log('🎭 Modal por querySelector:', document.querySelector('#modal-usuario'));
    
    if (!modalUsuario) {
      console.error("❌ Error: Modal usuario no encontrado");
      console.log('🔍 Intentando buscar por clase...');
      const modalPorClase = document.querySelector('.fixed.inset-0');
      console.log('🔍 Modal por clase:', modalPorClase);
      
      mostrarNotificacion('Error: No se pudo abrir el modal de usuario', 'error');
      return;
    }
    
    const formUsuario = document.getElementById("form-usuario");
    const modalTitulo = document.getElementById("modal-titulo-usuario");
    
    console.log('📋 Elementos encontrados:', {
      modalUsuario: !!modalUsuario,
      formUsuario: !!formUsuario,
      modalTitulo: !!modalTitulo
    });
    
    if (!formUsuario) {
      console.error("❌ Error: Formulario usuario no encontrado");
      mostrarNotificacion('Error: No se pudo cargar el formulario', 'error');
      return;
    }
    
    usuarioEditando = usuario;
    
    // Manejar título del modal
    if (modalTitulo) {
      modalTitulo.textContent = usuario ? "Editar Usuario" : "Agregar Usuario";
    }
    
    // Manejar campos del formulario
    if (usuario) {
      const nombreInput = document.getElementById("usuario-nombre");
      const emailInput = document.getElementById("usuario-email");
      const tipoSelect = document.getElementById("usuario-tipo");
      const passwordInput = document.getElementById("usuario-password");
      
      if (nombreInput) nombreInput.value = usuario.nombre_usuario || '';
      if (emailInput) emailInput.value = usuario.email || '';
      if (tipoSelect) tipoSelect.value = usuario.tipo || '';
      if (passwordInput) passwordInput.required = false;
    } else {
      formUsuario.reset();
      const passwordInput = document.getElementById("usuario-password");
      if (passwordInput) passwordInput.required = true;
    }
    
    // Mostrar modal
    modalUsuario.classList.remove("hidden");
    modalUsuario.style.display = 'flex'; // Forzar display por si las clases fallan
    
    // Configurar event listeners dinámicamente para asegurar que funcionen
    const btnCancelar = document.getElementById("btn-cancelar-usuario");
    if (btnCancelar) {
      // Remover listeners anteriores y agregar nuevo
      btnCancelar.replaceWith(btnCancelar.cloneNode(true));
      const btnCancelarNuevo = document.getElementById("btn-cancelar-usuario");
      btnCancelarNuevo.addEventListener("click", () => {
        console.log('🚫 Botón cancelar clickeado (dinámico)');
        cerrarModalUsuario();
      });
      console.log('✅ Event listener de cancelar configurado dinámicamente');
    }
    
    // También permitir cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cerrarModalUsuario();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Cerrar al hacer clic fuera del modal
    modalUsuario.addEventListener('click', (e) => {
      if (e.target === modalUsuario) {
        cerrarModalUsuario();
      }
    });
    
    console.log('✅ Modal abierto');
  }

  function cerrarModalUsuario() {
    console.log('🚫 Cerrando modal usuario...');
    const modalUsuario = document.getElementById("modal-usuario");
    if (modalUsuario) {
      modalUsuario.classList.add("hidden");
      modalUsuario.style.display = 'none'; // Forzar display none
      console.log('✅ Modal cerrado');
    } else {
      console.error("❌ Error: Modal usuario no encontrado al intentar cerrar");
    }
    usuarioEditando = null;
    
    // Limpiar formulario
    const formUsuario = document.getElementById("form-usuario");
    if (formUsuario) {
      formUsuario.reset();
    }
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
      mostrarNotificacionUsuarios("Usuario actualizado correctamente", 'success');
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
      mostrarNotificacionUsuarios("Usuario agregado correctamente", 'success');
    }
    cerrarModalUsuario();
    mostrarUsuarios(usuariosLista);
  }

  window.editarUsuario = function (id) {
    console.log('🔧 Intentando editar usuario con ID:', id);
    console.log('📋 Lista de usuarios disponible:', window.usuariosLista);
    console.log('📋 Lista local:', usuariosLista);
    
    // Buscar en la lista global primero, luego en la local
    let usuario = window.usuariosLista ? window.usuariosLista.find((u) => u.id == id) : null;
    if (!usuario && usuariosLista) {
      usuario = usuariosLista.find((u) => u.id == id);
    }
    
    console.log('👤 Usuario encontrado:', usuario);
    
    if (usuario) {
      console.log('✅ Abriendo modal para editar usuario');
      abrirModalUsuario(usuario);
    } else {
      console.error('❌ Usuario no encontrado');
      mostrarNotificacion('Error: Usuario no encontrado', 'error');
    }
  };

  window.eliminarUsuario = function (id) {
    console.log('🗑️ Intentando eliminar usuario con ID:', id);
    
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      // Actualizar ambas listas
      if (window.usuariosLista) {
        window.usuariosLista = window.usuariosLista.filter((u) => u.id != id);
      }
      usuariosLista = usuariosLista.filter((u) => u.id != id);
      
      console.log('✅ Usuario eliminado de las listas');
      mostrarUsuarios(usuariosLista);
      mostrarNotificacion("Usuario eliminado correctamente", "success");
    }
  };

  // Hacer la función cerrarModalUsuario disponible globalmente
  window.cerrarModalUsuario = cerrarModalUsuario;
}


