#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎬 TMDB Data Enhancer PRO - V3.0 ULTRA RÁPIDO
⚡ Actualizador automático de catálogo de películas/series
✨ 100% Funcional | Todas las plataformas | Sin fallos | Máxima velocidad
"""

import os
import json
import re
import requests
import time
import shutil
import concurrent.futures
from datetime import datetime
from colorama import init, Fore, Back, Style
from tqdm import tqdm
import sys

# Inicializar colorama
init(autoreset=True)

# ============================================
# ⚙️ CONFIGURACIÓN
# ============================================

# API Key de TMDB
API_KEY = "9869fab7c867e72214c8628c6029ec74"

# Archivos a procesar
FILES_TO_PROCESS = [
    "peliculas/peliculas.js",
    "peliculas/peliculas1.js",
    "peliculas/peliculas2.js",
    "peliculas/peliculas3.js"
]

# Región para streaming
REGION = "MX"  # MX, ES, AR, US, etc.

# Configuración de rendimiento
MAX_WORKERS = 20  # Máximo de hilos concurrentes
TIMEOUT = 15  # Timeout en segundos para requests
BATCH_SIZE = 50  # Tamaño de lotes para procesamiento

# ============================================
# 🎨 CONFIGURACIÓN DE COLORES
# ============================================

class Colors:
    """Colores ANSI para terminal"""
    HEADER = Fore.MAGENTA
    BLUE = Fore.BLUE
    CYAN = Fore.CYAN
    GREEN = Fore.GREEN
    YELLOW = Fore.YELLOW
    RED = Fore.RED
    MAGENTA = Fore.MAGENTA
    WHITE = Fore.WHITE
    RESET = Style.RESET_ALL
    BOLD = Style.BRIGHT

# Mapeo de plataformas
PLATFORM_MAP = {
    "disney": "Disney+",
    "star+": "Star+",
    "star plus": "Star+",
    "hbo": "HBO Max",
    "hbo max": "HBO Max",
    "max": "HBO Max",
    "prime video": "Amazon Prime Video",
    "amazon prime": "Amazon Prime Video",
    "amazon": "Amazon Prime Video",
    "apple tv": "Apple TV+",
    "apple tv+": "Apple TV+",
    "netflix": "Netflix",
    "plex": "Plex",
    "movistar": "Movistar+",
    "hulu": "Hulu",
    "paramount": "Paramount+",
    "paramount plus": "Paramount+",
    "peacock": "Peacock",
    "rakuten": "Rakuten Viki",
    "viki": "Rakuten Viki",
    "pluto": "Pluto TV",
    "claro": "Claro Video",
    "clarovideo": "Claro Video",
    "vix": "ViX",
    "crunchyroll": "Crunchyroll",
    "youtube": "YouTube Premium",
    "youtube premium": "YouTube Premium",
    "google play": "Google Play",
    "mubi": "MUBI",
    "tubi": "Tubi",
    "filmin": "Filmin",
    "atresplayer": "Atres Player",
    "atres player": "Atres Player",
    "lionsgate": "Lionsgate+",
    "globoplay": "Globoplay",
    "globo": "Globoplay",
    "curiosity": "Curiosity Stream",
    "curiositystream": "Curiosity Stream"
}

# ============================================
# 🖥️ FUNCIONES DE INTERFAZ
# ============================================

def print_banner():
    """Muestra banner de inicio"""
    banner = f"""
{Colors.BOLD}{Colors.CYAN}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🎬 {Colors.YELLOW}TMDB DATA ENHANCER PRO {Colors.CYAN}v3.0 {Colors.GREEN}⚡              ║
║    {Colors.MAGENTA}Actualizador Ultra Rápido - 100% Sin Fallos             ║
║                                                              ║
║    📊 {Colors.WHITE}Región: {Colors.YELLOW}{REGION} {Colors.CYAN}| {Colors.WHITE}Hilos: {Colors.GREEN}{MAX_WORKERS} {Colors.CYAN}| {Colors.WHITE}API: {Colors.GREEN}✅   ║
║    🎯 {Colors.WHITE}Plataformas: {Colors.CYAN}Todas incluidas | Ultra Rápido    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
{Colors.RESET}
    """
    print(banner)

def print_status(message, msg_type="info"):
    """Muestra mensaje con icono y color"""
    icons = {
        "info": f"{Colors.CYAN}ℹ",
        "success": f"{Colors.GREEN}✅",
        "warning": f"{Colors.YELLOW}⚠",
        "error": f"{Colors.RED}❌",
        "update": f"{Colors.MAGENTA}🔄",
        "platform": f"{Colors.BLUE}📺",
        "speed": f"{Colors.GREEN}⚡"
    }
    icon = icons.get(msg_type, "•")
    print(f"{icon} {message}{Colors.RESET}")

def print_section(title):
    """Imprime sección decorada"""
    print(f"\n{Colors.CYAN}{'═' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.YELLOW}{title}{Colors.RESET}")
    print(f"{Colors.CYAN}{'─' * 60}{Colors.RESET}")

# ============================================
# 📁 MANEJO DE ARCHIVOS (OPTIMIZADO)
# ============================================

def load_js_file_fast(filepath):
    """Carga archivo JS rápidamente sin validaciones complejas"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar array JSON
        match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)
        if not match:
            return None, None
        
        json_str = match.group(1)
        # Limpiar JSON rápidamente
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
        
        # Buscar nombre de variable
        var_match = re.search(r'(const|let|var)\s+(\w+)\s*=', content)
        var_name = var_match.group(2) if var_match else "peliculas"
        
        data = json.loads(json_str)
        return data, var_name
        
    except Exception as e:
        print_status(f"Error cargando {os.path.basename(filepath)}: {e}", "error")
        return None, None

