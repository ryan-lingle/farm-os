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
    monthlyData
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
