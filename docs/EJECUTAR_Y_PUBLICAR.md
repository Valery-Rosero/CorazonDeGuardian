# Ejecutar y publicar

## En la computadora de desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
```

## Compilación de producción

```bash
npm run build        # genera dist/
npm run preview      # sirve dist/ en http://localhost:4173 para comprobarla
```

`dist/` no se puede abrir con doble clic sobre `index.html`: el navegador bloquea la carga de módulos y de los `.glb` desde archivos locales. Siempre hace falta un servidor (cualquiera de las opciones de abajo).

## Probar en otra computadora

**En la misma red wifi.** En la computadora del proyecto:

```bash
npm run dev -- --host
```

Vite muestra una dirección del tipo `http://192.168.x.x:5173`. Se abre esa dirección en el navegador de la otra computadora: el juego se dibuja con la tarjeta gráfica de esa máquina. Windows puede pedir permiso en el firewall la primera vez.

**Con el repositorio.** En la otra computadora, con Node.js 20 o superior:

```bash
git clone https://github.com/Valery-Rosero/ElTemploDelSol.git
cd ElTemploDelSol
npm install
npm run dev
```

## Publicar en internet

El curso pide cargar los recursos con rutas absolutas (`/models/...`, `/sounds/...`, sección 1.3). Por eso el sitio tiene que servirse desde la **raíz** de un dominio:

- **Netlify** o **Vercel**: se sube la carpeta `dist/` (o se conecta el repositorio con el comando `npm run build` y la carpeta `dist`). Sirven en la raíz de su dominio.
- **GitHub Pages**: solo funciona tal cual en un sitio de usuario (`usuario.github.io`) o con un dominio propio. En un sitio de proyecto (`usuario.github.io/ElTemploDelSol/`) las rutas absolutas no encuentran los recursos.

## Calidad gráfica

El juego elige la calidad según la tarjeta gráfica: los gráficos integrados empiezan en **baja** y las tarjetas dedicadas en **media**. Se puede cambiar en Opciones o con `?calidad=alta` en la dirección.

| Calidad | Resolución máxima | Sombras | Bloom | Profundidad de campo | Vegetación |
|---|---|---|---|---|---|
| Baja | 1× | 1024 | No | No | 40 % |
| Media | 1,5× | 2048 | Sí | No | 70 % |
| Alta | 2× | 2048 y sombra del foco del santuario | Sí | En cinemáticas | 100 % |

Si no llega a unos 55 FPS, el juego baja la resolución sola (hasta el 67 %) y la vuelve a subir cuando sobra margen.
