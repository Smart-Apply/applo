'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusChip, TRACKING_STATUS_CHIP } from '@/components/ui/status-chip';
import type { ApplicationTrackingStatus } from '@/types';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface StatusDropdownProps {
  applicationId: string;
  currentStatus: ApplicationTrackingStatus;
  variant?: 'dropdown' | 'badge';
}

export function StatusDropdown({
  applicationId,
  currentStatus,
  variant = 'dropdown',
}: StatusDropdownProps) {
  const [status, setStatus] = useState(currentStatus);
  const queryClient = useQueryClient();

  // Keep local state in sync when the status changes externally
  // (e.g. a bulk status update or an email-tracking auto-update).
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: ApplicationTrackingStatus) =>
      api.applications.updateStatus(applicationId, newStatus),
    onSuccess: (updatedApp) => {
      // Update cache immediately for better UX
      queryClient.setQueryData(['applications', applicationId], updatedApp);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Status aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
      setStatus(currentStatus); // Revert on error
    },
  });

  const handleStatusChange = (newStatus: ApplicationTrackingStatus) => {
    setStatus(newStatus);
    updateStatusMutation.mutate(newStatus);
  };

  const config = TRACKING_STATUS_CHIP[status];

  // Badge-only variant (non-interactive)
  if (variant === 'badge') {
    return <StatusChip tone={config.tone}>{config.label}</StatusChip>;
  }

  // Dropdown variant (interactive)
  return (
    <Select value={status} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <StatusChip tone={config.tone} className="border-0 bg-transparent px-0 py-0">
            {config.label}
          </StatusChip>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(TRACKING_STATUS_CHIP).map(([value, conf]) => (
          <SelectItem key={value} value={value}>
            <StatusChip tone={conf.tone} className="border-0 bg-transparent px-0 py-0">
              {conf.label}
            </StatusChip>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
