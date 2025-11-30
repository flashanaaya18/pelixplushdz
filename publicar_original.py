import json
import os
from datetime import datetime, timezone
import sys
import time
import re
import shutil

# --- Verificación de dependencias ---
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Faltan bibliotecas necesarias. Por favor, instálalas ejecutando:")
    print("pip install requests beautifulsoup4")
    sys.exit(1)

# --- NUEVO: Importar el script url.py como un módulo ---
try:
    import url as url_extractor
except ImportError:
    print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el script 'url.py'. Asegúrate de que esté en la misma carpeta.{C.END}")
    url_extractor = None

# Manejo de compatibilidad para versiones de Python < 3.9
try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:
    print("Módulo 'zoneinfo' no encontrado. Se requiere Python 3.9+ para el manejo de zonas horarias.")
    print("Se utilizará una implementación básica.")
    class ZoneInfo:
        def __init__(self, key): self.key = key

# --- Colores para la interfaz ---
class C:
    HEADER = '\033[95m'; MAGENTA = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'; ORANGE = '\033[38;5;208m'
    PINK = '\033[38;5;205m'; PURPLE = '\033[38;5;93m'; LIGHT_BLUE = '\033[38;5;117m'
    LIGHT_GREEN = '\033[38;5;120m'; GOLD = '\033[38;5;220m'; GREY = '\033[90m'; WHITE = '\033[97m'; END = '\033[0m'
    BOLD = '\033[1m'; UNDERLINE = '\033[4m'; BLINK = '\033[5m'

# --- Constantes ---
JS_FILE = 'peliculas.js'
REPORTS_FILE = 'reports.json'
PROXIMAMENTE_FILE = 'proximamente.json'
BASE_DATOS_FILE = 'base_datos.json'
MAINTENANCE_FLAG = 'maintenance.flag'
CAMPAIGN_FILE = 'campaña_proximamente.txt'
NOTIFICACIONES_FILE = 'lanzamientos_notificaciones.json'
CONTENT_TYPES = {'1': 'pelicula', '2': 'serie'}
CATEGORIAS_DISPONIBLES = [
    "lanzamientos-recientes", "accion", "aventura", "terror", "documental",
    "anime", "series", "dragon-ball", "todos", "estrenos", "clasicos", "comedia", "drama",
    "todo-lo-nuevo-2025"
]
PLATAFORMAS_DISPONIBLES = [
    "netflix", "prime video", "disney+", "max", "apple tv+", "star+", 
    "paramount+", "hulu", "crunchyroll", "vix", "youtube", "cine",
    "pelicula", "documental"
]
TIMEZONE = "America/Mexico_City"

try:
    TZ = ZoneInfo(TIMEZONE)
except (NameError, ZoneInfoNotFoundError):
    TZ = None # Fallback si zoneinfo no está disponible o la zona no es válida

# --- Funciones de Utilidad ---
def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def cargar_peliculas():
    try:
        with open(JS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'const\s+peliculas\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if not match:
            print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el array 'const peliculas' en '{JS_FILE}'.{C.END}")
            sys.exit(1)
        return json.loads(match.group(1))
    except FileNotFoundError:
        print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el archivo '{JS_FILE}'.{C.END}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"{C.BOLD}{C.RED}❌ Error: El formato del array en '{JS_FILE}' no es un JSON válido.{C.END}")
        sys.exit(1)

def guardar_peliculas(peliculas, crear_backup=True):
    try:
        # --- NUEVO: Copia de seguridad automática ---
        if crear_backup and os.path.exists(JS_FILE):
            backup_file = JS_FILE + '.bak'
            shutil.copy2(JS_FILE, backup_file)
            print(f"{C.GREY} -> Creada copia de seguridad en '{backup_file}'{C.END}")

        peliculas.sort(key=lambda x: x.get('titulo', ''))
        json_string = json.dumps(peliculas, ensure_ascii=False, indent=4)
        js_content = f"const peliculas = {json_string};"
        with open(JS_FILE, 'w', encoding='utf-8') as f: # type: ignore
            f.write(js_content)
        print(f"\n{C.BOLD}{C.GREEN}🎉 ¡Cambios en la biblioteca guardados con éxito!{C.END}")
    except Exception as e:
        print(f"\n{C.BOLD}{C.RED}💥 Error al guardar los cambios: {e}{C.END}")

def mostrar_banner():
    print(f"{C.BOLD}{C.PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗{C.END}")
    print(f"{C.BOLD}{C.PURPLE}║{C.END}{C.BOLD}{C.GOLD}                          🎬✨ Panel de Administración peliXx ✨📺                         {C.END}{C.BOLD}{C.PURPLE}║{C.END}")
    print(f"{C.BOLD}{C.PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝{C.END}\n")

def mostrar_separador(color=C.PURPLE, longitud=80):
    print(f"{C.BOLD}{color}═{C.END}" * longitud)

def mostrar_menu_principal(peliculas, proximamente, cambios_pendientes=False):
    limpiar_pantalla(); mostrar_banner()
    
    num_reportes = 0
    if os.path.exists(REPORTS_FILE):
        with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
            try: num_reportes = len(json.load(f))
            except json.JSONDecodeError: pass
    
    campaña_activa = os.path.exists(CAMPAIGN_FILE)
    mantenimiento_activo = os.path.exists(MAINTENANCE_FLAG)
    
    # --- NUEVO: Desglose de contenido ---
    num_peliculas = sum(1 for p in peliculas if p.get('tipo') == 'pelicula')
    num_series = len(peliculas) - num_peliculas
    print(f"{C.BOLD}{C.LIGHT_BLUE}📊 RESUMEN:{C.END} {C.CYAN}Películas:{C.END} {C.GOLD}{num_peliculas}{C.END} | {C.PINK}Series:{C.END} {C.GOLD}{num_series}{C.END} | {C.ORANGE}Próximamente:{C.END} {C.GOLD}{len(proximamente)}{C.END}")
    
    # --- NUEVO: Mostrar los últimos títulos añadidos ---
    if peliculas:
        print(f"\n{C.BOLD}{C.LIGHT_BLUE}✨ ÚLTIMOS 5 AÑADIDOS:{C.END}")
        ultimos_titulos = sorted([p for p in peliculas if 'addedDate' in p], key=lambda x: x['addedDate'], reverse=True)[:5]
        for item in ultimos_titulos:
            icono = "🎬" if item.get('tipo', 'pelicula') == 'pelicula' else "📺"
            print(f"   {C.GREY} L {icono} {item.get('titulo', 'Sin Título')}{C.END}")

    if cambios_pendientes:
        print(f"\n{C.BLINK}{C.GOLD}✨ ¡Tienes cambios pendientes de guardar!{C.END}")
    if num_reportes > 0:
        print(f"\n{C.BLINK}{C.RED}🚨 ¡ALERTA: {num_reportes} reporte(s) de contenido pendiente(s)!{C.END}")
    if mantenimiento_activo:
        print(f"\n{C.BLINK}{C.ORANGE}🔧 ¡ATENCIÓN: El modo mantenimiento está ACTIVO!{C.END}")

    print(f"\n{C.BOLD}{C.PURPLE}🎯 MENÚ PRINCIPAL{C.END}")
    mostrar_separador(C.PURPLE, 40)
    
    print(f"  {C.BOLD}{C.CYAN}1. 🎬 Añadir nuevo contenido{C.END}")
    print(f"  {C.BOLD}{C.CYAN}2. ✏️  Editar contenido existente{C.END}")
    print(f"  {C.BOLD}{C.CYAN}3. 🗑️  Eliminar contenido{C.END}")
    print(f"  {C.BOLD}{C.CYAN}5. 🔍 Revisar Contenido y Fuentes{C.END}")
    print(f"  {C.BOLD}{C.CYAN}6. 🌐 Extractor Universal de Videos (url.py){C.END}")
    print(f"  {C.BOLD}{C.CYAN}7. 🔧 Validar Integridad de Datos{C.END}")
    print(f"  {C.BOLD}{C.CYAN}8. 📢 Ver reportes de contenido{C.END}")
    print(f"  {C.BOLD}{C.CYAN}9. 📋 Gestionar 'Próximamente'{C.END}")
    print(f"  {C.BOLD}{C.CYAN}10.🚀 Ver Lanzamientos Programados{C.END}")
    print(f"  {C.BOLD}{C.ORANGE}11.⚡ Marcar Contenido Roto (Rápido){C.END}")
    print(f"  {C.BOLD}{C.GOLD}12.🗃️  Base de Datos Rápida (Borradores){C.END}")
    print(f"  {C.BOLD}{C.LIGHT_BLUE}13.📊 Tabla de Contenido (Activo/Inactivo){C.END}")
    print(f"  {C.BOLD}{C.MAGENTA}14.✨ Optimizar Página (Minificar JS, Limpiar, Sitemap){C.END}")
    print(f"  {C.BOLD}{C.CYAN}15.⚙️  Control Central (Monitoreo y Optimización){C.END}")
    
    print(f"\n  {C.BOLD}{C.GREEN}4.  Guardar todos los cambios{C.END}")
    print(f"  {C.BOLD}{C.YELLOW}0. 🚪 Salir sin guardar{C.END}")

    estado_campaña = f"{C.GREEN}Activa{C.END}" if campaña_activa else f"{C.YELLOW}Inactiva{C.END}"
    print(f"  {C.BOLD}{C.PINK}🎪 C.{C.END} {C.PINK}Activar/Desactivar Campaña 'Próximamente' ({estado_campaña}){C.END}")
    estado_mantenimiento = f"{C.RED}Activo{C.END}" if mantenimiento_activo else f"{C.GREEN}Inactivo{C.END}"
    print(f"  {C.BOLD}{C.ORANGE}🔧 M.{C.END} {C.ORANGE}Activar/Desactivar Modo Mantenimiento ({estado_mantenimiento}){C.END}")
    
    mostrar_separador(C.PURPLE, 40)
    
    while True:
        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}").lower()
        if opcion in ['c', 'm']:
            return opcion
        try:
            opcion_num = int(opcion)
            if opcion_num in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]:
                return opcion_num
            else:
                print(f"{C.BOLD}{C.RED}❌ Opción no válida. Inténtalo de nuevo.{C.END}")
        except ValueError:
            print(f"{C.BOLD}{C.RED}❌ Por favor, introduce un número o 'c'.{C.END}")