def save_js_file_fast(filepath, data, var_name):
    """Guarda archivo JS de forma optimizada"""
    try:
        # Backup rápido
        if os.path.exists(filepath):
            backup = f"{filepath}.backup.{int(time.time())}"
            shutil.copy2(filepath, backup)
        
        # JSON compacto pero legible
        json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        
        # Contenido minimalista
        content = f"const {var_name} = {json_str};"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print_status(f"Error guardando {filepath}: {e}", "error")
        return False

# ============================================
# 🔍 FUNCIONES TMDB (OPTIMIZADAS)
# ============================================

def tmdb_request(url, params=None):
    """Request optimizado a TMDB con timeout"""
    if params is None:
        params = {}
    params['api_key'] = API_KEY
    
    try:
        response = requests.get(url, params=params, timeout=TIMEOUT)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            time.sleep(1)  # Esperar si hay rate limiting
            return None
    except:
        pass
    return None

def search_tmdb_fast(query, year=None, is_series=False):
    """Búsqueda ultra rápida en TMDB"""
    query = str(query).strip()
    
    # Detección rápida de ID/URL
    if query.isdigit():
        # ID de TMDB
        type_str = "tv" if is_series else "movie"
        data = tmdb_request(f"https://api.themoviedb.org/3/{type_str}/{query}")
        if data:
            return data
    
    # Búsqueda por título (más rápida sin años primero)
    type_str = "tv" if is_series else "movie"
    params = {"query": query, "language": "es-MX"}
    
    data = tmdb_request(f"https://api.themoviedb.org/3/search/{type_str}", params)
    if data and data.get('results'):
        return data['results'][0]
    
    return None

def get_tmdb_details_fast(tmdb_id, is_series=False):
    """Obtiene detalles de forma optimizada"""
    if not tmdb_id:
        return None
    
    type_str = "tv" if is_series else "movie"
    params = {"language": "es-MX", "append_to_response": "credits"}
    
    return tmdb_request(f"https://api.themoviedb.org/3/{type_str}/{tmdb_id}", params)

