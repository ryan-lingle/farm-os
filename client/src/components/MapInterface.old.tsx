import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { MapToolbar } from './MapToolbar';
import { LocationsSidebar } from './LocationsSidebar';
import { toast } from 'sonner';

export interface Location {
  id: string;
  name: string;
  coordinates: any;
  createdAt: string;
  description?: string;
  contours?: {
    enabled: boolean;
    interval: number; // in meters (5, 10, 20, 50)
    colorScheme: 'terrain' | 'rainbow' | 'grayscale';
  };
}

const MapInterface = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [drawMode, setDrawMode] = useState<'polygon' | 'select'>('select');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'terrain'>('outdoors');
  const [terrainEnabled, setTerrainEnabled] = useState(false);

  // Note: Locations API integration would go here
  // For now, keeping the mock functions as the farmAPI on localhost:3005 
  // might not have a locations endpoint yet based on our testing
  const saveLocation = async (location: Omit<Location, 'id' | 'createdAt'>): Promise<Location> => {
    const newLocation: Location = {
      ...location,
      id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    setLocations(prev => [...prev, newLocation]);
    toast.success(`Location saved successfully!`);
    return newLocation;
  };

  const deleteLocation = async (id: string): Promise<void> => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }
    toast.success('Location deleted successfully!');
  };

  const updateLocation = async (id: string, updates: Partial<Location>): Promise<Location> => {
    const updatedLocation = locations.find(loc => loc.id === id);
    if (!updatedLocation) throw new Error('Location not found');
    
    const newLocation = { ...updatedLocation, ...updates };
    setLocations(prev => prev.map(loc => loc.id === id ? newLocation : loc));
    toast.success('Location updated successfully!');
    return newLocation;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    const getMapStyle = (style: string) => {
      switch (style) {
        case 'terrain': return 'mapbox://styles/mapbox/satellite-v9';
        default: return 'mapbox://styles/mapbox/outdoors-v12'; // Default to outdoors
      }
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(mapStyle),
      center: [-74.006, 40.7128], // NYC
      zoom: 12,
      antialias: true,
    });

    // Initialize drawing tools
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Polygon styles
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': 'hsl(210, 79%, 48%)',
            'fill-outline-color': 'hsl(210, 79%, 48%)',
            'fill-opacity': 0.1
          }
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': 'hsl(210, 79%, 48%)',
            'line-width': 2
          }
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': 'hsl(39, 77%, 56%)',
            'line-width': 2
          }
        },
        // Point styles
        {
          id: 'gl-draw-point-point-stroke-inactive',
          type: 'circle',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 8,
            'circle-opacity': 1,
            'circle-color': 'hsl(142, 76%, 36%)',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        },
        {
          id: 'gl-draw-point-stroke-active',
          type: 'circle',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 8,
            'circle-color': 'hsl(39, 77%, 56%)',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        }
      ]
    });

    map.current.addControl(draw.current, 'top-left');

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Handle drawing events
    map.current.on('draw.create', (e: any) => {
      const feature = e.features[0];
      
      saveLocation({
        name: `Location ${locations.length + 1}`,
        coordinates: feature.geometry.coordinates,
        description: `Created location`
      });
      
      // Clear the drawing after saving
      draw.current?.delete(feature.id);
    });

    map.current.on('draw.selectionchange', (e: any) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const location = locations.find(loc => 
          JSON.stringify(loc.coordinates) === JSON.stringify(feature.geometry.coordinates)
        );
        setSelectedLocation(location || null);
      } else {
        setSelectedLocation(null);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]); // Only depend on mapboxToken, not mapStyle

  // Handle map style changes
  useEffect(() => {
    if (!map.current) return;

    console.log('Changing map style to:', mapStyle);

    const getMapStyle = (style: string) => {
      switch (style) {
        case 'terrain': return 'mapbox://styles/mapbox/satellite-v9';
        default: return 'mapbox://styles/mapbox/outdoors-v12'; // Default to outdoors
      }
    };

    // Preserve current view state
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();

    console.log('Current position before style change:', { 
      center: currentCenter, 
      zoom: currentZoom 
    });

    map.current.setStyle(getMapStyle(mapStyle));

    // Restore view state after style loads
    map.current.once('style.load', () => {
      console.log('Style loaded, restoring position');
      map.current?.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        bearing: currentBearing,
        pitch: currentPitch
      });

      // Re-add terrain if enabled
      if (terrainEnabled && (mapStyle === 'outdoors' || mapStyle === 'terrain')) {
        console.log('Re-adding terrain after style change');
        if (!map.current?.getSource('mapbox-dem')) {
          map.current?.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        map.current?.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }

      // Re-add drawing controls and locations
      if (draw.current) {
        locations.forEach(location => {
          const feature = {
            type: 'Feature' as const,
            properties: { id: location.id },
            geometry: {
              type: 'Polygon',
              coordinates: location.coordinates
            }
          };
          draw.current?.add(feature);
        });
      }
    });
  }, [mapStyle]);

  // Handle terrain changes
  useEffect(() => {
    if (!map.current) return;

    const handleTerrainChange = () => {
      console.log('Handling terrain change:', { terrainEnabled, mapStyle });
      
      if (terrainEnabled) {
        try {
          // Remove existing terrain first
          if (map.current?.getTerrain()) {
            map.current?.setTerrain(null);
          }
          
          // Remove existing source if it exists
          if (map.current?.getSource('mapbox-dem')) {
            map.current?.removeSource('mapbox-dem');
          }
          
          // Add the DEM source
          map.current?.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
          
          // Wait a moment for source to load, then add terrain
          setTimeout(() => {
            if (map.current && terrainEnabled) {
              map.current.setTerrain({ 
                source: 'mapbox-dem', 
                exaggeration: 2.0 // Increased for better visibility
              });
              
              // Set pitch to better show 3D effect
              map.current.setPitch(45);
              
              console.log('3D terrain enabled successfully');
              toast.success('3D terrain enabled');
            }
          }, 500);
          
        } catch (error) {
          console.error('Error enabling terrain:', error);
          toast.error('Failed to enable 3D terrain');
        }
      } else {
        try {
          // Disable terrain
          if (map.current?.getTerrain()) {
            map.current?.setTerrain(null);
          }
          
          // Reset pitch to flat view
          map.current?.setPitch(0);
          
          // Remove DEM source
          if (map.current?.getSource('mapbox-dem')) {
            map.current?.removeSource('mapbox-dem');
          }
          
          console.log('3D terrain disabled successfully');
          toast.success('3D terrain disabled');
        } catch (error) {
          console.error('Error disabling terrain:', error);
        }
      }
    };

    // Wait for style to be fully loaded before applying terrain
    if (map.current.isStyleLoaded()) {
      // Add a small delay to ensure everything is ready
      setTimeout(handleTerrainChange, 100);
    } else {
      map.current.once('style.load', () => {
        setTimeout(handleTerrainChange, 100);
      });
    }
  }, [terrainEnabled, mapStyle]);

  // Handle polygon contour generation
  const generatePolygonContours = (location: Location) => {
    if (!map.current || !location.contours?.enabled) return;

    const sourceId = 'mapbox-terrain-contours';
    const layerId = `contour-${location.id}`;
    const labelLayerId = `contour-labels-${location.id}`;

    console.log(`Generating contours for polygon ${location.id}`, {
      interval: location.contours.interval,
      colorScheme: location.contours.colorScheme,
      coordinates: location.coordinates
    });

    // Remove existing layers for this polygon
    try {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getLayer(labelLayerId)) {
        map.current.removeLayer(labelLayerId);
      }
    } catch (error) {
      console.warn('Error removing existing layers:', error);
    }

    try {
      // Add terrain contour source if not already present
      if (!map.current.getSource(sourceId)) {
        console.log('Adding terrain contour source');
        map.current.addSource(sourceId, {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2'
        });
      }

      // Color schemes
      const getColorExpression = (scheme: string): any => {
        switch (scheme) {
          case 'terrain':
            return [
              'interpolate',
              ['linear'],
              ['get', 'ele'],
              0, '#8B4513',    // Brown (sea level)
              500, '#228B22',  // Green (hills)
              1000, '#90EE90', // Light green (mountains)
              2000, '#A9A9A9', // Gray (high mountains)
              3000, '#FFFFFF'  // White (peaks)
            ] as any;
          case 'rainbow':
            return [
              'interpolate',
              ['linear'],
              ['get', 'ele'],
              0, '#0000FF',    // Blue (low)
              500, '#00FF00',  // Green
              1000, '#FFFF00', // Yellow
              1500, '#FF8C00', // Orange
              2000, '#FF0000'  // Red (high)
            ] as any;
          case 'grayscale':
            return [
              'interpolate',
              ['linear'],
              ['get', 'ele'],
              0, '#000000',    // Black (low)
              2000, '#FFFFFF' // White (high)
            ] as any;
          default:
            return '#877b59';
        }
      };

      // Format polygon coordinates properly for the within filter
      // Ensure the polygon is properly closed and formatted
      const polygonCoords = location.coordinates[0];
      
      // Ensure polygon is closed (first and last points are the same)
      const closedCoords = [...polygonCoords];
      if (closedCoords[0] !== closedCoords[closedCoords.length - 1]) {
        closedCoords.push(closedCoords[0]);
      }

      const polygonGeometry = {
        type: 'Polygon' as const,
        coordinates: [closedCoords]
      };

      // Create a proper GeoJSON Feature for the 'within' filter
      const polygonFeature = {
        type: 'Feature' as const,
        geometry: polygonGeometry,
        properties: {}
      };

      console.log('Polygon feature for filter:', polygonFeature);

      // Wait for source to load, then add contour layers
      setTimeout(() => {
        if (map.current && location.contours?.enabled) {
          try {
            // Add contour lines layer with polygon clipping
            map.current.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              'source-layer': 'contour',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': getColorExpression(location.contours.colorScheme),
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 1,
                  15, location.contours.interval <= 10 ? 1.5 : 2
                ],
                'line-opacity': 0.8
              },
              filter: [
                'all',
                ['>', ['get', 'ele'], 0],
                ['==', ['%', ['get', 'ele'], location.contours.interval], 0],
                ['within', polygonFeature]
              ]
            });

            console.log(`Added contour layer ${layerId}`);

            // Add labels for contours with larger intervals
            const labelInterval = location.contours.interval * (location.contours.interval <= 10 ? 10 : 5);
            map.current.addLayer({
              id: labelLayerId,
              type: 'symbol',
              source: sourceId,
              'source-layer': 'contour',
              layout: {
                'text-field': ['concat', ['get', 'ele'], 'm'],
                'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                'text-size': 10,
                'symbol-placement': 'line',
                'text-rotation-alignment': 'map',
                'text-offset': [0, -0.5]
              },
              paint: {
                'text-color': location.contours.colorScheme === 'grayscale' ? '#FFFFFF' : '#2D3748',
                'text-halo-color': location.contours.colorScheme === 'grayscale' ? '#000000' : 'rgba(255, 255, 255, 0.9)',
                'text-halo-width': 1.5
              },
              filter: [
                'all',
                ['>', ['get', 'ele'], 0],
                ['==', ['%', ['get', 'ele'], labelInterval], 0],
                ['within', polygonFeature]
              ]
            });

            console.log(`Added contour label layer ${labelLayerId}`);
            console.log(`Contour lines generated for polygon ${location.id} with ${location.contours.interval}m interval`);
            toast.success(`Contours generated with ${location.contours.interval}m intervals`);
            
          } catch (layerError) {
            console.error('Error adding contour layers:', layerError);
            toast.error('Failed to add contour layers');
          }
        }
      }, 100);

    } catch (error) {
      console.error('Error generating polygon contours:', error);
      toast.error('Failed to generate contours');
    }
  };

  // Remove polygon contours
  const removePolygonContours = (locationId: string) => {
    if (!map.current) return;

    const layerId = `contour-${locationId}`;
    const labelLayerId = `contour-labels-${locationId}`;

    console.log(`Removing contours for polygon ${locationId}`);

    try {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
        console.log(`Removed contour layer ${layerId}`);
      }
      if (map.current.getLayer(labelLayerId)) {
        map.current.removeLayer(labelLayerId);
        console.log(`Removed contour label layer ${labelLayerId}`);
      }
    } catch (error) {
      console.error('Error removing polygon contours:', error);
    }
  };


  // Handle polygon contour updates
  useEffect(() => {
    if (!map.current) return;

    locations.forEach(location => {
      if (location.contours?.enabled) {
          // Wait for style to be loaded before generating contours
          if (map.current.isStyleLoaded()) {
            setTimeout(() => generatePolygonContours(location), 200);
          } else {
            map.current.once('style.load', () => {
              setTimeout(() => generatePolygonContours(location), 200);
            });
          }
      } else {
        removePolygonContours(location.id);
      }
    });
  }, [locations, mapStyle]);

  // Handle draw mode changes
  useEffect(() => {
    if (!draw.current) return;

    switch (drawMode) {
      case 'polygon':
        draw.current.changeMode('draw_polygon');
        break;
      case 'select':
        draw.current.changeMode('simple_select');
        break;
    }
  }, [drawMode]);

  // Load saved locations on map
  useEffect(() => {
    if (!draw.current) return;

    // Clear existing features
    draw.current.deleteAll();

    // Add saved locations to map
    locations.forEach(location => {
      const feature = {
        type: 'Feature' as const,
        properties: { id: location.id },
        geometry: {
          type: 'Polygon',
          coordinates: location.coordinates
        }
      };
      draw.current?.add(feature);
    });
  }, [locations]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    const filtered = locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // For demo, just show toast with results count
    toast.success(`Found ${filtered.length} location(s) matching "${searchTerm}"`);
  };

  const zoomToLocation = (location: Location) => {
    if (!map.current) return;

    if (location.coordinates) {
      // For polygon, fit bounds
      const coordinates = location.coordinates[0];
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
    
    setSelectedLocation(location);
  };

  const handleAddressSelect = (address: any) => {
    if (!map.current) return;

    // Fly to the selected address
    map.current.flyTo({
      center: address.center,
      zoom: 16,
      duration: 1000
    });
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <LocationsSidebar
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationSelect={zoomToLocation}
        onLocationDelete={deleteLocation}
        onLocationUpdate={updateLocation}
        onSearch={handleSearch}
        onAddressSelect={handleAddressSelect}
        mapboxToken={mapboxToken}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Map Toolbar */}
        <MapToolbar
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
          terrainEnabled={terrainEnabled}
          onTerrainToggle={() => setTerrainEnabled(!terrainEnabled)}
        />

        {/* Map */}
        <div ref={mapContainer} className="absolute inset-0" />
      </div>
    </div>
  );
};

export default MapInterface;