def cargar_proximamente():
    try:
        with open(PROXIMAMENTE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def guardar_proximamente(proximamente, crear_backup=True):
    # --- NUEVO: Copia de seguridad automática ---
    if crear_backup and os.path.exists(PROXIMAMENTE_FILE):
        backup_file = PROXIMAMENTE_FILE + '.bak'
        shutil.copy2(PROXIMAMENTE_FILE, backup_file)
        print(f"{C.GREY} -> Creada copia de seguridad en '{backup_file}'{C.END}")

    with open(PROXIMAMENTE_FILE, 'w', encoding='utf-8') as f: # type: ignore
        json.dump(proximamente, f, ensure_ascii=False, indent=4)
    print(f"\n{C.BOLD}{C.GREEN}✅ Lista 'Próximamente' guardada.{C.END}")

def cargar_base_datos():
    try:
        with open(BASE_DATOS_FILE, 'r', encoding='utf-8') as f: # type: ignore
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def guardar_base_datos(base_datos, crear_backup=True):
    if crear_backup and os.path.exists(BASE_DATOS_FILE):
        backup_file = BASE_DATOS_FILE + '.bak'
        shutil.copy2(BASE_DATOS_FILE, backup_file)
        print(f"{C.GREY} -> Creada copia de seguridad en '{backup_file}'{C.END}")

    with open(BASE_DATOS_FILE, 'w', encoding='utf-8') as f: # type: ignore
        json.dump(base_datos, f, ensure_ascii=False, indent=4)
    print(f"\n{C.BOLD}{C.GREEN}✅ Base de datos rápida guardada.{C.END}")

def confirmar_accion(mensaje):
    """Pide una confirmación de sí/no al usuario."""
    respuesta = input(f"{C.BOLD}{C.YELLOW}{mensaje} (s/n): {C.END}").lower()
    return respuesta in ['s', 'si', 'y', 'yes']

def procesar_url_embed(url):
    """
    Añade parámetros a URLs de embeds para una apariencia más limpia,
    específicamente para ocultar las pestañas de opciones.
    """
    if "embed69.org/f/" in url:
        # Usamos un conjunto para evitar añadir parámetros duplicados
        params_to_add = {'options=false', 'controls=false'}
        
        if '?' in url:
            existing_params = set(url.split('?')[1].split('&'))
            params_to_add -= existing_params # Quita los que ya existen
            if params_to_add:
                return url + '&' + '&'.join(params_to_add)
        else:
            return url + '?' + '&'.join(params_to_add)
    return url

# --- Funciones Principales del Menú ---

def seleccionar_categoria(accion="asignar"):
    """Muestra un menú para seleccionar una categoría y la devuelve."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}📂--- SELECCIONA LA CATEGORÍA PARA {accion.upper()} ---{C.END}\n")
    for i, categoria in enumerate(CATEGORIAS_DISPONIBLES):
        print(f"  {C.BOLD}{C.GREEN}{i + 1}.{C.END} {C.PINK}{categoria.replace('-', ' ').capitalize()}{C.END}")
    print(f"\n  {C.BOLD}{C.YELLOW}🚪 0. Cancelar{C.END}")
    
    while True:
        try:
            opcion = int(input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una categoría: {C.END}"))
            if opcion == 0:
                return None
            if 1 <= opcion <= len(CATEGORIAS_DISPONIBLES):
                return CATEGORIAS_DISPONIBLES[opcion - 1]
            else:
                print(f"{C.BOLD}{C.RED}❌ Opción no válida. Inténtalo de nuevo.{C.END}")
        except ValueError:
            print(f"{C.BOLD}{C.RED}❌ Por favor, introduce un número.{C.END}")

def seleccionar_plataforma():
    """Muestra un menú para seleccionar una plataforma y la devuelve."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}🖥️ --- SELECCIONA LA PLATAFORMA DE ORIGEN ---{C.END}\n")
    for i, plataforma in enumerate(PLATAFORMAS_DISPONIBLES):
        print(f"  {C.BOLD}{C.GREEN}{i + 1}.{C.END} {C.LIGHT_BLUE}{plataforma.capitalize()}{C.END}")
    print(f"\n  {C.BOLD}{C.YELLOW}🚪 0. Omitir / Sin plataforma{C.END}")

    while True:
        try:
            opcion = int(input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una plataforma: {C.END}"))
            if opcion == 0:
                return None
            if 1 <= opcion <= len(PLATAFORMAS_DISPONIBLES):
                return PLATAFORMAS_DISPONIBLES[opcion - 1]
            else:
                print(f"{C.BOLD}{C.RED}❌ Opción no válida. Inténtalo de nuevo.{C.END}")
        except ValueError:
            print(f"{C.BOLD}{C.RED}❌ Por favor, introduce un número.{C.END}")

def seleccionar_contenido(peliculas, accion="seleccionar"):
    """Función de selección avanzada con paginación y búsqueda."""
    page_size = 15
    page_number = 0
    lista_filtrada = peliculas[:]

    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.PURPLE}--- {accion.upper()} CONTENIDO ---{C.END}")
        if lista_filtrada != peliculas:
             print(f"{C.YELLOW}Mostrando resultados de búsqueda. Total: {len(lista_filtrada)}{C.END}")

        start_index = page_number * page_size
        end_index = start_index + page_size
        current_page_items = lista_filtrada[start_index:end_index]

        if not current_page_items:
            print(f"\n{C.BOLD}{C.YELLOW}📭 No hay contenido para mostrar.{C.END}")
        else:
            for i, item in enumerate(current_page_items, start=start_index + 1):
                tipo = item.get('tipo', 'N/A').capitalize()
                año = item.get('año', '????')
                color_tipo = C.CYAN if item.get('tipo') == 'pelicula' else C.PINK
                estado = f" {C.RED}💔{C.END}" if item.get('esta_roto') else ""
                print(f"  {C.BOLD}{C.GREEN}{i:3}.{C.END} {item['titulo']:<50} {C.GREY}({color_tipo}{tipo}{C.END}{C.GREY}, {año}){C.END}{estado}")

        # --- Controles de Paginación ---
        total_pages = (len(lista_filtrada) + page_size - 1) // page_size
        print(f"\n{C.BOLD}Página {page_number + 1} de {total_pages}{C.END}")
        print(f"{C.CYAN}[S]{C.END}iguiente | {C.CYAN}[A]{C.END}nterior | {C.CYAN}[B]{C.END}uscar | {C.YELLOW}[Número]{C.END} para seleccionar | {C.RED}[0]{C.END} para Cancelar")
        
        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}").lower()

        if opcion == 's':
            if (page_number + 1) < total_pages: page_number += 1
        elif opcion == 'a':
            if page_number > 0: page_number -= 1
        elif opcion == 'b':
            busqueda = input(f"{C.BOLD}{C.BLUE}🔎 Introduce el título a buscar (deja en blanco para ver todo): {C.END}").lower()
            if busqueda:
                lista_filtrada = [p for p in peliculas if busqueda in p.get('titulo', '').lower()]
            else:
                lista_filtrada = peliculas[:]
            page_number = 0 # Resetear a la primera página
        elif opcion == '0':
            return None
        else:
            try:
                idx = int(opcion)
                if 1 <= idx <= len(lista_filtrada):
                    return lista_filtrada[idx - 1]
                else:
                    print(f"{C.RED}❌ Número fuera de rango.{C.END}"); time.sleep(1)
            except ValueError:
                print(f"{C.RED}❌ Opción no válida.{C.END}"); time.sleep(1)

