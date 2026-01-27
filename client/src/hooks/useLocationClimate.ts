import { useQuery } from '@tanstack/react-query';

export interface ClimateData {
  latitude: number;
  longitude: number;
  elevation: number;
  // Annual averages
  annualPrecipitation: number; // mm
  annualAvgTemp: number; // celsius
  annualMaxTemp: number; // celsius
  annualMinTemp: number; // celsius
  // Growing season info
  frostFreeDays: number;
  lastFrostDate: string; // approximate month-day
  firstFrostDate: string; // approximate month-day
  // Monthly data
  monthlyData: MonthlyClimate[];
  // Rainfall decision context
  rainfallContext: RainfallContext;
}

export type RainfallClassification = 'arid' | 'semi-arid' | 'sub-humid' | 'humid' | 'very-humid';
export type DroughtRisk = 'low' | 'moderate' | 'high' | 'severe';

export interface RainfallContext {
  // Classification
  classification: RainfallClassification;
  classificationLabel: string;
  annualPrecipitationInches: number;

  // Seasonal patterns
  wetMonths: string[];      // Months with above-average precipitation
  dryMonths: string[];      // Months with below-average precipitation
  wettestMonth: string;
  driestMonth: string;
  seasonalVariation: number; // Coefficient of variation (0-1, higher = more variable)

  // Risk assessment
  droughtRisk: DroughtRisk;
  droughtRiskFactors: string[];

  // Water management recommendations
  waterStrategy: WaterStrategy;
}

export interface WaterStrategy {
  pondSizeMultiplier: number;      // 1.0 = standard, >1 = larger for arid
  catchmentRatio: number;          // Recommended catchment:storage ratio
  priorityFeatures: string[];      // e.g., "deep ponds", "spillways", "swales"
  keylineSpacing: 'tight' | 'standard' | 'wide';
  recommendations: string[];
}