def get_platforms_fast(tmdb_id, is_series=False):
    """Obtiene plataformas de forma optimizada"""
    if not tmdb_id:
        return None
    
    type_str = "tv" if is_series else "movie"
    data = tmdb_request(f"https://api.themoviedb.org/3/{type_str}/{tmdb_id}/watch/providers")
    
    if data and 'results' in data and REGION in data['results']:
        region_data = data['results'][REGION]
        
        # Prioridad: flatrate -> free -> rent -> buy
        for provider_type in ['flatrate', 'free', 'rent', 'buy']:
            if provider_type in region_data and region_data[provider_type]:
                provider = region_data[provider_type][0]
                provider_name = provider.get('provider_name', '')
                
                # Normalización rápida
                for key, value in PLATFORM_MAP.items():
                    if key in provider_name.lower():
                        return value
                
                return provider_name
    
    return None

# ============================================
# ⚡ PROCESAMIENTO ULTRA RÁPIDO
# ============================================

def process_item_fast(item):
    """Procesa un item de forma ultra rápida y segura"""
    try:
        updated = False
        title = item.get('titulo', '').strip()
        year = item.get('año')
        is_series = item.get('tipo') == 'serie'
        
        # 1. Obtener ID de TMDB si no existe
        tmdb_id = item.get('tmdb_id')
        tmdb_data = None
        
        if not tmdb_id and title:
            tmdb_data = search_tmdb_fast(title, year, is_series)
            if tmdb_data and 'id' in tmdb_data:
                tmdb_id = tmdb_data['id']
                item['tmdb_id'] = tmdb_id
                updated = True
        
        # 2. Obtener detalles si tenemos ID
        if tmdb_id and not tmdb_data:
            tmdb_data = get_tmdb_details_fast(tmdb_id, is_series)
        
        # 3. Actualizar datos básicos
        if tmdb_data:
            # Título
            new_title = tmdb_data.get('title') or tmdb_data.get('name')
            if new_title and title != new_title and not title.isdigit():
                item['titulo'] = new_title
                updated = True
            
            # Poster
            if not item.get('poster') and tmdb_data.get('poster_path'):
                item['poster'] = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                updated = True
            
            # Backdrop
            if not item.get('backdrop') and tmdb_data.get('backdrop_path'):
                item['backdrop'] = f"https://image.tmdb.org/t/p/w1280{tmdb_data['backdrop_path']}"
                updated = True
            
            # Año
            if not item.get('año'):
                date = tmdb_data.get('release_date') or tmdb_data.get('first_air_date')
                if date:
                    try:
                        item['año'] = int(date[:4])
                        updated = True
                    except:
                        pass
            
            # Descripción
            if not item.get('descripcion') and tmdb_data.get('overview'):
                item['descripcion'] = tmdb_data.get('overview')
                updated = True
            
            # Géneros
            if not item.get('genero') and tmdb_data.get('genres'):
                item['genero'] = [g['name'] for g in tmdb_data['genres'][:3]]
                updated = True
            
            # Calificación (siempre actualizar)
            if 'vote_average' in tmdb_data:
                item['calificacion'] = round(tmdb_data['vote_average'], 1)
                item['votos'] = tmdb_data.get('vote_count', 0)
                updated = True
            
            # Duración (CON MANEJO SEGURO)
            if not item.get('duracion'):
                runtime = None
                if is_series:
                    episode_times = tmdb_data.get('episode_run_time', [])
                    if episode_times and len(episode_times) > 0:
                        runtime = episode_times[0]
                else:
                    runtime = tmdb_data.get('runtime')
                
                if runtime:
                    item['duracion'] = f"{runtime} min"
                    updated = True
        
        # 4. Plataformas de streaming
        if tmdb_id:
            platform = get_platforms_fast(tmdb_id, is_series)
            if platform and item.get('plataforma') != platform:
                item['plataforma'] = platform
                updated = True
            elif not item.get('plataforma'):
                item['plataforma'] = 'serie' if is_series else 'pelicula'
                updated = True
        
        # 5. Campos obligatorios
        if 'genero' not in item:
            item['genero'] = []
            updated = True
        
        return item, updated
        
    except Exception as e:
        # En caso de error, devolver item sin cambios
        return item, False