def scrape_url(url):
    """
    Función auxiliar para extraer datos de una URL de dominios compatibles.
    Devuelve un diccionario con los datos o None si falla.
    """
    dominios_compatibles = ["pelisplushd.mx", "pelisplushd.to", "pelisplus.do"]
    if not any(domain in url for domain in dominios_compatibles):
        print(f"\n{C.BOLD}{C.RED}❌ URL no válida. Dominios compatibles: {', '.join(dominios_compatibles)}.{C.END}")
        return None

    try:
        print(f"\n{C.BOLD}{C.CYAN}🔄 Obteniendo datos desde la URL...{C.END}")
        headers = {'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # --- NUEVO: Lógica de scraping condicional por dominio ---
        if "pelisplus.do" in url:
            # Selectores específicos para pelisplus.do
            titulo_tag = soup.find('h1', class_='text-2xl')
            poster_tag = soup.select_one('div.w-full.sm\\:w-1\\/3.md\\:w-1\\/4 img') # Selector con el caracter '/' escapado
            descripcion_tag = soup.select_one('div.text-sm.text-gray-400 p') # CORRECCIÓN: El <p> está dentro de un <div>
            # Para el año, buscamos en los detalles que están en una lista
            details_list = soup.select('ul.flex.flex-wrap li a')
            año_text = next((a.text for a in details_list if a.text.isdigit() and len(a.text) == 4), None)
            año = int(año_text) if año_text else datetime.now().year
            
            generos_tags = soup.select('ul.flex.flex-wrap.gap-x-2.gap-y-2 li a[href*="/genero/"]')
            genero = ", ".join([tag.text for tag in generos_tags])
            
            iframe_tag = soup.find('iframe', class_='w-full') # Iframe tiene una clase específica
        else:
            # Selectores para los otros dominios (pelisplushd.mx, .to)
            titulo_tag = soup.find('h1', class_='title') 
            poster_tag = soup.find('div', class_='poster')
            descripcion_tag = soup.find('div', class_='wp-content')
            año_tag = soup.find('span', class_='year')
            año = int(año_tag.text) if año_tag and año_tag.text.isdigit() else datetime.now().year
            generos_tags = soup.select('div.genres a')
            genero = ", ".join([tag.text for tag in generos_tags])
            iframe_tag = soup.find('iframe', id='iframe-player')

        # --- Procesamiento unificado de los datos extraídos ---
        titulo = titulo_tag.text.strip() if titulo_tag else "Título no encontrado"
        poster = poster_tag['src'] if poster_tag and poster_tag.get('src') else ""
        descripcion = descripcion_tag.text.strip() if descripcion_tag else "Descripción no encontrada."
        
        iframe_url = ""
        if iframe_tag and iframe_tag.get('src'):
            iframe_url = iframe_tag['src']
            print(f"{C.GREEN}✅ Iframe encontrado directamente.{C.END}")
        else:
            print(f"{C.YELLOW}⚠️  No se encontró un iframe directo. Revisa la página manualmente.{C.END}")

        # Detección de tipo unificada
        tipo = 'serie' if '/serie' in url else 'pelicula'

        return {"titulo": titulo, "poster": poster, "descripcion": descripcion, "año": año, "genero": genero, "tipo": tipo, "iframe_url": iframe_url}

    except Exception as e:
        print(f"\n{C.BOLD}{C.RED}💥 Error al procesar la URL: {e}{C.END}")
        return None

def anadir_contenido(peliculas, proximamente):
    """Crea una nueva película o serie pidiendo los datos al usuario, con gestión de duplicados."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}➕--- AÑADIR NUEVO CONTENIDO ---{C.END}\n")
    print(f"  {C.BOLD}{C.CYAN}🎬 1.{C.END} {C.LIGHT_GREEN}Película{C.END}")
    print(f"  {C.BOLD}{C.CYAN}📺 2.{C.END} {C.LIGHT_GREEN}Serie{C.END}")
    tipo_num_str = input(f"\n{C.BOLD}{C.BLUE}🎭 ¿Qué tipo de contenido quieres añadir? (1/2): {C.END}")
    tipo = CONTENT_TYPES.get(tipo_num_str)
    if not tipo:
        print(f"{C.BOLD}{C.RED}❌ Opción no válida.{C.END}"); return None

    scraped_data = {}
    if confirmar_accion("🌐 ¿Quieres intentar añadir desde una URL (ej: pelisplushd)?"):
        url = input(f"{C.BOLD}{C.BLUE}🔗 Pega la URL: {C.END}")
        if url:
            scraped_data = scrape_url(url) or {}
            if scraped_data:
                print(f"\n{C.BOLD}{C.GREEN}🎉 ¡Datos extraídos! Verifica y completa la información.{C.END}")
                # Forzar el tipo de contenido basado en la URL si se extrajo Y si el usuario no eligió nada
                if scraped_data.get('tipo'):
                    tipo = scraped_data['tipo']
                    print(f"{C.BOLD}{C.YELLOW}ℹ️  Tipo de contenido detectado: {tipo.upper()}{C.END}")
                
                # --- NUEVO: Mostrar el iframe encontrado ---
                iframe_encontrado = scraped_data.get("iframe_url")
                if iframe_encontrado:
                    print(f"{C.BOLD}{C.GREEN}📹 Iframe detectado:{C.END} {C.LIGHT_BLUE}{iframe_encontrado}{C.END}")

    # Si no hay datos extraídos, o el tipo no está definido, preguntar de nuevo

    categoria_seleccionada = seleccionar_categoria("el nuevo contenido") or 'todos'
    plataforma_seleccionada = seleccionar_plataforma()

    print(f"\n{C.BOLD}{C.PURPLE}📝--- RELLENA LOS DATOS PARA LA NUEVA {tipo.upper()} ---{C.END}\n")
    
    titulo_nuevo = input(f"{C.BOLD}{C.BLUE}📝 Nombre ({scraped_data.get('titulo', '')}): {C.END}") or scraped_data.get('titulo')

    if not titulo_nuevo:
        print(f"\n{C.BOLD}{C.RED}❌ El título es un campo obligatorio. Operación cancelada.{C.END}")
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        return None
    
    contenido_existente = next((p for p in peliculas if p.get('titulo', '').strip().lower() == titulo_nuevo.strip().lower()), None)

    if contenido_existente:
        print(f"\n{C.BOLD}{C.YELLOW}⚠️ ¡ATENCIÓN! Ya existe un contenido con el título '{titulo_nuevo}'.{C.END}")
        opcion_duplicado = input(f"  {C.CYAN}✏️ 1. Editar existente{C.END} | {C.GREEN}📋 2. Crear de todos modos{C.END} | {C.YELLOW}🚪 0. Cancelar{C.END}\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}")
        if opcion_duplicado == '1': return ('EDITAR', contenido_existente)
        elif opcion_duplicado == '0': return None

    nuevo_contenido = {
        "tipo": tipo, 
        "titulo": titulo_nuevo,
        "poster": input(f"{C.BOLD}{C.BLUE}🖼️  URL Portada ({scraped_data.get('poster', '')}): {C.END}") or scraped_data.get('poster', ''),
        "descripcion": input(f"{C.BOLD}{C.BLUE}📄 Descripción ({scraped_data.get('descripcion', '')[:50]}...): {C.END}") or scraped_data.get('descripcion', ''),
        "categoria": categoria_seleccionada,
        "duracion": input(f"{C.BOLD}{C.BLUE}⏱️  Duración (ej: 2h 15m): {C.END}") or "N/A",
        "director": input(f"{C.BOLD}{C.BLUE}🎬 Director: {C.END}") or "N/A",
        "reparto": [actor.strip() for actor in input(f"{C.BOLD}{C.BLUE}👥 Reparto (separado por comas): {C.END}").split(',')],
        "favorito": False,
        "genero": input(f"{C.BOLD}{C.BLUE}🎭 Género ({scraped_data.get('genero', '')}): {C.END}") or scraped_data.get('genero', ''),
        "calidad": input(f"{C.BOLD}{C.BLUE}📺 Calidad (ej: 1080p): {C.END}") or "HD",
        "addedDate": datetime.now().isoformat(), # NUEVO: Fecha de adición
        "tamaño": input(f"{C.BOLD}{C.BLUE}💾 Tamaño (ej: 2.1 GB): {C.END}") or "N/A",
    }

    # --- Entradas numéricas con validación ---
    while True:
        try:
            año_str = input(f"{C.BOLD}{C.BLUE}📅 Año ({scraped_data.get('año', '')}): {C.END}") or scraped_data.get('año') or datetime.now().year
            nuevo_contenido['año'] = int(año_str)
            break
        except ValueError: print(f"{C.RED}❌ Año no válido. Introduce un número.{C.END}")
    while True:
        try:
            cal_str = input(f"{C.BOLD}{C.BLUE}⭐ Calificación (ej: 8.5): {C.END}") or "0"
            nuevo_contenido['calificacion'] = float(cal_str)
            break
        except ValueError: print(f"{C.RED}❌ Calificación no válida. Introduce un número (ej: 8.5).{C.END}")
    while True:
        try:
            votos_str = input(f"{C.BOLD}{C.BLUE}👍 Votos (ej: 1500): {C.END}") or "0"
            nuevo_contenido['votos'] = int(votos_str)
            break
        except ValueError: print(f"{C.RED}❌ Votos no válidos. Introduce un número entero.{C.END}")
    # --- Fin de validaciones ---

    nuevo_contenido['es_nuevo'] = confirmar_accion("🆕 ¿Es un estreno (etiqueta 'NUEVO')?")
    nuevo_contenido['es_reciente'] = confirmar_accion("✨ ¿Es un contenido reciente?")
    nuevo_contenido['esta_roto'] = confirmar_accion("💔 ¿Está roto el contenido?")

    clasificacion_edad = input(f"{C.BOLD}{C.BLUE}🔞 Clasificación de Edad (ej: +18): {C.END}").strip()
    if clasificacion_edad: nuevo_contenido['clasificacion_edad'] = clasificacion_edad
    if plataforma_seleccionada: nuevo_contenido['plataforma'] = plataforma_seleccionada

    if tipo == 'pelicula':
        nuevo_contenido["fuentes"] = []
        while confirmar_accion("\n🎥 ¿Añadir una fuente de video?"):
            idioma = input(f"  {C.BOLD}{C.BLUE}🗣️  Idioma (ej: Latino, Español, Subtitulado): {C.END}")
            url = input(f"  {C.BOLD}{C.BLUE}🌐 URL del video ({scraped_data.get('iframe_url', '')}): {C.END}") or scraped_data.get('iframe_url', '')
            if idioma and url:
                url_procesada = procesar_url_embed(url)
                if url_procesada != url:
                    print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                nuevo_contenido["fuentes"].append({"idioma": idioma, "url": url_procesada})
    
    elif tipo == 'serie':
        nuevo_contenido["temporadas"] = []
        while True:
            if not confirmar_accion("\n📀 ¿Añadir una temporada?"): break
            try: 
                num_temp = int(input(f"  {C.BOLD}{C.BLUE}🔢 Número de la temporada: {C.END}"))
                nueva_temporada = {'temporada': num_temp, 'episodios': []}
                total_episodios = int(input(f"    {C.BOLD}{C.BLUE}🔢 ¿Cuántos episodios tiene la temporada {num_temp}?: {C.END}"))
                if total_episodios > 0:
                    for i in range(1, total_episodios + 1):
                        print(f"\n{C.BOLD}{C.CYAN}--- Añadiendo Episodio {i} ---{C.END}")
                        url_ep = input(f"      {C.BOLD}{C.BLUE}🌐 URL Episodio {i}: {C.END}")
                        if url_ep:
                            url_procesada = procesar_url_embed(url_ep)
                            if url_procesada != url_ep:
                                print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                            nueva_temporada['episodios'].append({'episodio': i, 'titulo': f'Episodio {i}', 'url': url_procesada})
                nuevo_contenido["temporadas"].append(nueva_temporada)
            except ValueError:
                print(f"{C.BOLD}{C.RED}❌ Entrada no válida. Se omitió la temporada.{C.END}")

    # --- NUEVO: Verificación de contenido sin video ---
    sin_video = (tipo == 'pelicula' and not nuevo_contenido.get('fuentes')) or \
                (tipo == 'serie' and not any(temp.get('episodios') for temp in nuevo_contenido.get('temporadas', [])))

    if sin_video:
        print(f"\n{C.BOLD}{C.YELLOW}⚠️  No se han añadido fuentes de video para '{nuevo_contenido['titulo']}'.{C.END}")
        if confirmar_accion("¿Quieres mover este contenido a la lista de 'Próximamente' para añadirlo más tarde?"):
            proximamente.append({'titulo': nuevo_contenido['titulo'], 'poster': nuevo_contenido['poster'], 'tipo': tipo})
            print(f"\n{C.BOLD}{C.GREEN}✅ Movido a 'Próximamente'. No se añadirá a la biblioteca principal ahora.{C.END}")
            return None # No se añade a la lista de cambios principal
    return ('AÑADIR', nuevo_contenido)

def editar_fuentes_pelicula(item):
    """Interfaz para editar las fuentes de una película."""
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.PURPLE}--- EDITANDO FUENTES DE: {item['titulo']} ---{C.END}\n")
        
        # Asegurarnos de que 'fuentes' existe y es una lista
        if 'fuentes' not in item:
            item['fuentes'] = []
            
        fuentes = item['fuentes']
        
        if not fuentes:
            print(f"{C.YELLOW}📭 No hay fuentes de video.{C.END}")
        else:
            for i, fuente in enumerate(fuentes, 1):
                if isinstance(fuente, dict):
                    print(f"  {C.BOLD}{i}.{C.END} {C.GREEN}{fuente.get('idioma', 'N/A')}:{C.END} {C.LIGHT_BLUE}{fuente.get('url', 'N/A')}{C.END}")
                else:
                    print(f"  {C.BOLD}{i}.{C.END} {C.RED}❌ FUENTE CON FORMATO INVÁLIDO{C.END}")

        print("\n" + C.BOLD + "1. Añadir | 2. Editar | 3. Eliminar | 0. Volver" + C.END)
        op = input("Elige: ")
        if op == '1':
            idioma = input(f"  {C.BOLD}{C.BLUE}🗣️  Idioma: {C.END}")
            url = input(f"  {C.BOLD}{C.BLUE}🌐 URL: {C.END}")
            if idioma and url:
                url_procesada = procesar_url_embed(url)
                if url_procesada != url:
                    print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                fuentes.append({"idioma": idioma, "url": url_procesada})
                print(f"{C.GREEN}✅ Fuente añadida.{C.END}")
        elif op == '2':
            try:
                idx = int(input("Número de la fuente a editar: ")) - 1
                if 0 <= idx < len(fuentes):
                    fuente_a_editar = fuentes[idx]
                    if isinstance(fuente_a_editar, dict):
                        fuente_a_editar['idioma'] = input(f"  Nuevo idioma ({fuente_a_editar.get('idioma', '')}): ") or fuente_a_editar.get('idioma', '')
                        nueva_url = input(f"  Nueva URL ({fuente_a_editar.get('url', '')}): ") or fuente_a_editar.get('url', '')
                        url_procesada = procesar_url_embed(nueva_url)
                        if url_procesada != nueva_url:
                            print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                        fuente_a_editar['url'] = url_procesada
                        print(f"{C.GREEN}✅ Fuente actualizada.{C.END}")
                    else:
                        print(f"{C.RED}❌ La fuente tiene formato inválido.{C.END}")
            except (ValueError, IndexError): 
                print(f"{C.RED}❌ Número no válido.{C.END}")
        elif op == '3':
            try:
                idx = int(input("Número de la fuente a eliminar: ")) - 1
                if 0 <= idx < len(fuentes): 
                    fuentes.pop(idx)
                    print(f"{C.GREEN}✅ Fuente eliminada.{C.END}")
            except (ValueError, IndexError): 
                print(f"{C.RED}❌ Número no válido.{C.END}")
        elif op == '0':
            break

def editar_temporadas_serie(item):
    """Interfaz para editar las temporadas y episodios de una serie."""
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.PURPLE}--- EDITANDO TEMPORADAS DE: {item['titulo']} ---{C.END}\n")
        
        # Asegurarnos de que 'temporadas' existe y es una lista
        if 'temporadas' not in item:
            item['temporadas'] = []
        
        temporadas = item['temporadas']
        
        if not temporadas:
            print(f"{C.YELLOW}📭 No hay temporadas.{C.END}")
        else:
            for i, temp in enumerate(temporadas, 1):
                # Verificar que temp sea un diccionario
                if isinstance(temp, dict):
                    num_temp = temp.get('temporada', 'N/A')
                    episodios = temp.get('episodios', [])
                    print(f"  {C.BOLD}{i}.{C.END} {C.GREEN}Temporada {num_temp}{C.END} ({C.CYAN}{len(episodios)} episodios{C.END})")
                else:
                    print(f"  {C.BOLD}{i}.{C.END} {C.RED}❌ TEMPORADA CON FORMATO INVÁLIDO: {temp}{C.END}")

        print("\n" + C.BOLD + "1. Añadir Temporada | 2. Editar Temporada | 3. Eliminar Temporada | 0. Volver" + C.END)
        op_temp = input("Elige: ")

        if op_temp == '0':
            break
        elif op_temp == '1': # Añadir temporada
            try:
                num_temp = int(input(f"  {C.BOLD}{C.BLUE}🔢 Número de la nueva temporada: {C.END}"))
                if any(isinstance(t, dict) and t.get('temporada') == num_temp for t in temporadas):
                    print(f"{C.RED}❌ La temporada {num_temp} ya existe.{C.END}"); time.sleep(1)
                    continue
                nueva_temporada = {'temporada': num_temp, 'episodios': []}
                temporadas.append(nueva_temporada)
                temporadas.sort(key=lambda t: t['temporada'] if isinstance(t, dict) else 0)
                print(f"{C.GREEN}✅ Temporada {num_temp} añadida.{C.END}")
            except ValueError:
                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)
        elif op_temp == '2': # Editar temporada
            try:
                idx_temp_str = input("Número de la temporada a editar: ")
                idx_temp = int(idx_temp_str) - 1
                if 0 <= idx_temp < len(temporadas):
                    temporada_a_editar = temporadas[idx_temp]
                    
                    # Verificar que sea un diccionario válido
                    if not isinstance(temporada_a_editar, dict):
                        print(f"{C.RED}❌ La temporada seleccionada tiene un formato inválido.{C.END}")
                        time.sleep(2)
                        continue
                        
                    while True: # Sub-menú para episodios
                        limpiar_pantalla()
                        num_temporada = temporada_a_editar.get('temporada', '?')
                        print(f"{C.BOLD}{C.CYAN}--- EDITANDO EPISODIOS DE TEMPORADA {num_temporada} ---{C.END}\n")
                        
                        # Asegurarnos de que 'episodios' existe y es una lista
                        if 'episodios' not in temporada_a_editar:
                            temporada_a_editar['episodios'] = []
                            
                        episodios = temporada_a_editar['episodios']
                        
                        if not episodios:
                            print(f"{C.YELLOW}📭 No hay episodios en esta temporada.{C.END}")
                        else:
                            for i, ep in enumerate(episodios, 1):
                                if isinstance(ep, dict):
                                    num_ep = ep.get('episodio', '?')
                                    titulo_ep = ep.get('titulo', f'Episodio {num_ep}')
                                    print(f"  {C.BOLD}{i}.{C.END} {C.GREEN}E{num_ep}: {titulo_ep}{C.END}")
                                else:
                                    print(f"  {C.BOLD}{i}.{C.END} {C.RED}❌ EPISODIO CON FORMATO INVÁLIDO{C.END}")

                        print("\n" + C.BOLD + "1. Añadir Episodio | 2. Editar Episodio | 3. Eliminar Episodio | 0. Volver a Temporadas" + C.END)
                        op_ep = input("Elige: ")

                        if op_ep == '0': 
                            break
                        elif op_ep == '1': # Añadir episodio
                            try:
                                num_ep = int(input(f"  {C.BOLD}Número del nuevo episodio: {C.END}"))
                                titulo_ep = input(f"  {C.BOLD}Título del episodio (ej: El Despertar): {C.END}") or f"Episodio {num_ep}"
                                url_ep = input(f"  {C.BOLD}URL del episodio: {C.END}")
                                if url_ep:
                                    url_procesada = procesar_url_embed(url_ep)
                                    if url_procesada != url_ep:
                                        print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                                    nuevo_episodio = {'episodio': num_ep, 'titulo': titulo_ep, 'url': url_procesada}
                                    episodios.append(nuevo_episodio)
                                    episodios.sort(key=lambda e: e['episodio'] if isinstance(e, dict) else 0)
                                    print(f"{C.GREEN}✅ Episodio {num_ep} añadido.{C.END}")
                            except ValueError: 
                                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)
                        elif op_ep == '2': # Editar episodio
                            try:
                                idx_ep = int(input("Número del episodio a editar: ")) - 1
                                if 0 <= idx_ep < len(episodios):
                                    episodio_a_editar = episodios[idx_ep]
                                    if isinstance(episodio_a_editar, dict):
                                        episodio_a_editar['titulo'] = input(f"  Nuevo título ({episodio_a_editar.get('titulo', '')}): ") or episodio_a_editar.get('titulo', '')
                                        nueva_url = input(f"  Nueva URL ({episodio_a_editar.get('url', '')}): ") or episodio_a_editar.get('url', '')
                                        url_procesada = procesar_url_embed(nueva_url)
                                        if url_procesada != nueva_url:
                                            print(f"{C.GREY} -> URL modificada para un reproductor limpio: {url_procesada}{C.END}")
                                        episodio_a_editar['url'] = url_procesada
                                        print(f"{C.GREEN}✅ Episodio actualizado.{C.END}")
                                    else:
                                        print(f"{C.RED}❌ El episodio tiene formato inválido.{C.END}")
                            except (ValueError, IndexError): 
                                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)
                        elif op_ep == '3': # Eliminar episodio
                            try:
                                idx_ep = int(input("Número del episodio a eliminar: ")) - 1
                                if 0 <= idx_ep < len(episodios):
                                    episodio_eliminado = episodios.pop(idx_ep)
                                    if isinstance(episodio_eliminado, dict):
                                        print(f"{C.GREEN}✅ Episodio {episodio_eliminado.get('episodio', '?')} eliminado.{C.END}")
                                    else:
                                        print(f"{C.GREEN}✅ Episodio eliminado.{C.END}")
                            except (ValueError, IndexError): 
                                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)
            except (ValueError, IndexError): 
                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)
        elif op_temp == '3': # Eliminar temporada
            try:
                idx = int(input("Número de la temporada a eliminar: ")) - 1
                if 0 <= idx < len(temporadas):
                    temporada_eliminada = temporadas.pop(idx)
                    if isinstance(temporada_eliminada, dict):
                        print(f"{C.GREEN}✅ Temporada {temporada_eliminada.get('temporada', '?')} eliminada.{C.END}")
                    else:
                        print(f"{C.GREEN}✅ Temporada eliminada.{C.END}")
            except (ValueError, IndexError): 
                print(f"{C.RED}❌ Número no válido.{C.END}"); time.sleep(1)

def editar_contenido(peliculas, editados):
    item_a_editar = seleccionar_contenido(peliculas, "editar")
    if not item_a_editar:
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return

    # --- NUEVO: Menú de edición quirúrgica ---
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.GOLD}✏️ --- EDITANDO: {C.UNDERLINE}{item_a_editar['titulo']}{C.END}{C.GOLD} ---{C.END}\n")
        
        # Crear una lista de atributos para editar
        atributos = list(item_a_editar.keys())
        for i, attr in enumerate(atributos, 1):
            valor_actual = item_a_editar[attr]
            if isinstance(valor_actual, list):
                display_val = f"[{len(valor_actual)} elementos]"
            elif isinstance(valor_actual, str) and len(valor_actual) > 40:
                display_val = valor_actual[:37] + "..."
            else:
                display_val = valor_actual
            print(f"  {C.BOLD}{C.GREEN}{i:2}.{C.END} {C.CYAN}{attr.title():<15}{C.END} {C.WHITE}{display_val}{C.END}")

        print(f"\n  {C.BOLD}{C.YELLOW}🚪 0. Terminar edición{C.END}")
        
        try:
            opcion_str = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige el campo a editar: {C.END}")
            opcion = int(opcion_str)
            if opcion == 0:
                break
            
            if 1 <= opcion <= len(atributos):
                campo_a_editar = atributos[opcion - 1]
                valor_actual = item_a_editar[campo_a_editar]

                # Lógica especial para listas
                if campo_a_editar == 'fuentes' and item_a_editar.get('tipo') == 'pelicula':
                    editar_fuentes_pelicula(item_a_editar)
                elif campo_a_editar == 'temporadas' and item_a_editar.get('tipo') == 'serie':
                    editar_temporadas_serie(item_a_editar)
                else:
                    nuevo_valor_str = input(f"\n{C.BOLD}{C.BLUE}Nuevo valor para '{campo_a_editar}' ({valor_actual}): {C.END}")
                    if nuevo_valor_str:
                        try:
                            if isinstance(valor_actual, bool):
                                item_a_editar[campo_a_editar] = nuevo_valor_str.lower() in ['s', 'si', 'true', '1', 'y']
                            elif isinstance(valor_actual, int):
                                item_a_editar[campo_a_editar] = int(nuevo_valor_str)
                            elif isinstance(valor_actual, float):
                                item_a_editar[campo_a_editar] = float(nuevo_valor_str)
                            elif isinstance(valor_actual, list):
                                item_a_editar[campo_a_editar] = [v.strip() for v in nuevo_valor_str.split(',')]
                            else:
                                item_a_editar[campo_a_editar] = nuevo_valor_str
                            
                            if item_a_editar not in editados:
                                editados.append(item_a_editar)
                            print(f"{C.GREEN}✅ Campo '{campo_a_editar}' actualizado.{C.END}")
                        except ValueError:
                            print(f"{C.RED}❌ El valor introducido no es del tipo correcto.{C.END}")
                        time.sleep(1)
            else:
                print(f"{C.RED}❌ Opción no válida.{C.END}"); time.sleep(1)
        except ValueError:
            print(f"{C.RED}❌ Entrada no válida.{C.END}"); time.sleep(1)

    print(f"\n{C.BOLD}{C.GREEN}✅ Edición de '{item_a_editar['titulo']}' finalizada.{C.END}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")

def eliminar_contenido(peliculas, eliminados):
    """Busca y permite seleccionar un contenido para eliminarlo."""
    item_a_eliminar = seleccionar_contenido(peliculas, "eliminar")
    
    if not item_a_eliminar:
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return

    if confirmar_accion(f"\n{C.BOLD}{C.RED}⚠️  ¿Seguro que quieres eliminar '{item_a_eliminar['titulo']}'?"):
        if item_a_eliminar not in eliminados:
            eliminados.append(item_a_eliminar)
        
        peliculas.remove(item_a_eliminar)
        print(f"\n{C.BOLD}{C.GREEN}✅ '{item_a_eliminar['titulo']}' marcado para eliminación.{C.END}")
    else:
        print(f"\n{C.BOLD}{C.YELLOW}🚫 Operación cancelada.{C.END}")
    
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")

def anadir_desde_url(peliculas, anadidos):
    """Ejecuta el script url.py para una extracción de video más robusta."""
    if url_extractor:
        url_extractor.main()
    else:
        print(f"\n{C.BOLD}{C.RED}❌ No se puede ejecutar el extractor. El script 'url.py' no se encontró.{C.END}")
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def validar_integridad_datos(peliculas):
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}🕵️ --- VALIDADOR DE INTEGRIDAD DE DATOS ---{C.END}\n")
    problemas = []
    titulos_vistos = set()

    for item in peliculas:
        titulo = item.get('titulo', 'Sin Título')
        if not titulo or not item.get('poster') or not item.get('descripcion'):
            problemas.append(f"{C.YELLOW}⚠️  '{titulo}': Tiene campos básicos vacíos (título, póster o descripción).{C.END}")
        
        if item.get('titulo', '').lower() in titulos_vistos:
            problemas.append(f"{C.RED}🚫 '{titulo}': Título duplicado.{C.END}")
        titulos_vistos.add(item.get('titulo', '').lower())

        año = item.get('año')
        if not isinstance(año, int) or not (1900 < año < 2030):
            problemas.append(f"{C.YELLOW}⚠️  '{titulo}': Año inválido ({año}).{C.END}")

        if item.get('tipo') == 'pelicula' and not item.get('fuentes'):
            problemas.append(f"{C.YELLOW}⚠️  Película '{titulo}': No tiene fuentes de video.{C.END}")
        
        if item.get('tipo') == 'serie' and not item.get('temporadas'):
            problemas.append(f"{C.YELLOW}⚠️  Serie '{titulo}': No tiene temporadas.{C.END}")

    if not problemas:
        print(f"{C.BOLD}{C.GREEN}✅ ¡Felicidades! No se encontraron problemas de integridad en los datos.{C.END}")
    else:
        print(f"{C.BOLD}{C.RED}❌ Se encontraron {len(problemas)} problemas:{C.END}")
        for p in problemas:
            print(f"  - {p}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def revisar_contenido_y_fuentes(peliculas):
    """Permite buscar un contenido y ver todas sus URLs para una revisión rápida."""
    item = seleccionar_contenido(peliculas, "revisar")
    if not item:
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return

    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}🔍--- REVISANDO FUENTES DE: {C.UNDERLINE}{item['titulo']}{C.END}{C.PURPLE} ---{C.END}\n")

    print(f"{C.BOLD}{C.CYAN}🖼️  URL Portada:{C.END} {C.LIGHT_BLUE}{item.get('poster', 'N/A')}{C.END}")

    if item.get('tipo') == 'pelicula' and item.get('fuentes'):
        print(f"\n{C.BOLD}{C.CYAN}🎥 Fuentes de Video (Película):{C.END}")
        for i, fuente in enumerate(item['fuentes'], 1):
            print(f"  {C.BOLD}{i}.{C.END} {C.GREEN}{fuente.get('idioma', 'N/A')}:{C.END} {C.LIGHT_BLUE}{fuente.get('url', 'N/A')}{C.END}")
    
    elif item.get('tipo') == 'serie' and item.get('temporadas'):
        print(f"\n{C.BOLD}{C.CYAN}📺 Fuentes de Video (Serie):{C.END}")
        for temporada in item['temporadas']:
            print(f"  {C.BOLD}Temporada {temporada.get('temporada', '?')}:{C.END}")
            for episodio in temporada.get('episodios', []):
                print(f"    {C.GREEN}E{episodio.get('episodio', '?')}:{C.END} {C.LIGHT_BLUE}{episodio.get('url', 'N/A')}{C.END}")

    else:
        print(f"\n{C.BOLD}{C.YELLOW}📭 No se encontraron fuentes de video para este contenido.{C.END}")

    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para volver al menú...{C.END}")

def gestionar_proximamente(proximamente, peliculas, anadidos):
    """Permite añadir, editar y eliminar contenido de la sección 'Próximamente'."""
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.PINK}🎪--- GESTIONAR CONTENIDO 'PRÓXIMAMENTE' ---{C.END}\n")
        
        if not proximamente:
            print(f"{C.BOLD}{C.YELLOW}📭 No hay contenido en 'Próximamente'.{C.END}")
        else:
            for i, item in enumerate(proximamente):
                tipo_str = item.get('tipo', 'pelicula')
                color = C.CYAN if tipo_str == 'pelicula' else C.PINK
                fecha_lanzamiento_str = ""
                if item.get('fecha_lanzamiento') and TZ:
                    try:
                        fecha_dt = datetime.fromisoformat(item['fecha_lanzamiento'])
                        fecha_lanzamiento_str = f" {C.LIGHT_BLUE}(Lanzamiento: {fecha_dt.strftime('%d/%m %H:%M')}){C.END}"
                    except (ValueError, TypeError):
                        fecha_lanzamiento_str = f" {C.RED}(Fecha inválida){C.END}"
                print(f"  {C.BOLD}{C.GREEN}{i + 1:2}.{C.END} {color}🎬[{tipo_str.upper()}]{C.END} {C.BOLD}{C.GOLD}{item['titulo']}{C.END}{fecha_lanzamiento_str}")
        
        print(f"\n{C.BOLD}{C.PURPLE}🎯 OPCIONES DISPONIBLES:{C.END}")
        print(f"  {C.BOLD}{C.CYAN}➕ 1.{C.END} {C.LIGHT_GREEN}Añadir nuevo elemento{C.END}")
        print(f"  {C.BOLD}{C.CYAN}✏️  2.{C.END} {C.LIGHT_GREEN}Editar elemento existente{C.END}")
        print(f"  {C.BOLD}{C.CYAN}🗑️  3.{C.END} {C.LIGHT_GREEN}Eliminar elemento{C.END}")
        print(f"  {C.BOLD}{C.CYAN}🚀 4.{C.END} {C.LIGHT_GREEN}Programar lanzamiento de un elemento{C.END}")
        print(f"  {C.BOLD}{C.CYAN}📚 5.{C.END} {C.LIGHT_GREEN}Publicar en Biblioteca Principal{C.END}") # NUEVA OPCIÓN
        print(f"\n  {C.BOLD}{C.YELLOW}🚪 0.{C.END} {C.YELLOW}Volver al menú principal{C.END}")
        
        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}")
        
        if opcion == '0':
            return
        elif opcion == '1':
            limpiar_pantalla()
            print(f"{C.BOLD}{C.PINK}➕--- AÑADIR A 'PRÓXIMAMENTE' ---{C.END}\n")
            titulo = input(f"{C.BOLD}{C.BLUE}📝 Título: {C.END}")
            poster = input(f"{C.BOLD}{C.BLUE}🖼️  URL de la Portada: {C.END}")
            if titulo and poster:
                nuevo_item = {'titulo': titulo, 'poster': poster}
                proximamente.append(nuevo_item)
                print(f"\n{C.BOLD}{C.GREEN}✅ Añadido '{titulo}' a 'Próximamente'.{C.END}")
            else:
                print(f"{C.BOLD}{C.RED}❌ Título y URL de la portada son obligatorios.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

        elif opcion == '2':
            if not proximamente: continue
            try:
                idx_str = input(f"\n{C.BOLD}Número del elemento a editar (0 para cancelar): {C.END}")
                idx = int(idx_str) - 1
                if idx == -1: continue
                if 0 <= idx < len(proximamente):
                    item_a_editar = proximamente[idx]
                    print(f"\n{C.BOLD}{C.YELLOW}Editando '{item_a_editar['titulo']}'. Deja en blanco para no cambiar.{C.END}")
                    item_a_editar['titulo'] = input(f"  {C.BOLD}Nuevo título:{C.END} ") or item_a_editar['titulo']
                    item_a_editar['poster'] = input(f"  {C.BOLD}Nueva portada:{C.END} ") or item_a_editar['poster']
                    print(f"\n{C.BOLD}{C.GREEN}✅ Elemento actualizado.{C.END}")
                else:
                    print(f"{C.BOLD}{C.RED}❌ Número fuera de rango.{C.END}")
            except ValueError:
                print(f"{C.BOLD}{C.RED}❌ Entrada inválida.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

        elif opcion == '3':
            if not proximamente: continue
            try:
                idx_str = input(f"\n{C.BOLD}Número del elemento a eliminar (0 para cancelar): {C.END}")
                idx = int(idx_str) - 1
                if idx == -1: continue
                if 0 <= idx < len(proximamente):
                    item_eliminado = proximamente.pop(idx)
                    print(f"\n{C.BOLD}{C.GREEN}✅ Eliminado '{item_eliminado['titulo']}' de 'Próximamente'.{C.END}")
                else:
                    print(f"{C.BOLD}{C.RED}❌ Número fuera de rango.{C.END}")
            except ValueError:
                print(f"{C.BOLD}{C.RED}❌ Entrada inválida.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        
        elif opcion == '4':
            if not proximamente or not TZ:
                if not TZ: print(f"\n{C.BOLD}{C.RED}❌ La programación de lanzamientos requiere Python 3.9+.{C.END}")
                continue
            try:
                idx_str = input(f"\n{C.BOLD}Número del elemento a programar (0 para cancelar): {C.END}")
                idx = int(idx_str) - 1
                if idx == -1: continue
                if 0 <= idx < len(proximamente):
                    item_a_programar = proximamente[idx]
                    print(f"\n{C.BOLD}{C.YELLOW}Programando '{item_a_programar['titulo']}'. Formato: YYYY-MM-DD HH:MM{C.END}")
                    fecha_str = input(f"  {C.BOLD}Fecha y hora de lanzamiento (ej: 2025-12-24 20:00): {C.END}")
                    fecha_dt = datetime.strptime(fecha_str, "%Y-%m-%d %H:%M")
                    fecha_dt_tz = fecha_dt.astimezone(TZ)
                    item_a_programar['fecha_lanzamiento'] = fecha_dt_tz.isoformat()
                    print(f"\n{C.BOLD}{C.GREEN}✅ Elemento programado para el {fecha_dt_tz.strftime('%d de %B a las %H:%M')}.{C.END}")
                else:
                    print(f"{C.BOLD}{C.RED}❌ Número fuera de rango.{C.END}")
            except (ValueError, TypeError):
                print(f"{C.BOLD}{C.RED}❌ Formato de fecha y hora inválido.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        
        elif opcion == '5': # --- NUEVO: Publicar desde Próximamente ---
            if not proximamente: continue
            try:
                idx_str = input(f"\n{C.BOLD}Número del elemento a publicar (0 para cancelar): {C.END}")
                idx = int(idx_str) - 1
                if idx == -1: continue
                if 0 <= idx < len(proximamente):
                    item_a_publicar = proximamente[idx]
                    print(f"\n{C.BOLD}{C.CYAN}🚀 Publicando '{item_a_publicar['titulo']}' en la biblioteca principal...{C.END}")
                    # Usamos los datos que ya tenemos para pre-rellenar
                    scraped_data = {'titulo': item_a_publicar['titulo'], 'poster': item_a_publicar['poster'], 'tipo': item_a_publicar.get('tipo', 'pelicula')}
                    # Llamamos a una versión modificada de anadir_contenido o un nuevo flujo
                    resultado = anadir_contenido_desde_proximamente(peliculas, proximamente, scraped_data)
                    if resultado:
                        accion, payload = resultado
                        if accion == 'AÑADIR':
                            peliculas.append(payload)
                            anadidos.append(payload)
                            proximamente.pop(idx) # Eliminar de la lista de próximamente
                            print(f"\n{C.BOLD}{C.GREEN}✅ '{payload['titulo']}' publicado y movido a la biblioteca.{C.END}")
                            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter...{C.END}")
                            return # Volver al menú principal para reflejar cambios
            except (ValueError, IndexError):
                print(f"{C.BOLD}{C.RED}❌ Entrada inválida.{C.END}")

def gestionar_base_datos(base_datos):
    """Permite añadir, buscar, editar y eliminar borradores en la base de datos rápida."""
    def seleccionar_borrador(accion="seleccionar"):
        if not base_datos:
            print(f"{C.BOLD}{C.YELLOW}📭 No hay borradores para {accion}.{C.END}")
            return None
        limpiar_pantalla()
        print(f"{C.BOLD}{C.GOLD}🎯--- SELECCIONA EL BORRADOR PARA {accion.upper()} ---{C.END}\n")
        for i, item in enumerate(base_datos):
            print(f"  {C.BOLD}{C.GREEN}{i + 1:2}.{C.END} {C.BOLD}{C.GOLD}{item['titulo']}{C.END}")
        print(f"\n  {C.BOLD}{C.YELLOW}🚪 0. Cancelar{C.END}")
        while True:
            try:
                opcion = int(input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}"))
                if opcion == 0: return None
                if 1 <= opcion <= len(base_datos): return opcion - 1
                else: print(f"{C.BOLD}{C.RED}❌ Opción no válida.{C.END}")
            except ValueError: print(f"{C.BOLD}{C.RED}❌ Introduce un número.{C.END}")

    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.GOLD}🗃️ --- BASE DE DATOS RÁPIDA (BORRADORES) ---{C.END}\n")
        if not base_datos:
            print(f"{C.BOLD}{C.YELLOW}📭 La base de datos está vacía.{C.END}")
        else:
            print(f"{C.BOLD}{C.CYAN}Hay {len(base_datos)} borradores guardados.{C.END}")

        print(f"\n{C.BOLD}{C.PURPLE}🎯 OPCIONES:{C.END}")
        print(f"  {C.BOLD}➕ 1.{C.END} Añadir borrador")
        print(f"  {C.BOLD}🔍 2.{C.END} Buscar y ver borradores")
        print(f"  {C.BOLD}✏️  3.{C.END} Editar un borrador")
        print(f"  {C.BOLD}🗑️  4.{C.END} Eliminar un borrador")
        print(f"  {C.BOLD}{C.GREEN}🚀 5.{C.END} Publicar borrador en la biblioteca")
        print(f"\n  {C.BOLD}{C.YELLOW}🚪 0.{C.END} Volver al menú principal")
        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}")

        if opcion == '0':
            # Devuelve los cambios para que el bucle principal los detecte
            return base_datos
        elif opcion == '1':
            limpiar_pantalla(); print(f"{C.BOLD}{C.GOLD}➕--- AÑADIR NUEVO BORRADOR ---{C.END}\n")
            titulo = input(f"{C.BOLD}{C.BLUE}📝 Título (obligatorio): {C.END}")
            if not titulo:
                print(f"\n{C.BOLD}{C.RED}❌ El título es obligatorio.{C.END}")
            else:
                nuevo_item = {'titulo': titulo}
                print(f"\n{C.BOLD}{C.CYAN}--- Campos Opcionales ---{C.END}")
                nuevo_item['poster'] = input(f"{C.BOLD}{C.BLUE}🖼️  URL Portada: {C.END}")
                nuevo_item['url_video'] = input(f"{C.BOLD}{C.BLUE}🎥 URL Video: {C.END}")
                nuevo_item['descripcion'] = input(f"{C.BOLD}{C.BLUE}📄 Descripción: {C.END}")
                nuevo_item['genero'] = input(f"{C.BOLD}{C.BLUE}🎭 Género: {C.END}")
                año_str = input(f"{C.BOLD}{C.BLUE}📅 Año: {C.END}")
                if año_str.isdigit(): nuevo_item['año'] = int(año_str)
                base_datos.append(nuevo_item)
                guardar_base_datos(base_datos, crear_backup=False) # No crear backup en cada borrador
        elif opcion == '2':
            limpiar_pantalla(); print(f"{C.BOLD}{C.GOLD}🔍--- BUSCAR EN BORRADORES ---{C.END}\n")
            busqueda = input(f"{C.BOLD}{C.BLUE}🔎 Introduce el nombre a buscar: {C.END}").lower()
            resultados = [item for item in base_datos if busqueda in item['titulo'].lower()]
            if not resultados: print(f"\n{C.BOLD}{C.YELLOW}📭 No se encontraron resultados.{C.END}")
            else:
                for item in resultados:
                    print(f"\n{C.BOLD}{C.CYAN}🎬 Título:{C.END} {C.GOLD}{item.get('titulo', 'N/A')}{C.END}")
                    for key, value in item.items():
                        if key != 'titulo': print(f"  {C.BOLD}{key.title()}:{C.END} {C.LIGHT_BLUE}{value}{C.END}")
        elif opcion == '3':
            indice = seleccionar_borrador("editar")
            if indice is not None:
                item = base_datos[indice]
                limpiar_pantalla(); print(f"{C.BOLD}{C.GOLD}✏️ --- EDITANDO: {item['titulo']} ---{C.END}\n")
                for key, value in item.items():
                    nuevo_valor = input(f"{C.BOLD}{C.BLUE}{key.title()} ({value}): {C.END}")
                    if nuevo_valor: item[key] = nuevo_valor
                guardar_base_datos(base_datos, crear_backup=False)
                print(f"\n{C.BOLD}{C.GREEN}✅ Borrador actualizado.{C.END}")
        elif opcion == '4':
            indice = seleccionar_borrador("eliminar")
            if indice is not None:
                if confirmar_accion(f"\n⚠️  ¿Seguro que quieres eliminar '{base_datos[indice]['titulo']}'?"):
                    base_datos.pop(indice)
                    guardar_base_datos(base_datos, crear_backup=False)
                    print(f"\n{C.BOLD}{C.GREEN}✅ Borrador eliminado.{C.END}")
                else: print(f"\n{C.BOLD}{C.YELLOW}🚫 Operación cancelada.{C.END}")
        elif opcion == '5':
            indice = seleccionar_borrador("publicar")
            if indice is not None:
                # Esta función devolverá el nuevo contenido o None si se cancela
                resultado = anadir_contenido_desde_borrador(base_datos[indice])
                if resultado:
                    accion, payload = resultado
                    if accion == 'AÑADIR':
                        # Devolvemos la acción y el contenido para que el bucle principal lo maneje
                        base_datos.pop(indice) # Eliminar el borrador una vez procesado
                        guardar_base_datos(base_datos, crear_backup=False)
                        return ('PUBLICAR_BORRADOR', payload)
            continue # Continuar en el menú de borradores si no se publicó nada
        else: print(f"{C.BOLD}{C.RED}❌ Opción no válida.{C.END}")
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        
def ver_lanzamientos_programados(proximamente):
    """Muestra los elementos de 'Próximamente' que tienen una fecha de lanzamiento."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}🚀--- LANZAMIENTOS PROGRAMADOS ---{C.END}\n")

    if not TZ:
        print(f"{C.BOLD}{C.RED}❌ Esta función requiere Python 3.9+ para el manejo de zonas horarias.{C.END}")
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        return

    ahora = datetime.now(TZ)
    programados = sorted(
        [item for item in proximamente if item.get('fecha_lanzamiento')],
        key=lambda x: datetime.fromisoformat(x['fecha_lanzamiento'])
    )

    if not programados:
        print(f"{C.BOLD}{C.YELLOW}📭 No hay lanzamientos programados.{C.END}")
    else:
        for item in programados:
            fecha_lanzamiento = datetime.fromisoformat(item['fecha_lanzamiento'])
            diferencia = fecha_lanzamiento - ahora
            
            if diferencia.total_seconds() > 0:
                dias = diferencia.days
                horas, rem = divmod(diferencia.seconds, 3600)
                minutos, _ = divmod(rem, 60)
                tiempo_restante = f"{dias}d {horas}h {minutos}m"
                color_tiempo = C.GREEN
            else:
                tiempo_restante = "¡Ya lanzado!"
                color_tiempo = C.GOLD

            fecha_str = fecha_lanzamiento.strftime('%d/%m/%Y a las %H:%M')
            print(f"  {C.BOLD}{C.CYAN}🎬 {item['titulo']}{C.END}")
            print(f"     {C.GREY}Fecha:{C.END} {C.LIGHT_BLUE}{fecha_str}{C.END}")
            print(f"     {C.GREY}Tiempo restante:{C.END} {color_tiempo}{tiempo_restante}{C.END}\n")

    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para volver al menú...{C.END}")

