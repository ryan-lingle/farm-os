import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Droplets,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Waves,
  CloudRain,
  Sun,
  Thermometer,
} from 'lucide-react';
import type { RainfallContext, RainfallClassification, DroughtRisk } from '@/hooks/useLocationClimate';
import { cn } from '@/lib/utils';

interface WaterManagementCardProps {
  rainfallContext: RainfallContext;
}

const classificationColors: Record<RainfallClassification, string> = {
  'arid': 'bg-orange-100 text-orange-800 border-orange-300',
  'semi-arid': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'sub-humid': 'bg-green-100 text-green-800 border-green-300',
  'humid': 'bg-blue-100 text-blue-800 border-blue-300',
  'very-humid': 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const classificationIcons: Record<RainfallClassification, React.ElementType> = {
  'arid': Sun,
  'semi-arid': Thermometer,
  'sub-humid': CloudRain,
  'humid': Droplets,
  'very-humid': Waves,
};

const droughtRiskColors: Record<DroughtRisk, string> = {
  'low': 'bg-green-100 text-green-800',
  'moderate': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
  'severe': 'bg-red-100 text-red-800',
};

export const WaterManagementCard: React.FC<WaterManagementCardProps> = ({
  rainfallContext,
}) => {
  const [showRecommendations, setShowRecommendations] = useState(false);

  const {
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
  } = rainfallContext;

  const ClassIcon = classificationIcons[classification];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Water Management
            </CardTitle>
            <CardDescription>
              Rainfall analysis and pond/keyline recommendations
            </CardDescription>
          </div>
          <Badge className={cn('border', classificationColors[classification])}>
            <ClassIcon className="h-3.5 w-3.5 mr-1" />
            {classificationLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <CloudRain className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{annualPrecipitationInches}"</div>
            <div className="text-xs text-muted-foreground">Annual Rainfall</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Droplets className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold">{wettestMonth.slice(0, 3)}</div>
            <div className="text-xs text-muted-foreground">Wettest Month</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Sun className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <div className="text-lg font-bold">{driestMonth.slice(0, 3)}</div>
            <div className="text-xs text-muted-foreground">Driest Month</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <AlertTriangle className={cn(
              'h-5 w-5 mx-auto mb-1',
              droughtRisk === 'severe' && 'text-red-500',
              droughtRisk === 'high' && 'text-orange-500',
              droughtRisk === 'moderate' && 'text-yellow-500',
              droughtRisk === 'low' && 'text-green-500',
            )} />
            <Badge className={cn('text-sm', droughtRiskColors[droughtRisk])}>
              {droughtRisk.charAt(0).toUpperCase() + droughtRisk.slice(1)}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Drought Risk</div>
          </div>
        </div>

        {/* Seasonal Pattern */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Seasonal Pattern
            {seasonalVariation > 0.6 && (
              <Badge variant="outline" className="text-xs">
                High Variability ({Math.round(seasonalVariation * 100)}%)
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {wetMonths.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Wet:</span>
                {wetMonths.map(m => (
                  <Badge key={m} variant="outline" className="text-xs bg-blue-50">
                    {m}
                  </Badge>
                ))}
              </div>
            )}
            {dryMonths.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Dry:</span>
                {dryMonths.map(m => (
                  <Badge key={m} variant="outline" className="text-xs bg-yellow-50">
                    {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drought Risk Factors */}
        {droughtRiskFactors.length > 0 && (
          <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="font-medium text-orange-800 mb-1">Risk Factors:</div>
            <ul className="text-orange-700 text-xs space-y-0.5">
              {droughtRiskFactors.map((factor, i) => (
                <li key={i}>• {factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Design Parameters */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {waterStrategy.pondSizeMultiplier.toFixed(1)}x
            </div>
            <div className="text-xs text-muted-foreground">Pond Size Factor</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {Math.round(waterStrategy.catchmentRatio)}:1
            </div>
            <div className="text-xs text-muted-foreground">Catchment Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600 capitalize">
              {waterStrategy.keylineSpacing}
            </div>
            <div className="text-xs text-muted-foreground">Keyline Spacing</div>
          </div>
        </div>

        {/* Priority Features */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Priority Features</div>
          <div className="flex flex-wrap gap-2">
            {waterStrategy.priorityFeatures.map((feature, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {/* Recommendations Toggle */}
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={() => setShowRecommendations(!showRecommendations)}
        >
          {showRecommendations ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Recommendations
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Design Recommendations ({waterStrategy.recommendations.length})
            </>
          )}
        </Button>

        {/* Recommendations List */}
        {showRecommendations && (
          <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-medium text-blue-800 text-sm">
              Water Management Recommendations
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
              {waterStrategy.recommendations.map((rec, i) => (
                <li key={i} className="pl-1">{rec}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaterManagementCard;
