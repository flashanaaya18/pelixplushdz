import tmdbsimple as tmdb
import requests
from datetime import datetime
import time
import re

class TMDBAdvanced:
    def __init__(self, api_key):
        tmdb.API_KEY = api_key
        
    def search_movie_enhanced(self, query, year=None, language='es-ES'):
        """Búsqueda mejorada de películas"""
        search = tmdb.Search()
        
        # Primera búsqueda
        results = search.movie(query=query, language=language)
        
        if not results.get('results') and year:
            # Intentar con año
            results = search.movie(query=f"{query} {year}", language=language)
        
        return results
    
    def search_tv_enhanced(self, query, year=None, language='es-ES'):
        """Búsqueda mejorada de series"""
        search = tmdb.Search()
        
        # Primera búsqueda
        results = search.tv(query=query, language=language)
        
        if not results.get('results') and year:
            # Intentar con año
            results = search.tv(query=f"{query} {year}", language=language)
        
        return results
    
    def get_movie_with_extras(self, movie_id, language='es-ES'):
        """Obtiene película con información extra"""
        movie = tmdb.Movies(movie_id)
        
        try:
            info = movie.info(language=language)
            credits = movie.credits(language=language)
            videos = movie.videos(language=language)
            images = movie.images(language=language)
            
            # Obtener similares
            try:
                similar = movie.similar(language=language)
            except:
                similar = {'results': []}
            
            # Obtener recomendaciones
            try:
                recommendations = movie.recommendations(language=language)
            except:
                recommendations = {'results': []}
            
            return {
                'info': info,
                'credits': credits,
                'videos': videos,
                'images': images,
                'similar': similar,
                'recommendations': recommendations
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_tv_with_extras(self, tv_id, language='es-ES'):
        """Obtiene serie con información extra"""
        tv = tmdb.TV(tv_id)
        
        try:
            info = tv.info(language=language)
            credits = tv.credits(language=language)
            videos = tv.videos(language=language)
            images = tv.images(language=language)
            
            # Obtener temporadas
            seasons = []
            for season_num in range(1, min(info.get('number_of_seasons', 1) + 1, 6)):
                try:
                    season_info = tv.season(season_num, language=language)
                    seasons.append(season_info)
                except:
                    break
            
            # Obtener similares
            try:
                similar = tv.similar(language=language)
            except:
                similar = {'results': []}
            
            return {
                'info': info,
                'credits': credits,
                'videos': videos,
                'images': images,
                'seasons': seasons,
                'similar': similar
            }
        except Exception as e:
            return {'error': str(e)}
    
    def multi_search(self, query, language='es-ES'):
        """Búsqueda múltiple (películas, series, personas)"""
        search = tmdb.Search()
        return search.multi(query=query, language=language)
    
    def get_trending(self, media_type='all', time_window='day', language='es-ES'):
        """Obtiene tendencias"""
        trending = tmdb.Trending(media_type, time_window)
        return trending.info(language=language)

def main():
    print("🎬 TMDB Advanced Tool")
    query = input("Buscar: ")
    
    tmdb_adv = TMDBAdvanced(tmdb.API_KEY)
    results = tmdb_adv.multi_search(query)
    
    print(f"\n📊 Resultados encontrados: {len(results.get('results', []))}")
    for item in results.get('results', [])[:10]:
        media_type = item.get('media_type', 'desconocido')
        title = item.get('title') or item.get('name') or 'Sin título'
        print(f"  - {title} ({media_type})")