def marcar_contenido_roto(peliculas, editados):
    """Permite al usuario marcar o desmarcar contenido como roto rápidamente."""
    while True:
        contenido_a_marcar = seleccionar_contenido(peliculas, accion="Marcar como Roto/Funcional")

        if contenido_a_marcar is None:
            break

        # Invertir el estado de 'esta_roto'
        estado_actual = contenido_a_marcar.get('esta_roto', False)
        contenido_a_marcar['esta_roto'] = not estado_actual

        if contenido_a_marcar not in editados:
            editados.append(contenido_a_marcar)

        nuevo_estado_str = f"{C.RED}ROTO 💔{C.END}" if contenido_a_marcar['esta_roto'] else f"{C.GREEN}FUNCIONAL 💚{C.END}"
        print(f"\n{C.BOLD}✅ El estado de '{contenido_a_marcar['titulo']}' ha sido cambiado a: {nuevo_estado_str}{C.END}")
        
        if input(f"\n{C.BOLD}¿Quieres marcar otro contenido? (s/n): {C.END}").lower() != 's':
            break

def anadir_contenido_desde_borrador(borrador):
    """Flujo para completar y publicar contenido desde un borrador de la base de datos rápida."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}🚀--- PUBLICANDO BORRADOR: {borrador['titulo']} ---{C.END}\n")
    print(f"{C.BOLD}{C.YELLOW}ℹ️  Completa los datos para añadirlo a la biblioteca principal.{C.END}")

    # Pre-rellenar datos desde el borrador
    scraped_data = {
        'titulo': borrador.get('titulo', ''),
        'poster': borrador.get('poster', ''),
        'descripcion': borrador.get('descripcion', ''),
        'año': borrador.get('año'),
        'genero': borrador.get('genero', ''),
        'iframe_url': borrador.get('url_video', '') # El borrador simple usa 'url_video'
    }

    print(f"  {C.BOLD}{C.CYAN}🎬 1.{C.END} {C.LIGHT_GREEN}Película{C.END}")
    print(f"  {C.BOLD}{C.CYAN}📺 2.{C.END} {C.LIGHT_GREEN}Serie{C.END}")
    tipo_num_str = input(f"\n{C.BOLD}{C.BLUE}🎭 ¿Qué tipo de contenido es? (1/2): {C.END}")
    tipo = CONTENT_TYPES.get(tipo_num_str)
    if not tipo:
        print(f"{C.BOLD}{C.RED}❌ Opción no válida. Publicación cancelada.{C.END}"); return None

    categoria_seleccionada = seleccionar_categoria("el nuevo contenido") or 'todos'
    plataforma_seleccionada = seleccionar_plataforma()

    print(f"\n{C.BOLD}{C.PURPLE}📝--- RELLENA LOS DATOS RESTANTES ---{C.END}\n")
    
    nuevo_contenido = {
        "tipo": tipo, 
        "titulo": scraped_data['titulo'],
        "poster": input(f"{C.BOLD}{C.BLUE}🖼️  URL Portada ({scraped_data.get('poster', '')}): {C.END}") or scraped_data.get('poster', ''),
        "descripcion": input(f"{C.BOLD}{C.BLUE}📄 Descripción ({scraped_data.get('descripcion', '')[:50]}...): {C.END}") or scraped_data.get('descripcion', ''),
        "categoria": categoria_seleccionada,
        "duracion": input(f"{C.BOLD}{C.BLUE}⏱️  Duración (ej: 2h 15m): {C.END}") or "N/A",
        "director": input(f"{C.BOLD}{C.BLUE}🎬 Director: {C.END}") or "N/A",
        "reparto": [actor.strip() for actor in input(f"{C.BOLD}{C.BLUE}👥 Reparto (separado por comas): {C.END}").split(',')],
        "favorito": False,
        "genero": input(f"{C.BOLD}{C.BLUE}🎭 Género ({scraped_data.get('genero', '')}): {C.END}") or scraped_data.get('genero', ''),
        "calidad": input(f"{C.BOLD}{C.BLUE}📺 Calidad (ej: 1080p): {C.END}") or "HD",
        "addedDate": datetime.now().isoformat(),
        "tamaño": input(f"{C.BOLD}{C.BLUE}💾 Tamaño (ej: 2.1 GB): {C.END}") or "N/A",
    }

    año_str = input(f"{C.BOLD}{C.BLUE}📅 Año ({scraped_data.get('año', '')}): {C.END}") or scraped_data.get('año') or datetime.now().year
    nuevo_contenido['año'] = int(año_str) if str(año_str).isdigit() else datetime.now().year

    if plataforma_seleccionada: nuevo_contenido['plataforma'] = plataforma_seleccionada

    if tipo == 'pelicula':
        nuevo_contenido["fuentes"] = []
        if confirmar_accion("\n🎥 ¿Añadir la fuente de video del borrador?"):
            idioma = input(f"  {C.BOLD}{C.BLUE}🗣️  Idioma (ej: Latino): {C.END}") or "latino"
            url = scraped_data.get('iframe_url', '')
            if url: nuevo_contenido["fuentes"].append({"idioma": idioma, "url": url}) # type: ignore
    elif tipo == 'serie':
        nuevo_contenido["temporadas"] = []
        print(f"{C.YELLOW}🚧 La adición de episodios para series desde aquí aún no está implementada. Deberás editarlo más tarde.{C.END}")

    return ('AÑADIR', nuevo_contenido)

def anadir_contenido_desde_proximamente(peliculas, proximamente, scraped_data):
    """Flujo para completar y añadir contenido desde la lista 'Próximamente'."""
    limpiar_pantalla()
    tipo = scraped_data.get('tipo', 'pelicula')
    print(f"{C.BOLD}{C.PURPLE}🚀--- PUBLICANDO '{scraped_data['titulo']}' ---{C.END}\n")
    print(f"{C.BOLD}{C.YELLOW}ℹ️  Completando datos para la {tipo.upper()}.{C.END}")

    categoria_seleccionada = seleccionar_categoria("el nuevo contenido") or 'todos'
    plataforma_seleccionada = seleccionar_plataforma()

    print(f"\n{C.BOLD}{C.PURPLE}📝--- RELLENA LOS DATOS RESTANTES ---{C.END}\n")
    
    nuevo_contenido = {
        "tipo": tipo, 
        "titulo": scraped_data['titulo'],
        "poster": scraped_data['poster'],
        "descripcion": input(f"{C.BOLD}{C.BLUE}📄 Descripción: {C.END}") or "Sin descripción.",
        "categoria": categoria_seleccionada,
        "duracion": input(f"{C.BOLD}{C.BLUE}⏱️  Duración (ej: 2h 15m): {C.END}") or "N/A",
        "director": input(f"{C.BOLD}{C.BLUE}🎬 Director: {C.END}") or "N/A",
        "reparto": [actor.strip() for actor in input(f"{C.BOLD}{C.BLUE}👥 Reparto (separado por comas): {C.END}").split(',')],
        "favorito": False,
        "genero": input(f"{C.BOLD}{C.BLUE}🎭 Género: {C.END}") or "N/A",
        "calidad": input(f"{C.BOLD}{C.BLUE}📺 Calidad (ej: 1080p): {C.END}") or "HD",
        "addedDate": datetime.now().isoformat(),
        "tamaño": input(f"{C.BOLD}{C.BLUE}💾 Tamaño (ej: 2.1 GB): {C.END}") or "N/A",
    }

    while True:
        try:
            año_str = input(f"{C.BOLD}{C.BLUE}📅 Año ({datetime.now().year}): {C.END}") or datetime.now().year
            nuevo_contenido['año'] = int(año_str)
            break
        except ValueError: print(f"{C.RED}❌ Año no válido.{C.END}")
    while True:
        try:
            cal_str = input(f"{C.BOLD}{C.BLUE}⭐ Calificación (ej: 8.5): {C.END}") or "0"
            nuevo_contenido['calificacion'] = float(cal_str)
            break
        except ValueError: print(f"{C.RED}❌ Calificación no válida.{C.END}")
    while True:
        try:
            votos_str = input(f"{C.BOLD}{C.BLUE}👍 Votos (ej: 1500): {C.END}") or "0"
            nuevo_contenido['votos'] = int(votos_str)
            break
        except ValueError: print(f"{C.RED}❌ Votos no válidos.{C.END}")

    if plataforma_seleccionada: nuevo_contenido['plataforma'] = plataforma_seleccionada

    if tipo == 'pelicula':
        nuevo_contenido["fuentes"] = []
        while confirmar_accion("\n🎥 ¿Añadir una fuente de video?"):
            idioma = input(f"  {C.BOLD}{C.BLUE}🗣️  Idioma: {C.END}")
            url = input(f"  {C.BOLD}{C.BLUE}🌐 URL del video: {C.END}")
            if idioma and url: nuevo_contenido["fuentes"].append({"idioma": idioma, "url": url})
    
    elif tipo == 'serie':
        # (Aquí iría la lógica para añadir temporadas y episodios, similar a anadir_contenido)
        nuevo_contenido["temporadas"] = []
        print(f"{C.YELLOW}🚧 La adición de episodios para series desde aquí aún no está implementada.{C.END}")

    return ('AÑADIR', nuevo_contenido)

def mostrar_tabla_contenido(peliculas):
    """Muestra una tabla con todo el contenido, su estado y detalles clave."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}--- 📊 TABLA COMPLETA DE CONTENIDO ---{C.END}\n")

    # Definir anchos de columna
    col_num = 5
    col_titulo = 45
    col_tipo = 10
    col_ano = 6
    col_cat = 20
    col_plat = 15
    col_estado = 12

    # Imprimir cabecera
    header = (f"{'N°':<{col_num}} {'TÍTULO':<{col_titulo}} {'TIPO':<{col_tipo}} {'AÑO':<{col_ano}} "
              f"{'CATEGORÍA':<{col_cat}} {'PLATAFORMA':<{col_plat}} {'ESTADO':<{col_estado}}")
    print(f"{C.BOLD}{C.WHITE}{header}{C.END}")
    mostrar_separador(C.GREY, len(header))

    for i, item in enumerate(peliculas, 1):
        titulo = item.get('titulo', 'N/A')[:col_titulo-1]
        tipo = item.get('tipo', 'N/A').capitalize()
        ano = str(item.get('año', 'N/A'))
        categoria = item.get('categoria', 'N/A')[:col_cat-1]
        plataforma = item.get('plataforma', 'N/A').capitalize()[:col_plat-1]
        
        if item.get('esta_roto'):
            estado, color_estado = "No Activo", C.RED
        else:
            estado, color_estado = "Activo", C.GREEN
        print(f"{i:<{col_num}} {titulo:<{col_titulo}} {tipo:<{col_tipo}} {ano:<{col_ano}} {categoria:<{col_cat}} {plataforma:<{col_plat}} {color_estado}{estado:<{col_estado}}{C.END}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para volver al menú...{C.END}")

