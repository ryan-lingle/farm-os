/**
 * Hook to auto-detect the current page context from URL.
 * Returns context for the chat when on a detail/show page.
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTask } from './useTasks';
import { usePlan } from './usePlans';
import { useLocation as useLocationData } from './useLocations';
import { useAsset } from './useAssets';
import type { ChatContext } from '@/lib/chat-api';
import {
  buildTaskContext,
  buildPlanContext,
  buildLocationContext,
  buildAssetContext,
} from '@/lib/chat-context';

interface CurrentPageContext {
  context: ChatContext | null;
  isLoading: boolean;
  entityName: string | null;
  entityType: string | null;
}

/**
 * Parse the current URL to determine if we're on a detail page.
 * Returns the entity type and ID if applicable.
 */
function parseUrl(pathname: string): { type: string; id: string; assetType?: string } | null {
  // /locations/:id
  const locationMatch = pathname.match(/^\/locations\/(\d+)$/);
  if (locationMatch) {
    return { type: 'location', id: locationMatch[1] };
  }

  // /tasks/:id (not /tasks/plans, /tasks/cycles, /tasks/calendar)
  const taskMatch = pathname.match(/^\/tasks\/(\d+)$/);
  if (taskMatch) {
    return { type: 'task', id: taskMatch[1] };
  }

  // /tasks/plans/:id
  const planMatch = pathname.match(/^\/tasks\/plans\/(\d+)$/);
  if (planMatch) {
    return { type: 'plan', id: planMatch[1] };
  }

  // /records/assets/:assetType/:id
  const assetMatch = pathname.match(/^\/records\/assets\/([^/]+)\/(\d+)$/);
  if (assetMatch) {
    return { type: 'asset', id: assetMatch[2], assetType: assetMatch[1] };
  }

  return null;
}

export function useCurrentPageContext(): CurrentPageContext {
  const location = useLocation();
  const parsed = useMemo(() => parseUrl(location.pathname), [location.pathname]);

  // Conditionally fetch data based on the parsed URL
  // We need to call all hooks unconditionally but with empty/disabled params

  const isTask = parsed?.type === 'task';
  const isPlan = parsed?.type === 'plan';
  const isLocation = parsed?.type === 'location';
  const isAsset = parsed?.type === 'asset';

  // Task query
  const { data: task, isLoading: taskLoading } = useTask(isTask ? parsed.id : '');

  // Plan query
  const { data: plan, isLoading: planLoading } = usePlan(isPlan ? parsed.id : '');

  // Location query
  const { data: locationData, isLoading: locationLoading } = useLocationData(
    isLocation ? parsed.id : ''
  );

  // Asset query
  const { data: assetData, isLoading: assetLoading } = useAsset(
    isAsset ? (parsed.assetType || '') : '',
    isAsset ? parsed.id : ''
  );

  // Build the context based on what we loaded
  const result = useMemo(() => {
    if (!parsed) {
      return {
        context: null,
        isLoading: false,
        entityName: null,
        entityType: null,
      };
    }

    if (isTask) {
      if (taskLoading || !task) {
        return {
          context: null,
          isLoading: taskLoading,
          entityName: null,
          entityType: 'task',
        };
      }
      return {
        context: buildTaskContext(task),
        isLoading: false,
        entityName: task.title,
        entityType: 'task',
      };
    }

    if (isPlan) {
      if (planLoading || !plan) {
        return {
          context: null,
          isLoading: planLoading,
          entityName: null,
          entityType: 'plan',
        };
      }
      return {
        context: buildPlanContext(plan),
        isLoading: false,
        entityName: plan.name,
        entityType: 'plan',
      };
    }

    if (isLocation) {
      if (locationLoading || !locationData) {
        return {
          context: null,
          isLoading: locationLoading,
          entityName: null,
          entityType: 'location',
        };
      }
      return {
        context: buildLocationContext(locationData),
        isLoading: false,
        entityName: locationData.name,
        entityType: 'location',
      };
    }

    if (isAsset) {
      if (assetLoading || !assetData?.data) {
        return {
          context: null,
          isLoading: assetLoading,
          entityName: null,
          entityType: 'asset',
        };
      }
      const asset = assetData.data;
      return {
        context: buildAssetContext(asset),
        isLoading: false,
        entityName: asset.attributes.name,
        entityType: asset.attributes.asset_type,
      };
    }

    return {
      context: null,
      isLoading: false,
      entityName: null,
      entityType: null,
    };
  }, [
    parsed,
    isTask, isPlan, isLocation, isAsset,
    task, taskLoading,
    plan, planLoading,
    locationData, locationLoading,
    assetData, assetLoading,
  ]);

  return result;
}
