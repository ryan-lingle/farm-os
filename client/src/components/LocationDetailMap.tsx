import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mlcontour from 'maplibre-contour';
import type { Feature, FeatureCollection, Polygon, MultiPolygon, Point, LineString } from 'geojson';
import { Location } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Layers, Mountain, Maximize2, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChatCommands } from '@/hooks/useChatBridge';
import type { ChatCommand } from '@/lib/chat-bridge';

interface LocationDetailMapProps {
  location: Location;
  className?: string;
}

export const LocationDetailMap: React.FC<LocationDetailMapProps> = ({ location, className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const demSourceRef = useRef<any>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  const [showTopography, setShowTopography] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayFeatures, setOverlayFeatures] = useState<Feature[]>([]);
  const [overlayLabel, setOverlayLabel] = useState<string | null>(null);

  // Parse geometry from location
  const getGeometry = () => {
    if (!location.geometry) return null;

    // Handle both string and object geometry
    const geom = typeof location.geometry === 'string'
      ? JSON.parse(location.geometry)
      : location.geometry;

    return geom;
  };

  // Calculate bounds from geometry
  const getBoundsFromGeometry = (geometry: any): maplibregl.LngLatBoundsLike | null => {
    if (!geometry) return null;

    const bounds = new maplibregl.LngLatBounds();

    if (geometry.type === 'Polygon') {
      geometry.coordinates[0].forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
    } else if (geometry.type === 'Point') {
      bounds.extend(geometry.coordinates as [number, number]);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((polygon: [number, number][][]) => {
        polygon[0].forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });
    }

    return bounds.isEmpty() ? null : bounds;
  };

  // Get center point for the location
  const getCenterFromGeometry = (geometry: any): [number, number] | null => {
    if (!geometry) return null;

    if (geometry.type === 'Point') {
      return geometry.coordinates as [number, number];
    }

    const bounds = getBoundsFromGeometry(geometry);
    if (bounds) {
      const center = (bounds as maplibregl.LngLatBounds).getCenter();
      return [center.lng, center.lat];
    }

    return null;
  };

  // Handle chat commands (draw features on map)
  const handleChatCommand = useCallback((command: ChatCommand) => {
    if (command.type === 'draw') {
      setOverlayFeatures(command.features);
      setOverlayLabel(command.label || 'AI Suggestions');
    } else if (command.type === 'clear-overlay') {
      setOverlayFeatures([]);
      setOverlayLabel(null);
    }
  }, []);

  // Subscribe to chat commands
  useChatCommands(handleChatCommand);

  // Clear overlay handler
  const clearOverlay = useCallback(() => {
    setOverlayFeatures([]);
    setOverlayLabel(null);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    const geometry = getGeometry();
    const center = getCenterFromGeometry(geometry) || [-98.5795, 39.8283]; // Default to US center

    // Create DEM source for contour generation using AWS Terrain Tiles
    demSourceRef.current = new mlcontour.DemSource({
      url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      encoding: 'terrarium',
      maxzoom: 14,
      worker: true,
    });

    // Register the contour protocol with MapLibre
    demSourceRef.current.setupMaplibre(maplibregl);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'mapbox-satellite': {
            type: 'raster',
            tiles: [
              `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${mapboxToken}`
            ],
            tileSize: 512,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.maxar.com/">Maxar</a>'
          },
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'mapbox-satellite',
            minzoom: 0,
            maxzoom: 22
          }
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: center,
      zoom: 14,
      pitch: 0,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.current.on('load', () => {
      if (!map.current || !demSourceRef.current) return;

      // Add contour source using maplibre-contour
      map.current.addSource('contour-source', {
        type: 'vector',
        tiles: [
          demSourceRef.current.contourProtocolUrl({
            multiplier: 1,
            overzoom: 1,
            thresholds: {
              // Every 2 meters for fine detail, every 10 meters for index lines
              11: [10, 50],
              12: [5, 25],
              13: [2, 10],
              14: [2, 10],
              15: [1, 5],
            },
            elevationKey: 'ele',
            levelKey: 'level',
            contourLayer: 'contours',
          }),
        ],
        maxzoom: 16,
      });

      // Add location geometry source
      if (geometry) {
        map.current.addSource('location-geometry', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: location.name },
            geometry: geometry
          }
        });

        // Add fill layer for polygons
        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
          map.current.addLayer({
            id: 'location-fill',
            type: 'fill',
            source: 'location-geometry',
            paint: {
              'fill-color': '#00ff88',
              'fill-opacity': 0.15
            }
          });

          map.current.addLayer({
            id: 'location-outline',
            type: 'line',
            source: 'location-geometry',
            paint: {
              'line-color': '#00ff88',
              'line-width': 3
            }
          });
        } else if (geometry.type === 'Point') {
          // Add marker for point locations
          new maplibregl.Marker({ color: '#3b82f6' })
            .setLngLat(geometry.coordinates)
            .addTo(map.current);
        }

        // Fit to bounds
        const bounds = getBoundsFromGeometry(geometry);
        if (bounds) {
          map.current.fitBounds(bounds, {
            padding: 60,
            maxZoom: 16,
            duration: 0
          });
        }
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, location.id]);

  // Handle topography toggle (contour lines)
  useEffect(() => {
    if (!map.current) return;

    const applyTopography = () => {
      if (!map.current) return;

      if (showTopography) {
        // Add contour lines - minor (every 2m or 5m depending on zoom)
        if (!map.current.getLayer('contour-lines')) {
          map.current.addLayer({
            id: 'contour-lines',
            type: 'line',
            source: 'contour-source',
            'source-layer': 'contours',
            filter: ['==', ['get', 'level'], 0],
            paint: {
              'line-color': '#ff6600',
              'line-width': 0.75,
              'line-opacity': 0.6
            }
          });
        }

        // Add contour lines - major (index lines every 10m or 25m)
        if (!map.current.getLayer('contour-lines-major')) {
          map.current.addLayer({
            id: 'contour-lines-major',
            type: 'line',
            source: 'contour-source',
            'source-layer': 'contours',
            filter: ['==', ['get', 'level'], 1],
            paint: {
              'line-color': '#ff6600',
              'line-width': 2,
              'line-opacity': 0.85
            }
          });
        }

        // Add contour labels on index contours
        if (!map.current.getLayer('contour-labels')) {
          map.current.addLayer({
            id: 'contour-labels',
            type: 'symbol',
            source: 'contour-source',
            'source-layer': 'contours',
            filter: ['==', ['get', 'level'], 1],
            layout: {
              'symbol-placement': 'line',
              'text-field': ['concat', ['to-string', ['get', 'ele']], 'm'],
              'text-font': ['Open Sans Bold'],
              'text-size': 10,
              'text-max-angle': 25,
            },
            paint: {
              'text-color': '#ff6600',
              'text-halo-color': '#000',
              'text-halo-width': 1.5
            }
          });
        }
      } else {
        // Remove contour layers
        if (map.current.getLayer('contour-labels')) {
          map.current.removeLayer('contour-labels');
        }
        if (map.current.getLayer('contour-lines-major')) {
          map.current.removeLayer('contour-lines-major');
        }
        if (map.current.getLayer('contour-lines')) {
          map.current.removeLayer('contour-lines');
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      applyTopography();
    } else {
      map.current.once('load', applyTopography);
    }
  }, [showTopography]);

  // Handle overlay features (AI suggestions)
  useEffect(() => {
    if (!map.current) return;

    const applyOverlay = () => {
      if (!map.current) return;

      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: overlayFeatures,
      };

      // Add or update overlay source
      const existingSource = map.current.getSource('ai-overlay') as maplibregl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(featureCollection);
      } else if (overlayFeatures.length > 0) {
        map.current.addSource('ai-overlay', {
          type: 'geojson',
          data: featureCollection,
        });

        // Add fill layer for polygons
        map.current.addLayer({
          id: 'ai-overlay-fill',
          type: 'fill',
          source: 'ai-overlay',
          filter: ['any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
          ],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.25,
          },
        });

        // Add outline layer for polygons
        map.current.addLayer({
          id: 'ai-overlay-outline',
          type: 'line',
          source: 'ai-overlay',
          filter: ['any',
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
            ['==', ['geometry-type'], 'LineString'],
          ],
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 3,
            'line-dasharray': [4, 2],
          },
        });

        // Add circle layer for points
        map.current.addLayer({
          id: 'ai-overlay-points',
          type: 'circle',
          source: 'ai-overlay',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': '#3b82f6',
            'circle-radius': 8,
            'circle-stroke-color': '#1d4ed8',
            'circle-stroke-width': 2,
          },
        });
      }
    };

    if (map.current.isStyleLoaded()) {
      applyOverlay();
    } else {
      map.current.once('load', applyOverlay);
    }
  }, [overlayFeatures]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!mapContainer.current) return;

    if (!isFullscreen) {
      if (mapContainer.current.requestFullscreen) {
        mapContainer.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resize map after fullscreen change
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!mapboxToken) {
    return (
      <div className={cn("h-[400px] bg-muted rounded-lg flex items-center justify-center", className)}>
        <p className="text-muted-foreground">Mapbox token not configured</p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden", className)}>
      <div ref={mapContainer} className="w-full h-[400px]" />

      {/* Map Controls */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTopography(!showTopography)}
                className={cn(
                  "bg-white/90 backdrop-blur border shadow-md hover:bg-white",
                  showTopography && "bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                <Mountain className="h-4 w-4 mr-1" />
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showTopography ? 'Hide Contours' : 'Show Contours'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleFullscreen}
                className="bg-white/90 backdrop-blur border shadow-md hover:bg-white"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Clear AI Suggestions button */}
        {overlayFeatures.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearOverlay}
                  className="bg-blue-500/90 text-white backdrop-blur border border-blue-600 shadow-md hover:bg-blue-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear AI suggestions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Topography Legend */}
      {showTopography && (
        <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur rounded-md px-3 py-2 text-xs shadow-md text-white">
          <div className="font-medium mb-1">Elevation Contours</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#ff6600] opacity-60"></div>
              <span className="text-white/80">2m intervals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#ff6600]"></div>
              <span className="text-white/80">10m index lines</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Legend */}
      {overlayFeatures.length > 0 && (
        <div className="absolute bottom-3 right-3 z-10 bg-blue-900/80 backdrop-blur rounded-md px-3 py-2 text-xs shadow-md text-white">
          <div className="font-medium mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {overlayLabel || 'AI Suggestions'}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-500/50 border border-dashed border-blue-600"></div>
              <span className="text-white/80">{overlayFeatures.length} feature{overlayFeatures.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDetailMap;