def mostrar_control_central(peliculas, editados):
    """Muestra el panel de control central con opciones de monitoreo y optimización."""
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.CYAN}⚙️ --- CONTROL CENTRAL: MONITOREO Y OPTIMIZACIÓN ---{C.END}\n")

        # --- Resumen del estado del sitio ---
        num_peliculas = sum(1 for p in peliculas if p.get('tipo') == 'pelicula')
        num_series = len(peliculas) - num_peliculas
        print(f"{C.BOLD}{C.LIGHT_BLUE}📊 RESUMEN:{C.END} {C.CYAN}Películas:{C.END} {C.GOLD}{num_peliculas}{C.END} | {C.PINK}Series:{C.END} {C.GOLD}{num_series}{C.END}")

        num_reportes = 0
        if os.path.exists(REPORTS_FILE):
            with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
                try: num_reportes = len(json.load(f))
                except json.JSONDecodeError: pass
        if num_reportes > 0:
            print(f"{C.BOLD}{C.RED}🚨 ¡ALERTA: {num_reportes} reporte(s) de contenido pendiente(s)!{C.END}")

        mantenimiento_activo = os.path.exists(MAINTENANCE_FLAG)
        if mantenimiento_activo:
            print(f"{C.BOLD}{C.ORANGE}🔧 ¡ATENCIÓN: El modo mantenimiento está ACTIVO!{C.END}")

        # --- Detección automática de problemas ---
        print(f"\n{C.BOLD}{C.YELLOW}🔎 Detectando problemas automáticamente...{C.END}")
        problemas = []
        contenido_roto = 0
        for item in peliculas:
            titulo = item.get('titulo', 'Sin Título')
            if not titulo or not item.get('poster') or not item.get('descripcion'):
                problemas.append(f"{C.YELLOW}⚠️  '{titulo}': Tiene campos básicos vacíos (título, póster o descripción).{C.END}")
            if item.get('tipo') == 'pelicula' and not item.get('fuentes'):
                problemas.append(f"{C.YELLOW}⚠️  Película '{titulo}': No tiene fuentes de video.{C.END}")
            if item.get('tipo') == 'serie' and not item.get('temporadas'):
                problemas.append(f"{C.YELLOW}⚠️  Serie '{titulo}': No tiene temporadas.{C.END}")
            if item.get('esta_roto'):
                contenido_roto += 1
        
        if contenido_roto > 0:
            problemas.append(f"{C.RED}💔 Hay {contenido_roto} elemento(s) marcados como rotos.{C.END}")

        if problemas:
            print(f"{C.BOLD}{C.RED}❌ Se encontraron {len(problemas)} problemas:{C.END}")
            for p in problemas:
                print(f"  - {p}")
        else:
            print(f"{C.BOLD}{C.GREEN}✅ No se detectaron problemas críticos.{C.END}")

        # --- Opciones rápidas ---
        print(f"\n{C.BOLD}{C.PURPLE}⚡ ACCIONES RÁPIDAS:{C.END}")
        print(f"  {C.BOLD}{C.CYAN}1. 📢 Ver y gestionar reportes{C.END}")
        print(f"  {C.BOLD}{C.CYAN}2. ⚡ Marcar contenido roto (interactivo){C.END}")
        print(f"  {C.BOLD}{C.CYAN}3. ✨ Ejecutar optimización completa (Minificar JS, Sitemap){C.END}")
        print(f"  {C.BOLD}{C.CYAN}4. 🔧 Validar integridad de todos los datos{C.END}")
        print(f"  {C.BOLD}{C.ORANGE}M. Activar/Desactivar Modo Mantenimiento{C.END}")
        print(f"\n  {C.BOLD}{C.YELLOW}0. Volver al menú principal{C.END}")

        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción: {C.END}").lower()

        if opcion == '0':
            return
        elif opcion == '1':
            ver_reportes(peliculas, editados)
        elif opcion == '2':
            marcar_contenido_roto(peliculas, editados)
        elif opcion == '3':
            limpiar_pantalla()
            print(f"{C.BOLD}{C.MAGENTA}--- OPTIMIZACIÓN COMPLETA ---{C.END}\n")
            minificar_peliculas_js()
            print("\n" + "="*30 + "\n")
            generar_sitemap(peliculas)
        elif opcion == '4':
            validar_integridad_datos(peliculas)
        elif opcion == 'm':
            if os.path.exists(MAINTENANCE_FLAG):
                os.remove(MAINTENANCE_FLAG)
                print(f"\n{C.BOLD}{C.GREEN}✅ Modo Mantenimiento DESACTIVADO. El sitio está en línea.{C.END}")
            else:
                with open(MAINTENANCE_FLAG, 'w') as f: f.write('activo')
                print(f"\n{C.BOLD}{C.RED}🚨 Modo Mantenimiento ACTIVADO. El sitio está fuera de línea.{C.END}")
            time.sleep(2)
        else:
            print(f"{C.BOLD}{C.RED}❌ Opción no válida.{C.END}")
            time.sleep(1)