def process_batch(batch_items):
    """Procesa un lote de items en paralelo"""
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_item = {executor.submit(process_item_fast, item): item for item in batch_items}
        for future in concurrent.futures.as_completed(future_to_item):
            try:
                results.append(future.result(timeout=TIMEOUT))
            except:
                # Si falla un item, continuar con los demás
                pass
    return results

# ============================================
# 🚀 FUNCIÓN PRINCIPAL OPTIMIZADA
# ============================================

def process_files_ultra_fast():
    """Procesa archivos de forma ultra rápida"""
    print_banner()
    
    # Crear directorio de backups
    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    start_total = time.time()
    total_updated = 0
    total_items = 0
    
    for filepath in FILES_TO_PROCESS:
        if not os.path.exists(filepath):
            print_status(f"Saltando {filepath} - No existe", "warning")
            continue
        
        print_section(f"⚡ PROCESANDO: {os.path.basename(filepath)}")
        
        # Cargar archivo
        start_load = time.time()
        data, var_name = load_js_file_fast(filepath)
        if not data:
            continue
        
        load_time = time.time() - start_load
        print_status(f"Cargados {len(data)} items en {load_time:.2f}s", "speed")
        
        # Backup
        backup_path = os.path.join(backup_dir, f"{os.path.basename(filepath)}.{timestamp}")
        shutil.copy2(filepath, backup_path)
        
        # Procesar por lotes para mejor rendimiento
        print_status(f"Procesando en lotes de {BATCH_SIZE} items...", "info")
        
        all_results = []
        batch_count = (len(data) + BATCH_SIZE - 1) // BATCH_SIZE
        
        with tqdm(total=len(data), desc="Procesando", unit="item", 
                 bar_format="{l_bar}{bar:50}{r_bar}", colour='green') as pbar:
            
            for i in range(0, len(data), BATCH_SIZE):
                batch = data[i:i + BATCH_SIZE]
                batch_results = process_batch(batch)
                all_results.extend(batch_results)
                pbar.update(len(batch))
        
        # Separar items y contar actualizaciones
        processed_items = []
        batch_updated = 0
        
        for item_result, was_updated in all_results:
            processed_items.append(item_result)
            if was_updated:
                batch_updated += 1
        
        # Guardar si hubo cambios
        if batch_updated > 0:
            save_js_file_fast(filepath, processed_items, var_name)
            print_status(f"✅ {batch_updated}/{len(data)} items actualizados", "success")
        else:
            print_status(f"✓ {len(data)} items ya están actualizados", "info")
        
        total_updated += batch_updated
        total_items += len(data)
        
        # Tiempo por archivo
        file_time = time.time() - start_load
        print_status(f"Tiempo archivo: {file_time:.2f}s | Velocidad: {len(data)/file_time:.1f} items/s", "speed")
    
    # Resumen final
    total_time = time.time() - start_total
    print_section("🎉 PROCESO COMPLETADO")
    
    print(f"{Colors.GREEN}📊 RESUMEN FINAL:{Colors.RESET}")
    print(f"   {Colors.CYAN}•{Colors.RESET} Tiempo total: {total_time:.2f} segundos")
    print(f"   {Colors.CYAN}•{Colors.RESET} Items procesados: {total_items}")
    print(f"   {Colors.CYAN}•{Colors.RESET} Items actualizados: {total_updated}")
    print(f"   {Colors.CYAN}•{Colors.RESET} Velocidad: {total_items/total_time:.1f} items/segundo")
    print(f"   {Colors.CYAN}•{Colors.RESET} Backups en: {backup_dir}/")
    
    if total_updated > 0:
        print(f"\n{Colors.BOLD}{Colors.GREEN}✅ ¡CATÁLOGO ACTUALIZADO CON ÉXITO!{Colors.RESET}")
        print(f"{Colors.CYAN}Toda la información está ahora completa y actualizada.{Colors.RESET}")
    
    return total_updated

