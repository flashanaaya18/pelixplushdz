// peliculas3.js - Generado automáticamente desde https://zonahack.com.ar/movie/28%20a%C3%B1os%20despu%C3%A9s%20-%202025
// Fecha: 2026-01-18 18:26:29
// Total: 0 películas, 0 series

const contenidoExtraido = {
  "metadata": {
    "generado": "2026-01-18 18:26:29",
    "url_analizada": "https://zonahack.com.ar/movie/28%20a%C3%B1os%20despu%C3%A9s%20-%202025",
    "total_elementos": 1,
    "peliculas": 0,
    "series": 0,
    "otros": 1,
    "estadisticas": {
      "iframes_encontrados": 1,
      "iframes_analizados": 0,
      "contenido_pagina": 1
    }
  },
  "contenidos": {
    "peliculas": [],
    "series": [],
    "otros": [
      {
        "tipo": "desconocido",
        "titulo": "Zonahack",
        "idioma": "desconocido",
        "calidad": "desconocida",
        "año": "",
        "iframe": false,
        "url": "https://zonahack.com.ar/movie/28%20a%C3%B1os%20despu%C3%A9s%20-%202025",
        "pagina_principal": true
      }
    ]
  }
};

// ==================== FUNCIONES PRINCIPALES ====================

function mostrarTodo() {
    console.log('\n🎬 CONTENIDO EXTRAÍDO - ' + contenidoExtraido.metadata.url_analizada);
    console.log('='.repeat(60));
    
    // Mostrar películas
    if (contenidoExtraido.contenidos.peliculas.length > 0) {
        console.log('\n🎥 PELÍCULAS ENCONTRADAS:');
        contenidoExtraido.contenidos.peliculas.forEach((peli, index) => {
            console.log(`  ${index + 1}. ${peli.titulo}`);
            console.log(`     Tipo: ${peli.tipo} | Idioma: ${peli.idioma} | Calidad: ${peli.calidad}`);
            if (peli.año) console.log(`     Año: ${peli.año}`);
            console.log(`     URL: ${peli.url.substring(0, 60)}...`);
            console.log(`     Iframe: ${peli.iframe ? 'Sí' : 'No'}`);
            console.log('     ---');
        });
    }
    
    // Mostrar series
    if (contenidoExtraido.contenidos.series.length > 0) {
        console.log('\n📺 SERIES ENCONTRADAS:');
        contenidoExtraido.contenidos.series.forEach((serie, index) => {
            console.log(`  ${index + 1}. ${serie.titulo}`);
            console.log(`     Idioma: ${serie.idioma} | Calidad: ${serie.calidad}`);
            if (serie.año) console.log(`     Año: ${serie.año}`);
            console.log(`     URL: ${serie.url.substring(0, 60)}...`);
            console.log('     ---');
        });
    }
    
    // Mostrar otros
    if (contenidoExtraido.contenidos.otros.length > 0) {
        console.log('\n🎭 OTROS CONTENIDOS:');
        contenidoExtraido.contenidos.otros.slice(0, 5).forEach((otro, index) => {
            console.log(`  ${index + 1}. ${otro.titulo}`);
            console.log(`     Tipo: ${otro.tipo} | URL: ${otro.url.substring(0, 50)}...`);
            console.log('     ---');
        });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Total elementos: ${contenidoExtraido.metadata.total_elementos}`);
    console.log(`🌐 Analizado desde: ${contenidoExtraido.metadata.url_analizada}`);
    console.log('='.repeat(60));
}

function obtenerPeliculas() {
    return contenidoExtraido.contenidos.peliculas;
}

function obtenerSeries() {
    return contenidoExtraido.contenidos.series;
}

function buscarPorIdioma(idioma) {
    const todos = [
        ...contenidoExtraido.contenidos.peliculas,
        ...contenidoExtraido.contenidos.series,
        ...contenidoExtraido.contenidos.otros
    ];
    
    return todos.filter(item => 
        item.idioma && item.idioma.toLowerCase().includes(idioma.toLowerCase())
    );
}

function buscarPorCalidad(calidad) {
    const todos = [
        ...contenidoExtraido.contenidos.peliculas,
        ...contenidoExtraido.contenidos.series,
        ...contenidoExtraido.contenidos.otros
    ];
    
    return todos.filter(item => 
        item.calidad && item.calidad.toLowerCase().includes(calidad.toLowerCase())
    );
}

function obtenerIframes() {
    const todos = [
        ...contenidoExtraido.contenidos.peliculas,
        ...contenidoExtraido.contenidos.series,
        ...contenidoExtraido.contenidos.otros
    ];
    
    return todos.filter(item => item.iframe === true);
}

function buscarPorTitulo(titulo) {
    const todos = [
        ...contenidoExtraido.contenidos.peliculas,
        ...contenidoExtraido.contenidos.series,
        ...contenidoExtraido.contenidos.otros
    ];
    
    return todos.filter(item => 
        item.titulo && item.titulo.toLowerCase().includes(titulo.toLowerCase())
    );
}

// ==================== INICIALIZACIÓN ====================

console.log('🚀 Contenido extraído cargado correctamente!');
console.log(`📅 Generado el: ${contenidoExtraido.metadata.generado}`);
console.log(`🔗 URL analizada: ${contenidoExtraido.metadata.url_analizada}`);
console.log('\n💡 Usa estas funciones:');
console.log('   - mostrarTodo()');
console.log('   - obtenerPeliculas()');
console.log('   - obtenerSeries()');
console.log('   - buscarPorIdioma("latino")');
console.log('   - buscarPorCalidad("1080p")');
console.log('   - obtenerIframes()');
console.log('   - buscarPorTitulo("aventura")');
console.log('\n' + '='.repeat(50));

// Mostrar resumen automáticamente
setTimeout(() => { mostrarTodo(); }, 1000);

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        contenidoExtraido,
        mostrarTodo,
        obtenerPeliculas,
        obtenerSeries,
        buscarPorIdioma,
        buscarPorCalidad,
        obtenerIframes,
        buscarPorTitulo
    };
}
