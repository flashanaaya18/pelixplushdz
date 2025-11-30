import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
except ImportError:
    print("La biblioteca 'requests' no está instalada. Por favor, ejecútala:")
    print("pip install requests")
    sys.exit(1)

# --- Clases de Colores (igual que en publicar.py para consistencia) ---
class C:
    HEADER = '\033[95m'; MAGENTA = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'; ORANGE = '\033[38;5;208m'
    GREY = '\033[90m'; WHITE = '\033[97m'; END = '\033[0m'; BOLD = '\033[1m'; UNDERLINE = '\033[4m'

# --- Constantes ---
JS_FILE = 'peliculas.js'
MAX_WORKERS = 15  # Número de URLs a verificar simultáneamente. Ajústalo según tu conexión.
TIMEOUT = 10  # Segundos de espera por cada URL antes de considerarla fallida.

# --- Funciones de Utilidad ---
def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def cargar_peliculas_lista():
    """Carga las películas desde el archivo JS y las devuelve como una lista."""
    try:
        with open(JS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        # Expresión regular para encontrar el array 'peliculas'
        match = re.search(r'const\s+peliculas\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if not match:
            print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el array 'const peliculas' en '{JS_FILE}'.{C.END}")
            return []
        return json.loads(match.group(1))
    except FileNotFoundError:
        print(f"{C.BOLD}{C.RED}❌ Error: No se pudo encontrar el archivo '{JS_FILE}'.{C.END}")
        return []
    except json.JSONDecodeError:
        print(f"{C.BOLD}{C.RED}❌ Error: El formato del array en '{JS_FILE}' es un JSON inválido.{C.END}")
        return []

def verificar_url(url_info):
    """
    Verifica una única URL. Devuelve la URL y un estado ('OK' o 'FALLIDO').
    `url_info` es un diccionario que contiene la URL y el título del contenido.
    """
    url = url_info['url']
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://google.com' # Simular que venimos de otro sitio puede ayudar
    }
    try:
        # Usamos `stream=True` para no descargar el contenido completo, solo las cabeceras.
        response = requests.get(url, headers=headers, timeout=TIMEOUT, allow_redirects=True, stream=True)
        
        # Un código 2xx indica éxito.
        if 200 <= response.status_code < 300:
            # Verificación adicional: algunos sitios devuelven 200 pero con un mensaje de error.
            # Leemos una pequeña parte del contenido para buscar palabras clave de error.
            content_sample = response.raw.read(1024).decode('utf-8', errors='ignore').lower()
            if any(error_word in content_sample for error_word in ["file was deleted", "not found", "video not available"]):
                return {**url_info, 'estado': 'FALLIDO', 'razon': 'Contenido Eliminado'}
            return {**url_info, 'estado': 'OK', 'razon': f'Código {response.status_code}'}
        else:
            return {**url_info, 'estado': 'FALLIDO', 'razon': f'Código {response.status_code}'}
    except requests.exceptions.RequestException as e:
        # Captura errores de conexión, timeouts, etc.
        return {**url_info, 'estado': 'FALLIDO', 'razon': 'Error de Conexión'}

def main():
    """Función principal del script de verificación."""
    limpiar_pantalla()
    print(f"{C.BOLD}{C.CYAN}╒══════════════════════════════════════════════════════╕{C.END}")
    print(f"{C.BOLD}{C.CYAN}│     📡 SISTEMA DE VERIFICACIÓN DE ENLACES EN VIVO     │{C.END}")
    print(f"{C.BOLD}{C.CYAN}╘══════════════════════════════════════════════════════╛{C.END}\n")

    print(f"{C.YELLOW}🔄 Cargando la base de datos de contenido...{C.END}")
    peliculas = cargar_peliculas_lista()
    if not peliculas:
        input(f"\n{C.BOLD}{C.RED}No se pudo cargar el contenido. Presiona Enter para salir...{C.END}")
        return

    # 1. Recopilar todas las URLs para verificar
    urls_a_verificar = []
    for item in peliculas:
        titulo = item.get('titulo', 'Sin Título')
        if item.get('tipo') == 'pelicula' and item.get('fuentes'):
            for fuente in item['fuentes']:
                if fuente.get('url'):
                    urls_a_verificar.append({'url': fuente['url'], 'titulo': titulo, 'info': f"Fuente: {fuente.get('idioma', 'N/A')}"})
        
        elif item.get('tipo') == 'serie' and item.get('temporadas'):
            for temporada in item['temporadas']:
                num_temp = temporada.get('temporada', '?')
                for episodio in temporada.get('episodios', []):
                    num_ep = episodio.get('episodio', '?')
                    if episodio.get('url'):
                        urls_a_verificar.append({'url': episodio['url'], 'titulo': titulo, 'info': f"T{num_temp}:E{num_ep}"})

    if not urls_a_verificar:
        print(f"\n{C.BOLD}{C.YELLOW}No se encontraron URLs para verificar en tu archivo '{JS_FILE}'.{C.END}")
        input("\nPresiona Enter para salir...")
        return

    total_urls = len(urls_a_verificar)
    print(f"{C.GREEN}✅ Base de datos cargada. Se encontraron {C.BOLD}{total_urls}{C.END}{C.GREEN} URLs para verificar.{C.END}\n")
    
    enlaces_rotos = []
    enlaces_ok = 0
    verificados = 0

    # 2. Usar ThreadPoolExecutor para verificar URLs en paralelo
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Creamos un futuro para cada URL
        futuros = [executor.submit(verificar_url, url_info) for url_info in urls_a_verificar]

        for futuro in as_completed(futuros):
            resultado = futuro.result()
            verificados += 1
            
            # Imprimir progreso en tiempo real
            progreso = (verificados / total_urls) * 100
            barra_progreso = '█' * int(progreso / 4) + ' ' * (25 - int(progreso / 4))
            sys.stdout.write(f"\r{C.BOLD}{C.CYAN}🔎 Verificando... [{barra_progreso}] {progreso:.1f}% ({verificados}/{total_urls}){C.END}")
            sys.stdout.flush()

            if resultado['estado'] == 'OK':
                enlaces_ok += 1
            else:
                enlaces_rotos.append(resultado)

    # 3. Mostrar los resultados
    print("\n\n" + "="*60)
    print(f"{C.BOLD}{C.MAGENTA}📊 REPORTE FINAL DE VERIFICACIÓN 📊{C.END}")
    print("="*60 + "\n")

    print(f"  {C.GREEN}✔ Enlaces funcionales: {enlaces_ok}{C.END}")
    print(f"  {C.RED}❌ Enlaces rotos: {len(enlaces_rotos)}{C.END}")
    print(f"  {C.BLUE}Ʃ Total de enlaces verificados: {total_urls}{C.END}\n")

    if enlaces_rotos:
        print(f"{C.BOLD}{C.ORANGE}--- 🚨 DETALLE DE ENLACES ROTOS ---{C.END}")
        for enlace in enlaces_rotos:
            print(f"\n  {C.BOLD}{C.WHITE}🎬 Título:{C.END} {enlace['titulo']}")
            print(f"    {C.GREY} L {enlace['info']}{C.END}")
            print(f"    {C.RED} L URL: {enlace['url']}{C.END}")
            print(f"    {C.YELLOW} L Razón: {enlace['razon']}{C.END}")
    else:
        print(f"{C.BOLD}{C.GREEN}🎉 ¡Felicidades! Todos los enlaces parecen estar funcionando correctamente.{C.END}")

    input(f"\n\n{C.BOLD}{C.YELLOW}Verificación completada. Presiona Enter para salir...{C.END}")

if __name__ == "__main__":
    main()