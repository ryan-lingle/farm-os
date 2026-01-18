import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { MapToolbar } from './MapToolbar';
import { LocationsSidebar } from './LocationsSidebar';
import { LocationAssetsPopup } from './LocationAssetsPopup';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, Location } from '@/hooks/useLocations';
import { useAssetsAtLocation } from '@/hooks/useAssets';
import { Asset } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ParentSelector } from './ParentSelector';
import { Badge } from '@/components/ui/badge';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Popup content wrapper that provides QueryClient context
const PopupContent: React.FC<{ 
  locationId: string; 
  locationName: string;
  locations: Location[];
  onAssetClick: (asset: Asset) => void;
}> = ({ locationId, locationName, locations, onAssetClick }) => {
  const { assets, isLoading } = useAssetsAtLocation(locationId, locations);
  
  return (
    <LocationAssetsPopup
      locationId={locationId}
      locationName={locationName}
      assets={assets}
      isLoading={isLoading}
      onAssetClick={onAssetClick}
    />
  );
};

const MapInterface = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const popupRoot = useRef<ReactDOM.Root | null>(null);
  const queryClient = useRef(new QueryClient());
  const drawModeRef = useRef<'polygon' | 'select'>('select'); // Ref for use in event handlers
  const isInitialStyleRef = useRef(true); // Track initial style load
  const hasInitializedViewRef = useRef(false); // Track if we've centered on root location
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const navigate = useNavigate();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<'polygon' | 'select'>('select');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'terrain'>('terrain');
  
  // Location creation dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<any>(null);
  const [pendingFeatureId, setPendingFeatureId] = useState<string | null>(null);
  const [preselectedParentId, setPreselectedParentId] = useState<number | null>(null);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    parent_id: null as number | null,
  });

  // API hooks
  const { locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  // Handle asset click from popup
  const handleAssetClick = (asset: Asset) => {
    const assetType = asset.attributes.asset_type;
    // Close popup
    if (popup.current) {
      popup.current.remove();
    }
    // Navigate to asset detail page
    navigate(`/records/assets/${assetType}/${asset.id}`);
  };

  // Initialize map
  useEffect(() => {
    console.log('[MapInterface] Map init effect running');
    console.log('[MapInterface] mapContainer.current:', !!mapContainer.current);
    console.log('[MapInterface] mapboxToken:', mapboxToken ? 'present' : 'missing');
    console.log('[MapInterface] map.current:', !!map.current);

    if (!mapContainer.current || !mapboxToken || map.current) {
      console.log('[MapInterface] Map init skipped - conditions not met');
      return;
    }
    console.log('[MapInterface] Proceeding with map initialization');

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
    console.log('[MapInterface] Initializing MapboxDraw control');
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
    console.log('[MapInterface] MapboxDraw control added to map');

    // Debug: log map clicks
    map.current.on('click', (e: any) => {
      console.log('[MapInterface] Map clicked at:', e.lngLat);
    });

    // Handle draw mode changes from MapboxDraw
    // When a polygon is completed, MapboxDraw auto-switches to simple_select
    // We need to re-apply polygon mode if user still wants to draw
    map.current.on('draw.modechange', (e: any) => {
      console.log('[MapInterface] draw.modechange event:', e.mode);
      // If MapboxDraw switched to simple_select but user wants polygon mode, re-apply after short delay
      if (e.mode === 'simple_select' && drawModeRef.current === 'polygon') {
        console.log('[MapInterface] Auto-switching back to draw_polygon mode');
        setTimeout(() => {
          if (draw.current && drawModeRef.current === 'polygon') {
            draw.current.changeMode('draw_polygon');
          }
        }, 100);
      }
    });

    // Handle draw create - open dialog instead of prompt
    console.log('[MapInterface] Setting up draw event handlers');
    map.current.on('draw.create', async (e: any) => {
      console.log('[MapInterface] draw.create event fired!', e);
      const feature = e.features[0];
      setPendingGeometry({
        type: 'Polygon' as const,
        coordinates: feature.geometry.coordinates
      });
      setPendingFeatureId(feature.id);
      setCreateFormData({
        name: '',
        description: '',
        parent_id: preselectedParentId,
      });
      setIsCreateDialogOpen(true);
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

    // Handle selection - switch to direct_select for vertex editing
    map.current.on('draw.selectionchange', (e: any) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const location = locations.find(loc => loc.id === feature.properties.id);
        if (location) {
          setSelectedLocation(location);
        }
        // When in select mode, auto-switch to direct_select to enable vertex editing
        if (drawModeRef.current === 'select' && draw.current) {
          const currentMode = draw.current.getMode();
          // Only switch if we're in simple_select (not already in direct_select or draw modes)
          if (currentMode === 'simple_select') {
            console.log('[MapInterface] Switching to direct_select for vertex editing');
            draw.current.changeMode('direct_select', { featureId: feature.id });
          }
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

  // Keep drawModeRef updated for use in event handlers
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current) return;

    // Skip the initial mount - map was already created with the correct style
    if (isInitialStyleRef.current) {
      isInitialStyleRef.current = false;
      console.log('[MapInterface] Skipping initial style effect');
      return;
    }

    const getMapStyle = (style: string) => {
      switch (style) {
        case 'terrain': return 'mapbox://styles/mapbox/satellite-v9';
        default: return 'mapbox://styles/mapbox/outdoors-v12';
      }
    };

    console.log('[MapInterface] Changing map style to:', mapStyle);
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    map.current.setStyle(getMapStyle(mapStyle));

    map.current.once('style.load', () => {
      console.log('[MapInterface] Style loaded, restoring position and draw mode');
      if (map.current) {
        map.current.setCenter(currentCenter);
        map.current.setZoom(currentZoom);
      }
      // Re-apply draw mode after style change using ref for current value
      if (draw.current && drawModeRef.current === 'polygon') {
        console.log('[MapInterface] Re-applying draw_polygon mode after style change');
        draw.current.changeMode('draw_polygon');
      }
    });
  }, [mapStyle]);

  // Handle draw mode changes
  useEffect(() => {
    console.log('[MapInterface] Draw mode effect triggered, drawMode:', drawMode);
    console.log('[MapInterface] draw.current exists:', !!draw.current);

    if (!draw.current) {
      console.log('[MapInterface] draw.current is null, skipping mode change');
      return;
    }

    console.log('[MapInterface] Changing draw mode to:', drawMode);
    switch (drawMode) {
      case 'polygon':
        draw.current.changeMode('draw_polygon');
        console.log('[MapInterface] Changed to draw_polygon mode');
        break;
      case 'select':
        draw.current.changeMode('simple_select');
        console.log('[MapInterface] Changed to simple_select mode');
        break;
    }
  }, [drawMode]);

  // Load saved locations on map and center on root location
  useEffect(() => {
    if (!draw.current || !map.current || isLoading) return;

    // Clear existing features
    draw.current.deleteAll();

    // Add saved locations to map (skip those without geometry)
    locations.forEach(location => {
      if (!location.geometry) return;
      const feature = {
        type: 'Feature' as const,
        properties: { id: location.id },
        geometry: location.geometry
      };
      draw.current?.add(feature);
    });

    // Find and center on root location (only on initial load)
    if (!hasInitializedViewRef.current && locations.length > 0) {
      const rootLocation = locations.find(loc => loc.is_root_location);
      if (rootLocation?.geometry && rootLocation.geometry.type === 'Polygon') {
        const coords = rootLocation.geometry.coordinates[0] as number[][];
        if (coords && coords.length > 0) {
          const bounds = coords.reduce((bounds, coord) => {
            return bounds.extend(coord as [number, number]);
          }, new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]));

          map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
          hasInitializedViewRef.current = true;
        }
      }
    }
  }, [locations, isLoading]);

  // Add location markers with clustering (Airbnb-style)
  useEffect(() => {
    if (!map.current || isLoading || locations.length === 0) return;

    const currentMap = map.current;
    const sourceId = 'location-markers';
    const clusterLayerId = 'location-clusters';
    const clusterCountLayerId = 'location-cluster-count';
    const unclusteredLayerId = 'location-unclustered';
    const unclusteredCountLayerId = 'location-unclustered-count';

    // Function to show popup with assets
    const showLocationPopup = (location: Location, coordinates: [number, number]) => {
      // Create popup if it doesn't exist
      if (!popup.current) {
        popup.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '400px',
          className: 'location-assets-popup',
          offset: 25,
        });
      }

      // Create container for React content
      const popupNode = document.createElement('div');

      // Clean up previous root if it exists
      if (popupRoot.current) {
        popupRoot.current.unmount();
      }

      // Create new root and render content
      popupRoot.current = ReactDOM.createRoot(popupNode);
      popupRoot.current.render(
        <QueryClientProvider client={queryClient.current}>
          <PopupContent
            locationId={location.id}
            locationName={location.name}
            locations={locations}
            onAssetClick={handleAssetClick}
          />
        </QueryClientProvider>
      );

      // Set popup content and position
      popup.current
        .setLngLat(coordinates)
        .setDOMContent(popupNode)
        .addTo(currentMap);
    };

    // Function to add clustering layers - called when style is loaded
    const addClusteringLayers = () => {
      // Safety check - ensure map style is still loaded
      if (!currentMap.getStyle()) return;

      // Remove existing source and layers if they exist
      if (currentMap.getLayer(unclusteredCountLayerId)) currentMap.removeLayer(unclusteredCountLayerId);
      if (currentMap.getLayer(unclusteredLayerId)) currentMap.removeLayer(unclusteredLayerId);
      if (currentMap.getLayer(clusterCountLayerId)) currentMap.removeLayer(clusterCountLayerId);
      if (currentMap.getLayer(clusterLayerId)) currentMap.removeLayer(clusterLayerId);
      if (currentMap.getSource(sourceId)) currentMap.removeSource(sourceId);

      // Calculate center point for each location and create GeoJSON features
    const features: GeoJSON.Feature[] = locations
      .filter(location => location.geometry)
      .map(location => {
        let center: [number, number];

        if (location.geometry!.type === 'Point') {
          const coords = location.geometry!.coordinates as number[];
          center = [coords[0], coords[1]];
        } else if (location.geometry!.type === 'Polygon') {
          const coords = location.geometry!.coordinates[0] as number[][];
          // Calculate centroid - exclude duplicate closing vertex if present
          const uniqueCoords = coords.slice(0, -1); // Remove last point (closing vertex)
          const summed = uniqueCoords.reduce((acc, coord) => {
            acc[0] += coord[0];
            acc[1] += coord[1];
            return acc;
          }, [0, 0]);
          center = [summed[0] / uniqueCoords.length, summed[1] / uniqueCoords.length];
        } else {
          return null;
        }

        return {
          type: 'Feature' as const,
          properties: {
            id: location.id,
            name: location.name,
            assetCount: location.total_asset_count || 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: center,
          },
        };
      })
      .filter((f): f is GeoJSON.Feature => f !== null);

    // Add GeoJSON source with clustering
    currentMap.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
      cluster: true,
      clusterMaxZoom: 14, // Stop clustering at this zoom level
      clusterRadius: 50, // Cluster radius in pixels
      clusterProperties: {
        // Sum asset counts for clustered points
        totalAssets: ['+', ['get', 'assetCount']],
      },
    });

    // Clustered circles layer
    currentMap.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        // Size based on point count
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // 20px for < 10 points
          10, 25, // 25px for >= 10 points
          30, 30, // 30px for >= 30 points
        ],
        'circle-color': 'hsl(210, 79%, 48%)',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
      },
    });

    // Cluster count label layer
    currentMap.addLayer({
      id: clusterCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'totalAssets'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Unclustered point circles layer
    currentMap.addLayer({
      id: unclusteredLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 18,
        'circle-color': 'hsl(210, 79%, 48%)',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Unclustered point count label layer
    currentMap.addLayer({
      id: unclusteredCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'assetCount'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

      // Click handler for clusters - zoom in
      const handleClusterClick = (e: mapboxgl.MapMouseEvent) => {
        const features = currentMap.queryRenderedFeatures(e.point, {
          layers: [clusterLayerId],
        });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          currentMap.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom ?? 14,
          });
        });
      };

      // Click handler for unclustered points - show popup
      const handleUnclusteredClick = (e: mapboxgl.MapMouseEvent) => {
        const features = currentMap.queryRenderedFeatures(e.point, {
          layers: [unclusteredLayerId],
        });
        if (!features.length) return;

        const feature = features[0];
        const locationId = feature.properties?.id;
        const location = locations.find(l => l.id === locationId);

        if (location) {
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          showLocationPopup(location, coords);
        }
      };

      // Cursor changes on hover
      const handleMouseEnter = () => {
        currentMap.getCanvas().style.cursor = 'pointer';
      };
      const handleMouseLeave = () => {
        currentMap.getCanvas().style.cursor = '';
      };

      currentMap.on('click', clusterLayerId, handleClusterClick);
      currentMap.on('click', unclusteredLayerId, handleUnclusteredClick);
      currentMap.on('mouseenter', clusterLayerId, handleMouseEnter);
      currentMap.on('mouseleave', clusterLayerId, handleMouseLeave);
      currentMap.on('mouseenter', unclusteredLayerId, handleMouseEnter);
      currentMap.on('mouseleave', unclusteredLayerId, handleMouseLeave);
    }; // End of addClusteringLayers function

    // Wait for style to be loaded before adding sources/layers
    if (currentMap.isStyleLoaded()) {
      addClusteringLayers();
    } else {
      currentMap.once('load', addClusteringLayers);
    }

    // Cleanup
    return () => {
      currentMap.off('load', addClusteringLayers);
      currentMap.off('click', clusterLayerId);
      currentMap.off('click', unclusteredLayerId);
      currentMap.off('mouseenter', clusterLayerId);
      currentMap.off('mouseleave', clusterLayerId);
      currentMap.off('mouseenter', unclusteredLayerId);
      currentMap.off('mouseleave', unclusteredLayerId);

      // Only try to remove layers/sources if the map style is still valid
      try {
        if (currentMap.getStyle()) {
          if (currentMap.getLayer(unclusteredCountLayerId)) currentMap.removeLayer(unclusteredCountLayerId);
          if (currentMap.getLayer(unclusteredLayerId)) currentMap.removeLayer(unclusteredLayerId);
          if (currentMap.getLayer(clusterCountLayerId)) currentMap.removeLayer(clusterCountLayerId);
          if (currentMap.getLayer(clusterLayerId)) currentMap.removeLayer(clusterLayerId);
          if (currentMap.getSource(sourceId)) currentMap.removeSource(sourceId);
        }
      } catch {
        // Map may have been destroyed, ignore
      }

      if (popup.current) {
        popup.current.remove();
      }

      if (popupRoot.current) {
        popupRoot.current.unmount();
        popupRoot.current = null;
      }
    };
  }, [locations, isLoading]);

  // Handle location selection - also select in draw for editing
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (!map.current || !location.geometry) return;

    if (location.geometry.type === 'Point') {
      // For points, just center on the point
      const coords = location.geometry.coordinates as number[];
      map.current.flyTo({
        center: [coords[0], coords[1]],
        zoom: 16,
        duration: 1000
      });
    } else if (location.geometry.type === 'Polygon' && location.geometry.coordinates?.[0]?.[0]) {
      // For polygons, fit bounds
      const coords = location.geometry.coordinates[0] as number[][];
      const bounds = coords.reduce((bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      }, new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]));

      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });

      // Select the polygon in MapboxDraw for editing (if in select mode)
      if (draw.current && drawMode === 'select') {
        const features = draw.current.getAll();
        const feature = features.features.find((f: any) => f.properties.id === location.id);
        if (feature) {
          // Switch to direct_select mode to enable vertex editing
          draw.current.changeMode('direct_select', { featureId: feature.id as string });
        }
      }
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

  // Handle location save from dialog
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGeometry) return;

    try {
      const newLocation = {
        name: createFormData.name,
        description: createFormData.description,
        location_type: 'polygon' as const,
        geometry: pendingGeometry,
        parent_id: createFormData.parent_id,
      };

      await createLocation.mutateAsync(newLocation);
      
      // Clean up
      if (pendingFeatureId && draw.current) {
        draw.current.delete(pendingFeatureId);
      }
      setIsCreateDialogOpen(false);
      setPendingGeometry(null);
      setPendingFeatureId(null);
      setPreselectedParentId(null);
      setCreateFormData({ name: '', description: '', parent_id: null });
    } catch (error) {
      console.error('Failed to create location:', error);
    }
  };

  // Handle dialog cancel
  const handleCancelCreate = () => {
    if (pendingFeatureId && draw.current) {
      draw.current.delete(pendingFeatureId);
    }
    setIsCreateDialogOpen(false);
    setPendingGeometry(null);
    setPendingFeatureId(null);
    setPreselectedParentId(null);
    setCreateFormData({ name: '', description: '', parent_id: null });
  };

  // Handle "Add Child Location" from sidebar
  const handleAddChildLocation = (parentLocation: Location) => {
    setPreselectedParentId(Number(parentLocation.id));
    setDrawMode('polygon');
    // Optionally fly to parent location
    if (map.current) {
      handleLocationSelect(parentLocation);
    }
  };

  // Find parent location name for context
  const parentLocationName = createFormData.parent_id 
    ? locations.find(loc => Number(loc.id) === createFormData.parent_id)?.name
    : null;

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <LocationsSidebar
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        onLocationDelete={handleLocationDelete}
        onLocationUpdate={handleLocationUpdate}
        onAddChildLocation={handleAddChildLocation}
        mapboxToken={mapboxToken}
        onAddressSelect={handleAddressSelect}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden">
        <MapToolbar
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
        />

        {/* Map */}
        <div ref={mapContainer} className="absolute inset-0" />
      </div>

      {/* Create Location Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && handleCancelCreate()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {parentLocationName ? `Add Child Location to ${parentLocationName}` : 'Add New Location'}
            </DialogTitle>
            <DialogDescription>
              {parentLocationName 
                ? `This location will be nested under ${parentLocationName}`
                : 'Create a new location from the drawn area'
              }
            </DialogDescription>
            {parentLocationName && (
              <Badge variant="secondary" className="w-fit">
                Parent: {parentLocationName}
              </Badge>
            )}
          </DialogHeader>
          <form onSubmit={handleSaveLocation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Name *</Label>
              <Input
                id="location-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                placeholder="e.g., North Field, Pasture A, Garden Bed 1"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-parent">Parent Location (Optional)</Label>
              <ParentSelector
                options={locations.map(loc => ({
                  id: loc.id,
                  name: loc.name,
                  parent_id: loc.parent_id,
                  depth: loc.depth,
                  is_leaf: loc.is_leaf,
                }))}
                value={createFormData.parent_id}
                onChange={(value) => setCreateFormData({ 
                  ...createFormData, 
                  parent_id: value ? Number(value) : null 
                })}
                placeholder="Select parent location or leave empty"
                showDepth={true}
                allowClear={true}
              />
              <p className="text-xs text-muted-foreground">
                Nest this location under another to create a hierarchy (e.g., Field A under North Farm)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-description">Description</Label>
              <Textarea
                id="location-description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="Add notes about this location..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancelCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLocation.isPending}>
                {createLocation.isPending ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapInterface;

