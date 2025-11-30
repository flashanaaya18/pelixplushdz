import json
import os
import sys
import requests
from bs4 import BeautifulSoup
import re

# --- Colores para la interfaz (tomados de publicar.py) ---
class C:
    HEADER = '\033[95m'; MAGENTA = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'; ORANGE = '\033[38;5;208m'
    GREY = '\033[90m'; BOLD = '\033[1m'; END = '\033[0m'; LIGHT_BLUE = '\033[38;5;117m'

# --- Constantes ---
BASE_DATOS_FILE = 'base_datos.json'

def limpiar_pantalla():
    """Limpia la pantalla de la consola."""
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_banner():
    """Muestra un banner estilizado para la herramienta."""
    print(f"{C.BOLD}{C.CYAN}╔══════════════════════════════════════════════════════════════════════════════╗{C.END}")
    print(f"{C.BOLD}{C.CYAN}║{C.END}{C.BOLD}{C.MAGENTA}                      ⚙️  Extractor Universal de Contenido peliXx ⚙️                     {C.END}{C.BOLD}{C.CYAN}║{C.END}")
    print(f"{C.BOLD}{C.CYAN}╚══════════════════════════════════════════════════════════════════════════════╝{C.END}\n")

def cargar_base_datos():
    """Carga la base de datos de borradores desde el archivo JSON."""
    try:
        with open(BASE_DATOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def guardar_base_datos(base_datos):
    """Guarda la base de datos de borradores en el archivo JSON."""
    try:
        with open(BASE_DATOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(base_datos, f, ensure_ascii=False, indent=4)
        print(f"\n{C.BOLD}{C.GREEN}✅ Borrador guardado con éxito en '{BASE_DATOS_FILE}'.{C.END}")
        print(f"{C.YELLOW}   Puedes revisarlo y publicarlo desde la opción 12 del panel principal.{C.END}")
    except Exception as e:
        print(f"\n{C.BOLD}{C.RED}💥 Error al guardar en la base de datos: {e}{C.END}")

def scrape_any_url(url):
    """
    Intenta extraer título, descripción, portada e iframe de CUALQUIER URL
    utilizando las metaetiquetas estándar y buscando iframes de video.
    """
    try:
        print(f"\n{C.CYAN}🔄 Analizando URL en busca de datos...{C.END}")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # --- Búsqueda inteligente de datos ---
        titulo_tag = soup.find('meta', property='og:title') or soup.find('meta', attrs={'name': 'twitter:title'}) or soup.find('title')
        titulo = titulo_tag['content'] if titulo_tag and 'content' in titulo_tag.attrs else (titulo_tag.string if titulo_tag else "Título no encontrado")

        desc_tag = soup.find('meta', property='og:description') or soup.find('meta', attrs={'name': 'twitter:description'}) or soup.find('meta', attrs={'name': 'description'})
        descripcion = desc_tag['content'] if desc_tag else "Descripción no encontrada."

        poster_tag = soup.find('meta', property='og:image') or soup.find('meta', attrs={'name': 'twitter:image'})
        poster = poster_tag['content'] if poster_tag else ""

        # --- Lógica de búsqueda de iframe en 2 PASOS ---
        iframe_url = ""

        # PASO 1: Buscar un iframe en la página inicial
        initial_iframe = soup.find('iframe', id=re.compile(r'player', re.IGNORECASE)) or \
                         soup.find('iframe', src=re.compile(r'embed|player|video', re.IGNORECASE))
        
        # Si encontramos un iframe inicial...
        if initial_iframe and initial_iframe.get('src'):
            intermediate_url = initial_iframe['src']
            if intermediate_url.startswith('//'):
                intermediate_url = 'https:' + intermediate_url
            
            # PASO 2: Visitamos la URL del iframe inicial para buscar el iframe final
            print(f"{C.GREY}   -> Navegando a página intermedia: {intermediate_url[:50]}...{C.END}")
            try:
                response2 = requests.get(intermediate_url, headers=headers, timeout=10)
                response2.raise_for_status()  # Verificar si la petición fue exitosa
                soup2 = BeautifulSoup(response2.text, 'html.parser')
                
                # Buscamos el iframe final en esta segunda página
                iframe_tag = soup2.find('iframe', id=re.compile(r'player', re.IGNORECASE)) or \
                             soup2.find('iframe', src=re.compile(r'embed|player|video', re.IGNORECASE))
                
                # Si encontramos un iframe en la página intermedia, extraemos su URL
                if iframe_tag and iframe_tag.get('src'):
                    iframe_url = iframe_tag['src']
                    if iframe_url.startswith('//'):
                        iframe_url = 'https:' + iframe_url
                    print(f"{C.GREEN}   -> Iframe final encontrado en la página intermedia: {iframe_url[:50]}{C.END}")
                else:
                    print(f"{C.YELLOW}   -> No se encontró iframe en la página intermedia.{C.END}")
                    # Si no encontramos un iframe final, usamos la URL de la página intermedia como último recurso
                    iframe_url = intermediate_url
            except Exception as e:
                print(f"{C.YELLOW}   -> No se pudo acceder a la página intermedia: {e}{C.END}")
        else:
            print(f"{C.YELLOW}   -> No se encontró iframe inicial en la página.{C.END}")

        if iframe_url.startswith('//'):
            iframe_url = 'https:' + iframe_url

        print(f"{C.GREEN}🔍 Datos extraídos:{C.END}")
        print(f"  - {C.BOLD}Título:{C.END} {titulo.strip()}")
        print(f"  - {C.BOLD}Portada:{C.END} {poster}")
        print(f"  - {C.BOLD}Video:{C.END} {iframe_url}")
        print(f"  - {C.BOLD}Descripción:{C.END} {descripcion.strip()[:80]}...")

        return {
            "titulo": titulo.strip(),
            "poster": poster,
            "descripcion": descripcion.strip(), # Se mantiene la descripción
            "url_video": "" # Se deja vacío para que el usuario lo ponga manualmente
        }

    except requests.exceptions.RequestException as e:
        print(f"\n{C.BOLD}{C.RED}💥 Error de red al intentar acceder a la URL: {e}{C.END}")
        return None
    except Exception as e:
        print(f"\n{C.BOLD}{C.RED}💥 Error inesperado al procesar la URL: {e}{C.END}")
        return None

def main():
    """Flujo principal del script."""
    try:
        while True:
            limpiar_pantalla()
            mostrar_banner()
            print(f"{C.YELLOW}Esta herramienta extrae automáticamente título, portada, descripción y video de una URL.{C.END}")
            print(f"{C.GREY}Pega la URL del video que quieres añadir y presiona Enter.{C.END}")
            print(f"{C.GREY}Escribe 'salir' para volver al menú principal.{C.END}\n")
            
            url = input(f"{C.BOLD}{C.BLUE}🔗 Introduce la URL: {C.END}").strip()

            if url.lower() == 'salir':
                print(f"\n{C.BOLD}{C.YELLOW}👋 Saliendo de la herramienta...{C.END}")
                break
            
            if not url.startswith(('http://', 'https://')):
                print(f"\n{C.BOLD}{C.RED}❌ URL no válida. Debe empezar con http:// o https://{C.END}")
                input(f"\n{C.YELLOW}Presiona Enter para intentarlo de nuevo...{C.END}")
                continue

            borrador = scrape_any_url(url)

            if borrador and borrador.get("titulo") != "Título no encontrado":
                base_datos = cargar_base_datos()
                base_datos.append(borrador)
                guardar_base_datos(base_datos)
            elif borrador:
                print(f"\n{C.RED}❌ No se pudo extraer un título válido. El borrador no se guardó.{C.END}")
            
            input(f"\n{C.BOLD}{C.YELLOW}⏎ Presiona Enter para añadir otra URL o escribe 'salir'...{C.END}")

    except KeyboardInterrupt:
        print(f"\n\n{C.BOLD}{C.RED}🚫 Operación cancelada por el usuario.{C.END}")
        sys.exit(0)

if __name__ == "__main__":
    main()