// Código ultra-avanzado para Chrome móvil - Simulación real de anuncios
(function() {
    'use strict';
    
    class AdvancedAdDetector {
        constructor() {
            this.detectionScore = 0;
            this.threshold = 3;
            this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            this.isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            this.init();
        }
        
        init() {
            if (this.isMobile && this.isChrome) {
                this.enhancedMobileDetection();
            }
            this.executeStealthDetection();
        }
        
        enhancedMobileDetection() {
            // Técnicas específicas para Chrome móvil
            this.checkViewportBehavior();
            this.analyzeTouchEvents();
            this.checkBatteryAPI();
            this.detectMobileAdBlockers();
            this.simulateRealAdBehavior();
        }
        
        checkViewportBehavior() {
            // Los bloqueadores a veces modifican el viewport en móvil
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport && viewport.content.includes('maximum-scale=1')) {
                this.detectionScore += 1;
            }
            
            // Verificar dimensiones inusuales
            if (window.innerWidth === screen.width && window.innerHeight === screen.height) {
                this.detectionScore += 0.5;
            }
        }
        
        analyzeTouchEvents() {
            // Analizar comportamiento táctil específico de móvil
            let touchMoves = 0;
            document.addEventListener('touchmove', () => {
                touchMoves++;
                if (touchMoves > 10) {
                    // Comportamiento normal de usuario móvil
                    this.detectionScore -= 0.5;
                }
            }, { passive: true });
        }
        
        checkBatteryAPI() {
            // API de batería para detectar dispositivos móviles reales
            if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                    if (battery.charging !== undefined) {
                        // Dispositivo real con API de batería
                        this.monitorNetworkRequests();
                    }
                });
            }
        }
        
        detectMobileAdBlockers() {
            // Lista de bloqueadores específicos de móvil
            const mobileBlockers = [
                'adguard',
                'adblock',
                'ublock',
                'brave',
                'blockthis',
                'dns666',
                'adclear'
            ];
            
            // Verificar en scripts cargados
            Array.from(document.scripts).forEach(script => {
                mobileBlockers.forEach(blocker => {
                    if (script.src.toLowerCase().includes(blocker)) {
                        this.detectionScore += 2;
                    }
                });
            });
            
            // Verificar en localStorage
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    mobileBlockers.forEach(blocker => {
                        if (key && key.toLowerCase().includes(blocker)) {
                            this.detectionScore += 1.5;
                        }
                    });
                }
            } catch (e) {}
        }
        
        simulateRealAdBehavior() {
            // Simulación ultra-realista de anuncios para móvil
            this.createMockAdElements();
            this.simulateAdLoading();
            this.mimicAdNetworkRequests();
            this.createFakeAdIframes();
        }
        
        createMockAdElements() {
            // Crear elementos que parecen anuncios reales
            const adContainers = [
                { id: 'google_ads_iframe_1', class: 'adsbygoogle' },
                { id: 'ad-container-728x90', class: 'banner-ad' },
                { id: 'mobile-ad-unit', class: 'mobile-ad' }
            ];
            
            adContainers.forEach(ad => {
                const element = document.createElement('div');
                element.id = ad.id;
                element.className = ad.class;
                element.style.cssText = 'display:block;width:100%;height:90px;background:transparent;border:none;margin:5px 0;';
                element.setAttribute('data-ad-status', 'filled');
                document.body.appendChild(element);
            });
        }
        
        simulateAdLoading() {
            // Simular carga progresiva como anuncios reales
            /*
            setTimeout(() => {
                const fakeAd = document.createElement('div');
                fakeAd.innerHTML = `
                    <div style="width:320px;height:50px;margin:10px auto;background:#f0f0f0;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-size:12px;color:#666;">
                        🔍 Anuncio • Patrocinado por ejemplo.com
                    </div>
                `;
                document.body.appendChild(fakeAd);
                
                // Simular múltiples anuncios como en móvil
                this.createInfiniteAdStream();
            }, 1500);
            */
        }
        
        createInfiniteAdStream() {
            // Simular flujo infinito de anuncios como en apps móviles
            let adCount = 0;
            const adInterval = setInterval(() => {
                if (adCount < 5) { // Limitar a 5 anuncios de ejemplo
                    this.createNativeAd();
                    adCount++;
                } else {
                    clearInterval(adInterval);
                }
            }, 3000);
        }
        
        createNativeAd() {
            // Anuncios nativos que parecen contenido real
            const nativeAd = document.createElement('div');
            nativeAd.className = 'content-item sponsored-post';
            nativeAd.style.cssText = 'margin:15px;padding:15px;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);';
            nativeAd.innerHTML = `
                <div style="display:flex;align-items:center;margin-bottom:10px;">
                    <div style="width:40px;height:40px;border-radius:50%;background:#4CAF50;margin-right:10px;"></div>
                    <div>
                        <div style="font-weight:bold;font-size:14px;">Patrocinado • Anuncio</div>
                        <div style="font-size:12px;color:#666;">Hace unos momentos</div>
                    </div>
                </div>
                <div style="font-size:16px;margin-bottom:10px;">Descubre esta increíble oferta móvil exclusiva</div>
                <div style="width:100%;height:200px;background:#e0e0e0;border-radius:4px;margin-bottom:10px;"></div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;">
                    <span>👍 125</span>
                    <span>💬 23</span>
                    <span>🔄 45</span>
                </div>
            `;
            
            // Insertar en lugares naturales del contenido
            const contentElements = document.querySelectorAll('p, div, article');
            if (contentElements.length > 3) {
                const randomPos = Math.floor(Math.random() * (contentElements.length - 3)) + 2;
                contentElements[randomPos].parentNode.insertBefore(nativeAd, contentElements[randomPos].nextSibling);
            }
        }
        
        mimicAdNetworkRequests() {
            // Simular peticiones a redes publicitarias reales
            const adNetworks = [
                'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
                'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
                'https://cdn.adnxs.com/ast/ast.js',
                'https://static.ads-twitter.com/uwt.js'
            ];
            
            adNetworks.forEach(url => {
                fetch(url, { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    credentials: 'omit'
                }).catch(() => {
                    // Incrementar score si fallan múltiples redes
                    this.detectionScore += 0.3;
                });
            });
        }
        
        createFakeAdIframes() {
            // Iframes que parecen de anuncios reales
            const iframe = document.createElement('iframe');
            iframe.src = 'about:blank';
            iframe.style.cssText = 'width:300px;height:250px;border:none;margin:10px auto;display:block;background:transparent;';
            iframe.sandbox = 'allow-scripts allow-same-origin';
            iframe.onload = () => {
                /*
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.body.innerHTML = `
                        <div style="width:100%;height:100%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-family:Arial,sans-serif;font-size:18px;">
                            Espacio Publicitario
                        </div>
                    `;
                } catch (e) {}
                */
            };
            document.body.appendChild(iframe);
        }
        
        executeStealthDetection() {
            // Detección sigilosa que no interfiere con la experiencia móvil
            const detectionMethods = [
                this.checkResourceBlocking.bind(this),
                this.analyzePerformanceMetrics.bind(this),
                this.detectDOMModifications.bind(this),
                this.checkStorageQuirks.bind(this)
            ];
            
            // Ejecutar métodos de forma aleatoria y retardada
            detectionMethods.forEach((method, index) => {
                setTimeout(() => {
                    try {
                        method();
                    } catch (e) {
                        // Silenciar errores
                    }
                }, 1000 + (index * 2000) + Math.random() * 3000);
            });
            
            // Evaluación final
            setTimeout(() => {
                this.finalEvaluation();
            }, 15000);
        }
        
        checkResourceBlocking() {
            // Verificar bloqueo de recursos específicos de móvil
            const mobileAdResources = [
                '/mobile-ad.js',
                '/ads/mobile/banner.js',
                '/inapp-ads/config.js'
            ];
            
            let blockedCount = 0;
            mobileAdResources.forEach(resource => {
                const img = new Image();
                img.onerror = () => blockedCount++;
                img.src = resource;
            });
            
            if (blockedCount > mobileAdResources.length * 0.7) {
                this.detectionScore += 2;
            }
        }
        
        analyzePerformanceMetrics() {
            // Analizar métricas de performance específicas de móvil
            if ('performance' in window) {
                const entries = performance.getEntriesByType('resource');
                const adResources = entries.filter(entry => 
                    entry.name.includes('ad') || 
                    entry.name.includes('doubleclick') ||
                    entry.name.includes('googleads')
                );
                
                if (adResources.length === 0) {
                    this.detectionScore += 1;
                }
            }
        }
        
        detectDOMModifications() {
            // Observar modificaciones DOM que hacen los bloqueadores
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1 && (
                            node.className.includes('ad') ||
                            node.id.includes('ad') ||
                            node.src && node.src.includes('ad')
                        )) {
                            this.detectionScore += 0.5;
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        checkStorageQuirks() {
            // Verificar peculiaridades de almacenamiento en móvil
            try {
                const testKey = 'ad_detection_test';
                localStorage.setItem(testKey, 'test');
                const value = localStorage.getItem(testKey);
                localStorage.removeItem(testKey);
                
                if (value !== 'test') {
                    this.detectionScore += 1;
                }
            } catch (e) {
                this.detectionScore += 0.5;
            }
        }
        
        finalEvaluation() {
            if (this.detectionScore >= this.threshold) {
                this.triggerAdBlockDetection();
            } else {
                // Anuncios no bloqueados - comportamiento normal
                window.adsAreNotBlocked = true;
                this.showRealAds();
            }
        }
        
        triggerAdBlockDetection() {
            Object.defineProperty(window, 'adsAreNotBlocked', {
                value: false,
                writable: false,
                configurable: false
            });
            
            // Acciones cuando se detecta bloqueador
            this.showAdBlockMessage();
            this.limitContentAccess();
        }
        
        showRealAds() {
            // Aquí iría la lógica real para mostrar anuncios
            console.log('Mostrando anuncios reales para Chrome móvil');
        }
        
        showAdBlockMessage() {
            // Mensaje sutil para usuarios móviles
            const message = document.createElement('div');
            message.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#ffeb3b;color:#333;padding:10px;text-align:center;font-family:Arial,sans-serif;font-size:14px;z-index:10000;';
            message.innerHTML = '🔒 Para soportar nuestro sitio, considera desactivar tu bloqueador de anuncios';
            document.body.appendChild(message);
            
            setTimeout(() => {
                document.body.removeChild(message);
            }, 5000);
        }
        
        limitContentAccess() {
            // Limitar contenido progresivamente
            setTimeout(() => {
                const contentWrappers = document.querySelectorAll('article, main, .content');
                contentWrappers.forEach(wrapper => {
                    if (wrapper.innerHTML.length > 1000) {
                        wrapper.innerHTML = wrapper.innerHTML.substring(0, 1000) + 
                            '<div style="background:#f9f9f9;padding:20px;text-align:center;margin:20px 0;">' +
                            '<p>🔒 Contenido limitado por bloqueador de anuncios</p>' +
                            '<button style="padding:10px 20px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;" onclick="window.location.reload()">Recargar sin bloqueador</button>' +
                            '</div>';
                    }
                });
            }, 10000);
        }
        
        monitorNetworkRequests() {
            // Monitoreo avanzado de red para móvil
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                return originalFetch.apply(this, args).then(response => {
                    if (!response.ok && args[0].includes('ad')) {
                        window.adBlockDetected = true;
                    }
                    return response;
                }).catch(error => {
                    if (args[0].includes('ad') || args[0].includes('doubleclick')) {
                        window.adBlockDetected = true;
                    }
                    throw error;
                });
            };
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AdvancedAdDetector();
        });
    } else {
        new AdvancedAdDetector();
    }
})();

// Código adicional para simular completamente el ecosistema de anuncios móviles
(function() {
    // Simular eventos de publicidad móvil
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('adloaded', {
            detail: { type: 'banner', platform: 'mobile' }
        }));
    }, 2000);
    
    // Simular analytics de anuncios
    setInterval(() => {
        if (window.adsAreNotBlocked) {
            const adImpressions = Math.floor(Math.random() * 5) + 1;
            console.log(`📱 Anuncios móviles mostrados: ${adImpressions} impresiones`);
        }
    }, 10000);
})();