export interface MonthlyClimate {
  month: string;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  precipitation: number; // mm
  precipitationDays: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculate rainfall decision context from monthly climate data.
 * Based on standard climate classifications and water harvesting best practices.
 */
function calculateRainfallContext(
  annualPrecipitation: number,
  monthlyData: MonthlyClimate[]
): RainfallContext {
  const annualPrecipitationInches = Math.round(annualPrecipitation / 25.4 * 10) / 10;

  // Classify based on annual precipitation (standard climate classifications)
  let classification: RainfallClassification;
  let classificationLabel: string;

  if (annualPrecipitation < 250) {
    classification = 'arid';
    classificationLabel = 'Arid (Desert)';
  } else if (annualPrecipitation < 500) {
    classification = 'semi-arid';
    classificationLabel = 'Semi-Arid';
  } else if (annualPrecipitation < 1000) {
    classification = 'sub-humid';
    classificationLabel = 'Sub-Humid';
  } else if (annualPrecipitation < 2000) {
    classification = 'humid';
    classificationLabel = 'Humid';
  } else {
    classification = 'very-humid';
    classificationLabel = 'Very Humid (Tropical)';
  }

  // Calculate seasonal patterns
  const avgMonthlyPrecip = annualPrecipitation / 12;
  const precipValues = monthlyData.map(m => m.precipitation);

  const wetMonths = monthlyData
    .filter(m => m.precipitation > avgMonthlyPrecip * 1.2)
    .map(m => m.month.slice(0, 3));

  const dryMonths = monthlyData
    .filter(m => m.precipitation < avgMonthlyPrecip * 0.8)
    .map(m => m.month.slice(0, 3));

  const maxPrecip = Math.max(...precipValues);
  const minPrecip = Math.min(...precipValues);
  const wettestMonth = monthlyData.find(m => m.precipitation === maxPrecip)?.month || '';
  const driestMonth = monthlyData.find(m => m.precipitation === minPrecip)?.month || '';

  // Calculate coefficient of variation for seasonality
  const mean = precipValues.reduce((a, b) => a + b, 0) / precipValues.length;
  const variance = precipValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / precipValues.length;
  const stdDev = Math.sqrt(variance);
  const seasonalVariation = mean > 0 ? Math.round((stdDev / mean) * 100) / 100 : 0;

  // Assess drought risk
  let droughtRisk: DroughtRisk;
  const droughtRiskFactors: string[] = [];

  if (classification === 'arid') {
    droughtRisk = 'severe';
    droughtRiskFactors.push('Very low annual rainfall (<10")');
  } else if (classification === 'semi-arid') {
    droughtRisk = 'high';
    droughtRiskFactors.push('Low annual rainfall (10-20")');
  } else if (classification === 'sub-humid' && seasonalVariation > 0.6) {
    droughtRisk = 'high';
    droughtRiskFactors.push('Highly seasonal rainfall pattern');
  } else if (classification === 'sub-humid') {
    droughtRisk = 'moderate';
    droughtRiskFactors.push('Moderate rainfall with some dry periods');
  } else {
    droughtRisk = 'low';
  }

  // Add risk factors based on patterns
  if (dryMonths.length >= 4) {
    droughtRiskFactors.push(`Extended dry season (${dryMonths.length} months)`);
    if (droughtRisk === 'low') droughtRisk = 'moderate';
  }

  if (seasonalVariation > 0.8) {
    droughtRiskFactors.push('Highly variable precipitation');
  }

  // Calculate water management strategy
  const waterStrategy = calculateWaterStrategy(classification, seasonalVariation, dryMonths.length);

  return {
    classification,
    classificationLabel,
    annualPrecipitationInches,
    wetMonths,
    dryMonths,
    wettestMonth,
    driestMonth,
    seasonalVariation,
    droughtRisk,
    droughtRiskFactors,
    waterStrategy,
  };
}

/**
 * Determine water management strategy based on climate.
 * Based on keyline design principles and permaculture water harvesting.
 */
function calculateWaterStrategy(
  classification: RainfallClassification,
  seasonalVariation: number,
  dryMonthCount: number
): WaterStrategy {
  const strategies: Record<RainfallClassification, WaterStrategy> = {
    'arid': {
      pondSizeMultiplier: 2.0,
      catchmentRatio: 30, // 30:1 catchment to storage
      priorityFeatures: ['Deep ponds (reduce evaporation)', 'Maximized catchment area', 'Shade structures', 'Lined ponds'],
      keylineSpacing: 'tight',
      recommendations: [
        'Prioritize water storage over all other considerations',
        'Build multiple small catchments along every keyline',
        'Consider lined ponds to prevent seepage losses',
        'Design for 100% rainfall capture',
        'Plant windbreaks to reduce evaporation',
      ],
    },
    'semi-arid': {
      pondSizeMultiplier: 1.5,
      catchmentRatio: 20, // 20:1
      priorityFeatures: ['Deep ponds', 'Swales on contour', 'Keyline cultivation', 'Multiple small ponds'],
      keylineSpacing: 'tight',
      recommendations: [
        'Focus on capturing seasonal rains efficiently',
        'Build swales above ponds to slow and spread water',
        'Use keyline plowing to move water from valleys to ridges',
        'Design for extended dry season water needs',
        'Consider groundwater recharge basins',
      ],
    },
    'sub-humid': {
      pondSizeMultiplier: 1.0,
      catchmentRatio: 10, // 10:1
      priorityFeatures: ['Balanced storage', 'Spillways', 'Swales', 'Keyline ponds'],
      keylineSpacing: 'standard',
      recommendations: [
        'Balance water storage with overflow management',
        'Install proper spillways on all ponds',
        'Use keyline design for even water distribution',
        'Plan for both dry periods and heavy rain events',
        'Consider irrigation backup during dry months',
      ],
    },
    'humid': {
      pondSizeMultiplier: 0.75,
      catchmentRatio: 5, // 5:1
      priorityFeatures: ['Drainage management', 'Spillways', 'Erosion control', 'Smaller distributed ponds'],
      keylineSpacing: 'wide',
      recommendations: [
        'Focus on drainage and overflow management',
        'Design robust spillways for heavy rain events',
        'Consider smaller, distributed water features',
        'Prioritize erosion control on slopes',
        'Swales may be more appropriate than ponds',
      ],
    },
    'very-humid': {
      pondSizeMultiplier: 0.5,
      catchmentRatio: 3, // 3:1
      priorityFeatures: ['Drainage systems', 'Flood management', 'Erosion control', 'Rain gardens'],
      keylineSpacing: 'wide',
      recommendations: [
        'Primary concern is managing excess water',
        'Focus on drainage channels and flood paths',
        'Use rain gardens and bioswales for infiltration',
        'Avoid large impoundments that may overflow',
        'Design for extreme rainfall events',
      ],
    },
  };

  const strategy = { ...strategies[classification] };

  // Adjust for high seasonality
  if (seasonalVariation > 0.6) {
    strategy.recommendations.unshift(
      `High seasonal variation (${Math.round(seasonalVariation * 100)}%) - design for both wet and dry extremes`
    );
    strategy.pondSizeMultiplier *= 1.2;
  }

  // Adjust for long dry season
  if (dryMonthCount >= 5) {
    strategy.recommendations.unshift(
      `${dryMonthCount}-month dry season - ensure storage for extended dry period`
    );
    strategy.catchmentRatio *= 1.3;
  }

  return strategy;
}

async function fetchClimateData(lat: number, lng: number): Promise<ClimateData> {
  // Use Open-Meteo's climate API with historical data
  // We'll fetch the last 10 years of data to calculate averages
  const endYear = new Date().getFullYear() - 1; // Last complete year
  const startYear = endYear - 9; // 10 years of data

  // Fetch monthly climate data using Open-Meteo's Historical API
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lng.toString());
  url.searchParams.set('start_date', `${startYear}-01-01`);
  url.searchParams.set('end_date', `${endYear}-12-31`);
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch climate data: ${response.statusText}`);
  }

  const data = await response.json();

  // Process daily data into monthly and annual averages
  const dailyData = data.daily;
  const dates = dailyData.time as string[];
  const maxTemps = dailyData.temperature_2m_max as (number | null)[];
  const minTemps = dailyData.temperature_2m_min as (number | null)[];
  const meanTemps = dailyData.temperature_2m_mean as (number | null)[];
  const precipitation = dailyData.precipitation_sum as (number | null)[];

  // Group by month across all years
  const monthlyGroups: Record<number, { temps: number[]; maxTemps: number[]; minTemps: number[]; precip: number[]; precipDays: number }> = {};

  for (let m = 0; m < 12; m++) {
    monthlyGroups[m] = { temps: [], maxTemps: [], minTemps: [], precip: [], precipDays: 0 };
  }

  // Track frost dates
  const frostDates: { last: number[]; first: number[] } = { last: [], first: [] };

  dates.forEach((date, i) => {
    const d = new Date(date);
    const month = d.getMonth();
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    if (meanTemps[i] !== null) {
      monthlyGroups[month].temps.push(meanTemps[i]!);
    }
    if (maxTemps[i] !== null) {
      monthlyGroups[month].maxTemps.push(maxTemps[i]!);
    }
    if (minTemps[i] !== null) {
      monthlyGroups[month].minTemps.push(minTemps[i]!);

      // Track frost (min temp <= 0C)
      if (minTemps[i]! <= 0) {
        // Spring frost (days 1-180)
        if (dayOfYear <= 180) {
          frostDates.last.push(dayOfYear);
        }
        // Fall frost (days 181-365)
        else {
          frostDates.first.push(dayOfYear);
        }
      }
    }
    if (precipitation[i] !== null) {
      monthlyGroups[month].precip.push(precipitation[i]!);
      if (precipitation[i]! > 0.1) {
        monthlyGroups[month].precipDays++;
      }
    }
  });

  // Calculate monthly averages
  const monthlyData: MonthlyClimate[] = MONTH_NAMES.map((name, i) => {
    const group = monthlyGroups[i];
    const numYears = 10;

    return {
      month: name,
      avgTemp: group.temps.length > 0
        ? Math.round((group.temps.reduce((a, b) => a + b, 0) / group.temps.length) * 10) / 10
        : 0,
      maxTemp: group.maxTemps.length > 0
        ? Math.round((group.maxTemps.reduce((a, b) => a + b, 0) / group.maxTemps.length) * 10) / 10
        : 0,
      minTemp: group.minTemps.length > 0
        ? Math.round((group.minTemps.reduce((a, b) => a + b, 0) / group.minTemps.length) * 10) / 10
        : 0,
      precipitation: group.precip.length > 0
        ? Math.round(group.precip.reduce((a, b) => a + b, 0) / numYears)
        : 0,
      precipitationDays: Math.round(group.precipDays / numYears)
    };
  });

  // Calculate annual totals
  const annualPrecipitation = monthlyData.reduce((sum, m) => sum + m.precipitation, 0);
  const annualAvgTemp = Math.round((monthlyData.reduce((sum, m) => sum + m.avgTemp, 0) / 12) * 10) / 10;
  const annualMaxTemp = Math.max(...monthlyData.map(m => m.maxTemp));
  const annualMinTemp = Math.min(...monthlyData.map(m => m.minTemp));

  // Calculate frost dates
  const avgLastFrostDay = frostDates.last.length > 0
    ? Math.round(frostDates.last.reduce((a, b) => a + b, 0) / frostDates.last.length)
    : 90; // Default to late March

  const avgFirstFrostDay = frostDates.first.length > 0
    ? Math.round(frostDates.first.reduce((a, b) => a + b, 0) / frostDates.first.length)
    : 290; // Default to mid-October

  const frostFreeDays = avgFirstFrostDay - avgLastFrostDay;

  // Convert day of year to month-day string
  const dayToDate = (day: number): string => {
    const date = new Date(2024, 0, day); // Use a leap year for accuracy
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate rainfall decision context
  const rainfallContext = calculateRainfallContext(annualPrecipitation, monthlyData);

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    elevation: data.elevation || 0,
    annualPrecipitation,
    annualAvgTemp,
    annualMaxTemp,
    annualMinTemp,
    frostFreeDays: Math.max(0, frostFreeDays),
    lastFrostDate: dayToDate(avgLastFrostDay),
    firstFrostDate: dayToDate(avgFirstFrostDay),
    monthlyData,
    rainfallContext,
  };
}

export function useLocationClimate(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ['climate', lat, lng],
    queryFn: () => fetchClimateData(lat!, lng!),
    enabled: lat !== null && lng !== null,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
  });
}

// Helper to get center coordinates from location geometry
export function getCenterFromGeometry(geometry: any): [number, number] | null {
  if (!geometry) return null;

  // Handle string geometry
  const geom = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;

  if (geom.type === 'Point') {
    return [geom.coordinates[1], geom.coordinates[0]]; // [lat, lng]
  }

  if (geom.type === 'Polygon') {
    // Calculate centroid from polygon coordinates
    const coords = geom.coordinates[0];
    let sumLat = 0;
    let sumLng = 0;

    coords.forEach((coord: [number, number]) => {
      sumLng += coord[0];
      sumLat += coord[1];
    });

    return [sumLat / coords.length, sumLng / coords.length];
  }

  if (geom.type === 'MultiPolygon') {
    // Use first polygon's centroid
    const coords = geom.coordinates[0][0];
    let sumLat = 0;
    let sumLng = 0;

    coords.forEach((coord: [number, number]) => {
      sumLng += coord[0];
      sumLat += coord[1];
    });

    return [sumLat / coords.length, sumLng / coords.length];
  }

  return null;
}