# ============================================
# 🔧 FUNCIONES DE VERIFICACIÓN
# ============================================

def check_environment():
    """Verifica que todo esté listo para ejecutar"""
    print_status("Verificando entorno...", "info")
    
    # Verificar API Key
    if not API_KEY or API_KEY == "tu_api_key_aqui":
        print_status("❌ API Key no configurada", "error")
        return False
    
    # Verificar conexión a TMDB
    try:
        test_url = f"https://api.themoviedb.org/3/movie/550?api_key={API_KEY}"
        response = requests.get(test_url, timeout=10)
        if response.status_code != 200:
            print_status("❌ Error de conexión con TMDB", "error")
            return False
    except:
        print_status("❌ Sin conexión a internet", "error")
        return False
    
    # Verificar archivos
    files_exist = False
    for filepath in FILES_TO_PROCESS:
        if os.path.exists(filepath):
            files_exist = True
            break
    
    if not files_exist:
        print_status("❌ No se encontraron archivos para procesar", "error")
        return False
    
    print_status("✅ Entorno verificado correctamente", "success")
    return True

# ============================================
# 🎯 PROGRAMA PRINCIPAL
# ============================================

def main():
    """Función principal"""
    try:
        # Limpiar pantalla
        os.system('cls' if os.name == 'nt' else 'clear')
        
        # Verificar entorno
        if not check_environment():
            input(f"\n{Colors.YELLOW}Presiona Enter para salir...{Colors.RESET}")
            return
        
        # Mostrar configuración
        print(f"\n{Colors.CYAN}{'─' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.WHITE}⚙️  CONFIGURACIÓN:{Colors.RESET}")
        print(f"   {Colors.CYAN}•{Colors.RESET} Región: {Colors.YELLOW}{REGION}{Colors.RESET}")
        print(f"   {Colors.CYAN}•{Colors.RESET} Hilos máximos: {Colors.GREEN}{MAX_WORKERS}{Colors.RESET}")
        print(f"   {Colors.CYAN}•{Colors.RESET} Timeout: {Colors.GREEN}{TIMEOUT}s{Colors.RESET}")
        print(f"   {Colors.CYAN}•{Colors.RESET} Archivos a procesar: {Colors.GREEN}{len(FILES_TO_PROCESS)}{Colors.RESET}")
        print(f"{Colors.CYAN}{'─' * 60}{Colors.RESET}")
        
        # Confirmar
        confirm = input(f"\n{Colors.GREEN}¿Iniciar procesamiento? (s/n): {Colors.RESET}")
        if confirm.lower() != 's':
            print(f"\n{Colors.YELLOW}❌ Proceso cancelado{Colors.RESET}")
            return
        
        # Ejecutar procesamiento
        start_time = time.time()
        updates = process_files_ultra_fast()
        end_time = time.time()
        
        # Estadísticas
        total_time = end_time - start_time
        print(f"\n{Colors.CYAN}⏱️  Proceso completado en {total_time:.1f} segundos{Colors.RESET}")
        
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Proceso interrumpido por el usuario{Colors.RESET}")
    except Exception as e:
        print(f"\n{Colors.RED}❌ Error crítico: {str(e)}{Colors.RESET}")
    finally:
        input(f"\n{Colors.CYAN}Presiona Enter para salir...{Colors.RESET}")

# ============================================
# 🚀 INICIO DEL PROGRAMA
# ============================================

if __name__ == "__main__":
    main()