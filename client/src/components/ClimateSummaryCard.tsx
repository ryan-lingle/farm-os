import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Thermometer,
  Droplets,
  Sun,
  Snowflake,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ClimateData, MonthlyClimate } from '@/hooks/useLocationClimate';
import { cn } from '@/lib/utils';

interface ClimateSummaryCardProps {
  climate: ClimateData | undefined;
  isLoading: boolean;
  error: Error | null;
}

// Convert Celsius to Fahrenheit
const celsiusToFahrenheit = (c: number): number => Math.round((c * 9/5) + 32);

// Convert mm to inches
const mmToInches = (mm: number): number => Math.round(mm / 25.4 * 10) / 10;

export const ClimateSummaryCard: React.FC<ClimateSummaryCardProps> = ({
  climate,
  isLoading,
  error
}) => {
  const [showMonthly, setShowMonthly] = useState(false);
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Climate Data
          </CardTitle>
          <CardDescription>Loading historical climate averages...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Climate Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load climate data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!climate) {
    return null;
  }

  const formatTemp = (celsius: number): string => {
    if (unit === 'imperial') {
      return `${celsiusToFahrenheit(celsius)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const formatPrecip = (mm: number): string => {
    if (unit === 'imperial') {
      return `${mmToInches(mm)}"`;
    }
    return `${Math.round(mm)} mm`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              Climate Data
            </CardTitle>
            <CardDescription>
              10-year historical averages ({climate.elevation > 0 ? `${Math.round(climate.elevation)}m elevation` : 'Sea level'})
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={unit === 'imperial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnit('imperial')}
              className="h-7 px-2 text-xs"
            >
              °F
            </Button>
            <Button
              variant={unit === 'metric' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUnit('metric')}
              className="h-7 px-2 text-xs"
            >
              °C
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Annual Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Thermometer className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold">{formatTemp(climate.annualAvgTemp)}</div>
            <div className="text-xs text-muted-foreground">Avg Temp</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Droplets className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{formatPrecip(climate.annualPrecipitation)}</div>
            <div className="text-xs text-muted-foreground">Annual Precip</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{climate.frostFreeDays}</div>
            <div className="text-xs text-muted-foreground">Frost-Free Days</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-lg font-bold">
              {formatTemp(climate.annualMinTemp)} - {formatTemp(climate.annualMaxTemp)}
            </div>
            <div className="text-xs text-muted-foreground">Temp Range</div>
          </div>
        </div>

        {/* Frost Dates */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5">
            <Snowflake className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs">Last Spring Frost: <strong>{climate.lastFrostDate}</strong></span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5">
            <Snowflake className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs">First Fall Frost: <strong>{climate.firstFrostDate}</strong></span>
          </Badge>
        </div>

        {/* Monthly Data Toggle */}
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => setShowMonthly(!showMonthly)}
        >
          {showMonthly ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Monthly Data
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Monthly Data
            </>
          )}
        </Button>

        {/* Monthly Data Table */}
        {showMonthly && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Month</th>
                  <th className="text-center py-2 px-2 font-medium">Avg</th>
                  <th className="text-center py-2 px-2 font-medium">High</th>
                  <th className="text-center py-2 px-2 font-medium">Low</th>
                  <th className="text-center py-2 px-2 font-medium">Precip</th>
                  <th className="text-center py-2 px-2 font-medium">Rain Days</th>
                </tr>
              </thead>
              <tbody>
                {climate.monthlyData.map((month, i) => (
                  <tr key={month.month} className={cn("border-b", i % 2 === 0 && "bg-muted/30")}>
                    <td className="py-2 px-2 font-medium">{month.month.slice(0, 3)}</td>
                    <td className="text-center py-2 px-2">{formatTemp(month.avgTemp)}</td>
                    <td className="text-center py-2 px-2 text-orange-600">{formatTemp(month.maxTemp)}</td>
                    <td className="text-center py-2 px-2 text-blue-600">{formatTemp(month.minTemp)}</td>
                    <td className="text-center py-2 px-2">{formatPrecip(month.precipitation)}</td>
                    <td className="text-center py-2 px-2">{month.precipitationDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mini Chart - Monthly Temp & Precip */}
        {!showMonthly && (
          <div className="h-24 flex items-end justify-between gap-1 pt-4">
            {climate.monthlyData.map((month, i) => {
              // Normalize values for visual representation
              const tempHeight = ((month.avgTemp + 10) / 40) * 100; // Assuming -10 to 30°C range
              const precipHeight = (month.precipitation / 200) * 100; // Assuming max 200mm/month

              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex gap-0.5 h-16 items-end">
                    <div
                      className="flex-1 bg-orange-400 rounded-t opacity-70"
                      style={{ height: `${Math.max(5, Math.min(100, tempHeight))}%` }}
                      title={`${month.month}: ${formatTemp(month.avgTemp)} avg`}
                    />
                    <div
                      className="flex-1 bg-blue-400 rounded-t opacity-70"
                      style={{ height: `${Math.max(5, Math.min(100, precipHeight))}%` }}
                      title={`${month.month}: ${formatPrecip(month.precipitation)} precip`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{month.month.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        )}

        {!showMonthly && (
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-400 rounded opacity-70" />
              Temperature
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-400 rounded opacity-70" />
              Precipitation
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClimateSummaryCard;
