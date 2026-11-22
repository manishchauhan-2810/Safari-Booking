import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export const useZones = (vehicleType) =>
  useQuery({
    queryKey: ['zones', vehicleType],
    queryFn: () => api.get('/public/zones', { params: { vehicleType } }),
    staleTime: 5 * 60_000,
  });

export const useCalendar = (month, vehicleType, zone) =>
  useQuery({
    queryKey: ['calendar', month, vehicleType, zone],
    queryFn: () => api.get('/public/availability/calendar', { params: { month, vehicleType, zone } }),
    enabled: Boolean(month && vehicleType),
    staleTime: 30_000,
  });

export const useSlots = (date, vehicleType, zone) =>
  useQuery({
    queryKey: ['slots', date, vehicleType, zone],
    queryFn: () => api.get('/public/availability/slots', { params: { date, vehicleType, zone } }),
    enabled: Boolean(date && vehicleType),
    staleTime: 15_000,
  });

export const usePricing = () =>
  useQuery({
    queryKey: ['pricing'],
    queryFn: () => api.get('/public/pricing'),
    staleTime: 5 * 60_000,
  });