def minificar_peliculas_js():
    """Minifica el archivo peliculas.js para reducir su tamaño."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.MAGENTA}--- MINIFICANDO peliculas.js ---{C.END}\n")
    if not confirmar_accion("¿Estás seguro de que quieres minificar peliculas.js? (Se eliminarán espacios y saltos de línea)"):
        print(f"{C.BOLD}{C.YELLOW}🚫 Minificación cancelada.{C.END}")
        return

    try:
        with open(JS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'const\s+peliculas\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if not match:
            print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el array 'const peliculas' en '{JS_FILE}'.{C.END}")
            return
        
        original_json_str = match.group(1)
        peliculas_data = json.loads(original_json_str)
        
        # Minificar el JSON: no indentación, no espacios después de separadores
        minified_json_str = json.dumps(peliculas_data, ensure_ascii=False, separators=(',', ':'))
        
        new_content = content.replace(original_json_str, minified_json_str)
        
        with open(JS_FILE, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        original_size = len(original_json_str.encode('utf-8'))
        minified_size = len(minified_json_str.encode('utf-8'))
        
        print(f"{C.BOLD}{C.GREEN}✅ '{JS_FILE}' minificado con éxito.{C.END}")
        print(f"{C.GREY}   Tamaño original: {original_size / 1024:.2f} KB{C.END}")
        print(f"{C.GREY}   Tamaño minificado: {minified_size / 1024:.2f} KB{C.END}")
        print(f"{C.GREY}   Reducción: {((original_size - minified_size) / original_size) * 100:.2f}%{C.END}")

    except FileNotFoundError:
        print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el archivo '{JS_FILE}'.{C.END}")
    except json.JSONDecodeError:
        print(f"{C.BOLD}{C.RED}❌ Error: El formato JSON en '{JS_FILE}' no es válido.{C.END}")
    except Exception as e:
        print(f"{C.BOLD}{C.RED}💥 Error al minificar '{JS_FILE}': {e}{C.END}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def limpiar_reportes():
    """Elimina el archivo de reportes."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.MAGENTA}--- LIMPIAR REPORTES ---{C.END}\n")
    if not os.path.exists(REPORTS_FILE):
        print(f"{C.BOLD}{C.YELLOW}📭 No hay archivo de reportes '{REPORTS_FILE}' para limpiar.{C.END}")
        input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        return

    if confirmar_accion(f"¿Estás seguro de que quieres eliminar el archivo '{REPORTS_FILE}'? (Esto borrará todos los reportes)"):
        try:
            os.remove(REPORTS_FILE)
            print(f"{C.BOLD}{C.GREEN}✅ Archivo '{REPORTS_FILE}' eliminado con éxito.{C.END}")
        except Exception as e:
            print(f"{C.BOLD}{C.RED}❌ Error al eliminar '{REPORTS_FILE}': {e}{C.END}")
    else:
        print(f"{C.BOLD}{C.YELLOW}🚫 Limpieza de reportes cancelada.{C.END}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def generar_sitemap(peliculas):
    """Genera un archivo sitemap.xml para mejorar el SEO."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.MAGENTA}--- GENERAR SITEMAP.XML ---{C.END}\n")
    base_url = input(f"{C.BOLD}{C.BLUE}🌐 Introduce la URL base de tu sitio (ej: https://tudominio.com/): {C.END}")
    if not base_url.endswith('/'):
        base_url += '/'

    sitemap_content = []
    sitemap_content.append('<?xml version="1.0" encoding="UTF-8"?>')
    sitemap_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    # Página principal
    sitemap_content.append(f'  <url><loc>{base_url}</loc><priority>1.0</priority></url>')

    # Entradas para cada película/serie
    for item in peliculas:
        titulo = item.get('titulo', '').replace(' ', '-').lower()
        # Asumiendo una estructura de URL como /ver?titulo=slug-del-titulo
        # Si tienes IDs únicos, sería mejor usarlos.
        loc = f"{base_url}ver?titulo={titulo}" 
        sitemap_content.append(f'  <url><loc>{loc}</loc><priority>0.8</priority></url>')

    sitemap_content.append('</urlset>')

    try:
        with open('sitemap.xml', 'w', encoding='utf-8') as f:
            f.write('\n'.join(sitemap_content))
        print(f"{C.BOLD}{C.GREEN}✅ 'sitemap.xml' generado con éxito.{C.END}")
        print(f"{C.GREY}   Asegúrate de subirlo a la raíz de tu servidor.{C.END}")
    except Exception as e:
        print(f"{C.BOLD}{C.RED}❌ Error al generar 'sitemap.xml': {e}{C.END}")
    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def optimizar_pagina(peliculas):
    """Menú para las opciones de optimización de la página."""
    while True:
        limpiar_pantalla()
        print(f"{C.BOLD}{C.MAGENTA}--- OPCIONES DE OPTIMIZACIÓN DE PÁGINA ---{C.END}\n")
        print(f"  {C.BOLD}{C.CYAN}1. ⚡ Minificar peliculas.js{C.END}")
        print(f"  {C.BOLD}{C.CYAN}2. 🗑️  Limpiar reportes.json{C.END}")
        print(f"  {C.BOLD}{C.CYAN}3. 🗺️  Generar sitemap.xml{C.END}")
        print(f"\n  {C.BOLD}{C.YELLOW}0. 🚪 Volver al menú principal{C.END}")

        opcion = input(f"\n{C.BOLD}{C.GOLD}🎲 Elige una opción de optimización: {C.END}")

        if opcion == '0':
            break
        elif opcion == '1':
            minificar_peliculas_js()
        elif opcion == '2':
            limpiar_reportes()
        elif opcion == '3':
            generar_sitemap(peliculas)
        else:
            print(f"{C.BOLD}{C.RED}❌ Opción no válida. Inténtalo de nuevo.{C.END}")
            time.sleep(1)

# --- Flujo Principal del Script ---
if __name__ == "__main__":
    peliculas_iniciales = cargar_peliculas()
    peliculas = json.loads(json.dumps(peliculas_iniciales)) # Crear una copia profunda para trabajar
    
    proximamente = cargar_proximamente()
    base_datos = cargar_base_datos()
    original_peliculas = json.loads(json.dumps(peliculas))
    original_proximamente = json.loads(json.dumps(proximamente))
    original_base_datos = json.loads(json.dumps(base_datos))

    anadidos = []
    editados = []
    eliminados = []

    while True:
        cambios_pendientes = (peliculas != original_peliculas or 
                              proximamente != original_proximamente or 
                              base_datos != original_base_datos)
        
        opcion_menu = mostrar_menu_principal(peliculas, proximamente, cambios_pendientes) # type: ignore
        
        if opcion_menu == 0:
            if cambios_pendientes:
                if not confirmar_accion("\n{C.BOLD}{C.RED}⚠️ Tienes cambios sin guardar. ¿Salir de todos modos?"):
                    continue
            print(f"\n{C.BOLD}{C.GOLD}👋 ¡Hasta luego!{C.END}")
            break
        
        elif opcion_menu == 1:
            resultado_anadir = anadir_contenido(peliculas, proximamente)
            if resultado_anadir:
                accion, payload = resultado_anadir
                if accion == 'AÑADIR':
                    peliculas.append(payload)
                    anadidos.append(payload)
                    print(f"\n{C.BOLD}{C.GREEN}✅ '{payload['titulo']}' añadido a la lista de cambios.{C.END}")
                    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para volver...{C.END}")
                elif accion == 'EDITAR':
                    # La función de edición ya se encarga de los mensajes y pausas.
                    # Simplemente nos aseguramos de que el ítem esté en la lista de editados.
                    if payload not in editados:
                        editados.append(payload)
                    editar_contenido(peliculas, editados)

        elif opcion_menu == 2:
            editar_contenido(peliculas, editados)
        elif opcion_menu == 3:
            eliminar_contenido(peliculas, eliminados)
        elif opcion_menu == 4:
            limpiar_pantalla()
            print(f"{C.BOLD}{C.GREEN}💾--- GUARDAR CAMBIOS ---{C.END}\n")
            if not cambios_pendientes:
                print(f"{C.BOLD}{C.YELLOW}📭 No hay cambios pendientes para guardar.{C.END}")
            else:
                print(f"{C.BOLD}{C.YELLOW}Se guardarán los siguientes cambios:{C.END}")
                if anadidos:
                    print(f"  {C.GREEN}➕ {len(anadidos)} contenido(s) nuevo(s):{C.END}")
                    for item in anadidos: print(f"     - {item['titulo']}")
                if editados:
                    print(f"  {C.CYAN}✏️  {len(editados)} contenido(s) editado(s):{C.END}")
                    for item in editados: print(f"     - {item['titulo']}")
                if eliminados:
                    print(f"  {C.RED}🗑️  {len(eliminados)} contenido(s) eliminado(s):{C.END}")
                    for item in eliminados: print(f"     - {item['titulo']}")
                if proximamente != original_proximamente:
                    print(f"  {C.PINK}🎪 Cambios en la lista 'Próximamente'.{C.END}")
                if base_datos != original_base_datos:
                    print(f"  {C.GOLD}🗃️  Cambios en la Base de Datos Rápida.{C.END}")

                if confirmar_accion("\n¿Estás seguro de que quieres guardar todos estos cambios?"):
                    guardar_peliculas(peliculas)
                    guardar_proximamente(proximamente)
                    guardar_base_datos(base_datos)
                    # Resetear seguimiento de cambios
                    anadidos, editados, eliminados = [], [], []
                    original_peliculas = json.loads(json.dumps(peliculas))
                    original_proximamente = json.loads(json.dumps(proximamente))
                    original_base_datos = json.loads(json.dumps(base_datos))
                else:
                    print(f"\n{C.BOLD}{C.YELLOW}🚫 Guardado cancelado.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
        elif opcion_menu == 6: # CORRECCIÓN: Se pasa la variable que faltaba
            anadir_desde_url(peliculas, anadidos)
        elif opcion_menu == 7:
            validar_integridad_datos(peliculas)
        elif opcion_menu == 5:
            revisar_contenido_y_fuentes(peliculas)
        elif opcion_menu == 11:
            marcar_contenido_roto(peliculas, editados)
        elif opcion_menu == 9:
            gestionar_proximamente(proximamente, peliculas, anadidos)
        elif opcion_menu == 10:
            ver_lanzamientos_programados(proximamente)
        elif opcion_menu == 12:
            resultado_db = gestionar_base_datos(base_datos)
            if resultado_db and isinstance(resultado_db, tuple):
                accion, payload = resultado_db
                if accion == 'PUBLICAR_BORRADOR':
                    peliculas.append(payload)
                    anadidos.append(payload)
                    print(f"\n{C.BOLD}{C.GREEN}✅ '{payload['titulo']}' publicado y añadido a la lista de cambios.{C.END}")
                    input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
            # Si no, es que solo se modificó la base de datos, y ya se guardó internamente
        elif opcion_menu == 13:
            mostrar_tabla_contenido(peliculas)
        elif opcion_menu == 14:
            optimizar_pagina(peliculas)
        elif opcion_menu == 15:
            mostrar_control_central(peliculas, editados)
        else:
            # --- NUEVO: Manejo de opciones de una letra ---
            if opcion_menu == 'c':
                if os.path.exists(CAMPAIGN_FILE):
                    os.remove(CAMPAIGN_FILE)
                    print(f"\n{C.BOLD}{C.YELLOW}🚫 Campaña 'Próximamente' DESACTIVADA.{C.END}")
                else:
                    with open(CAMPAIGN_FILE, 'w') as f: f.write('activo')
                    print(f"\n{C.BOLD}{C.GREEN}✅ Campaña 'Próximamente' ACTIVADA.{C.END}")
            elif opcion_menu == 'm':
                if os.path.exists(MAINTENANCE_FLAG):
                    os.remove(MAINTENANCE_FLAG)
                    print(f"\n{C.BOLD}{C.GREEN}✅ Modo Mantenimiento DESACTIVADO. El sitio está en línea.{C.END}")
                else:
                    with open(MAINTENANCE_FLAG, 'w') as f: f.write('activo')
                    print(f"\n{C.BOLD}{C.RED}🚨 Modo Mantenimiento ACTIVADO. El sitio está fuera de línea.{C.END}")
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
