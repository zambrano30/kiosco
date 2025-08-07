# The Kiosco - Frontend

## Descripción
Frontend para el sistema de gestión de kiosco desarrollado con HTML, CSS (Tailwind), y JavaScript vanilla.

## Estructura del Proyecto
```
proyecto-final-fronted/
├── administracion.html     # Panel de administración
├── index.html             # Página principal (tienda)
├── inventario.html        # Gestión de productos
├── login.html            # Inicio de sesión
├── usuarios.html         # Gestión de usuarios
├── ventas.html           # Gestión de ventas
├── scripts/              # Archivos JavaScript
│   ├── auth.js          # Autenticación
│   ├── config.js        # Configuración y endpoints
│   ├── main.js          # Script principal
│   ├── productos.js     # Gestión de productos
│   ├── usuarios.js      # Gestión de usuarios
│   ├── ventas.js        # Gestión de ventas
│   └── tienda.js        # Funcionalidad de la tienda
├── src/                  # Archivos CSS
│   ├── input.css        # CSS fuente
│   └── output.css       # CSS compilado con Tailwind
└── productos/           # Imágenes de productos
```

## Tecnologías Utilizadas
- **HTML5**: Estructura de las páginas
- **Tailwind CSS**: Framework de estilos
- **JavaScript ES6+**: Funcionalidad del frontend
- **Fetch API**: Comunicación con el backend

## Configuración

### Requisitos
- Navegador web moderno
- Servidor HTTP para desarrollo (opcional)

### Instalación
1. Clona el repositorio
2. Navega al directorio del proyecto
3. Ejecuta un servidor local (recomendado):
   ```bash
   python -m http.server 8000
   ```
4. Abre tu navegador en `http://localhost:8000`

### Backend
El frontend está configurado para conectarse con el backend en:
```
https://funval-backend.onrender.com
```

## Funcionalidades

### Páginas Principales
- **index.html**: Tienda para compradores
- **login.html**: Autenticación de usuarios
- **administracion.html**: Panel principal de administración

### Módulos de Administración
- **inventario.html**: CRUD de productos
- **usuarios.html**: Gestión de usuarios registrados
- **ventas.html**: Historial y estadísticas de ventas

### Características
- ✅ Autenticación JWT
- ✅ CRUD completo de productos
- ✅ Gestión de usuarios
- ✅ Historial de ventas con estadísticas
- ✅ Diseño responsive
- ✅ Manejo de errores
- ✅ Estados de carga

## API Endpoints

El frontend consume los siguientes endpoints:

```javascript
// Productos
GET    /productos          // Listar productos
POST   /productos          // Crear producto
PUT    /productos/{id}     // Actualizar producto
DELETE /productos/{id}     // Eliminar producto

// Usuarios
GET    /usuarios           // Listar usuarios

// Ventas
GET    /ventas             // Listar ventas

// Autenticación
POST   /login              // Iniciar sesión
POST   /registro-comprador // Registrar cliente
```

## Desarrollo

### Estructura de Archivos JavaScript
- **config.js**: Configuración de endpoints y función fetchAPI
- **auth.js**: Manejo de autenticación y sesiones
- **main.js**: Inicialización y router principal
- **productos.js**: Lógica de gestión de productos
- **usuarios.js**: Lógica de gestión de usuarios
- **ventas.js**: Lógica de gestión de ventas
- **tienda.js**: Funcionalidad para compradores

### Tailwind CSS
El proyecto usa Tailwind CSS para los estilos. Para compilar:
```bash
npx tailwindcss -i ./src/input.css -o ./src/output.css --watch
```

## Despliegue

### Archivos Esenciales para Producción
```
administracion.html
index.html
inventario.html
login.html
usuarios.html
ventas.html
scripts/
src/output.css
productos/
package.json
```

### Archivos Excluidos (ver .gitignore)
- Archivos de prueba y desarrollo
- Documentación adicional
- Archivos temporales
- node_modules/

## Autor
Proyecto desarrollado como trabajo final.

## Licencia
Este proyecto es para fines educativos.
