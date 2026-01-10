import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { MapToolbar } from './MapToolbar';
import { LocationsSidebar } from './LocationsSidebar';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, Location } from '@/hooks/useLocations';

const MapInterface = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [drawMode, setDrawMode] = useState<'polygon' | 'select'>('select');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'terrain'>('outdoors');
  const [terrainEnabled, setTerrainEnabled] = useState(false);

  // API hooks
  const { locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    const getMapStyle = (style: string) => {
      switch (style) {
        case 'terrain': return 'mapbox://styles/mapbox/satellite-v9';
        default: return 'mapbox://styles/mapbox/outdoors-v12';
      }
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(mapStyle),
      center: [-84.123, 40.567], // Default center
      zoom: 12,
      antialias: true,
    });

    // Initialize drawing tools
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': 'hsl(210, 79%, 48%)',
            'fill-opacity': 0.1
          }
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': 'hsl(142, 69%, 48%)',
            'fill-opacity': 0.1
          }
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'line-color': 'hsl(210, 79%, 48%)',
            'line-width': 2
          }
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': 'hsl(142, 69%, 48%)',
            'line-width': 3
          }
        },
        // Vertices
        {
          id: 'gl-draw-polygon-and-line-vertex-inactive',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'active', 'false']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'hsl(210, 79%, 48%)'
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'active', 'true']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-width': 2,
            'circle-stroke-color': 'hsl(142, 69%, 48%)'
          }
        },
        // Midpoints
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#fff',
            'circle-stroke-width': 1,
            'circle-stroke-color': 'hsl(142, 69%, 48%)'
          }
        }
      ]
    });

    map.current.addControl(draw.current);

    // Handle draw create
    map.current.on('draw.create', async (e: any) => {
      const feature = e.features[0];
      const locationName = prompt('Enter a name for this location:');
      
      if (locationName) {
        const newLocation = {
          name: locationName,
          description: '',
          geometry: {
            type: 'Polygon' as const,
            coordinates: feature.geometry.coordinates
          }
        };

        await createLocation.mutateAsync(newLocation);
        draw.current?.delete(feature.id);
      } else {
        draw.current?.delete(feature.id);
      }
    });

    // Handle draw update
    map.current.on('draw.update', async (e: any) => {
      const feature = e.features[0];
      const locationId = feature.properties.id;
      
      if (locationId) {
        await updateLocation.mutateAsync({
          id: locationId,
          updates: {
            geometry: {
              type: 'Polygon',
              coordinates: feature.geometry.coordinates
            }
          }
        });
      }
    });

    // Handle selection
    map.current.on('draw.selectionchange', (e: any) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const location = locations.find(loc => loc.id === feature.properties.id);
        if (location) {
          setSelectedLocation(location);
        }
      } else {
        setSelectedLocation(null);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current) return;

    const getMapStyle = (style: string) => {
      switch (style) {
        case 'terrain': return 'mapbox://styles/mapbox/satellite-v9';
        default: return 'mapbox://styles/mapbox/outdoors-v12';
      }
    };

    console.log('Changing map style to:', mapStyle);
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    console.log('Current position before style change:', { center: currentCenter, zoom: currentZoom });

    map.current.setStyle(getMapStyle(mapStyle));

    map.current.once('style.load', () => {
      console.log('Style loaded, restoring position');
      if (map.current) {
        map.current.setCenter(currentCenter);
        map.current.setZoom(currentZoom);
      }
    });
  }, [mapStyle]);

  // Handle terrain toggle
  useEffect(() => {
    if (!map.current) return;

    const handleTerrainChange = () => {
      if (terrainEnabled) {
        if (!map.current?.getSource('mapbox-dem')) {
          map.current?.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        map.current?.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
        console.log('3D terrain enabled');
      } else {
        map.current?.setTerrain(null);
        console.log('3D terrain disabled');
      }
    };

    if (map.current.isStyleLoaded()) {
      handleTerrainChange();
    } else {
      map.current.once('style.load', handleTerrainChange);
    }
  }, [terrainEnabled, mapStyle]);

  // Load saved locations on map
  useEffect(() => {
    if (!draw.current || isLoading) return;

    // Clear existing features
    draw.current.deleteAll();

    // Add saved locations to map
    locations.forEach(location => {
      const feature = {
        type: 'Feature' as const,
        properties: { id: location.id },
        geometry: {
          type: 'Polygon' as const,
          coordinates: location.geometry.coordinates
        }
      };
      draw.current?.add(feature);
    });
  }, [locations, isLoading]);

  // Handle location selection
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (map.current && location.geometry?.coordinates?.[0]?.[0]) {
      const coords = location.geometry.coordinates[0];
      const bounds = coords.reduce((bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      }, new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]));
      
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  // Handle location delete
  const handleLocationDelete = async (id: string) => {
    await deleteLocation.mutateAsync(id);
    if (selectedLocation?.id === id) {
      setSelectedLocation(null);
    }
  };

  // Handle location update
  const handleLocationUpdate = async (id: string, updates: Partial<Location>) => {
    await updateLocation.mutateAsync({ id, updates });
  };

  // Handle address search
  const handleAddressSelect = (address: any) => {
    if (!map.current) return;
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
        onLocationSelect={handleLocationSelect}
        onLocationDelete={handleLocationDelete}
        onLocationUpdate={handleLocationUpdate}
        mapboxToken={mapboxToken}
        onAddressSelect={handleAddressSelect}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapToolbar
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
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

