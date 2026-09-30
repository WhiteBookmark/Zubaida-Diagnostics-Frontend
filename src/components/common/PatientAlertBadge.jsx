import { Tooltip } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { getPatientAlertStatus } from '../../utils/patientAlerts';

/**
 * Red Circular Alert Icon component for patients with allergies or co-morbid factors.
 * Uses semantic HSL red with high-contrast icon and tooltip.
 */
export default function PatientAlertBadge({ patient }) {
  const { hasAlert, tooltipText } = getPatientAlertStatus(patient);
  if (!hasAlert) return null;

  return (
    <Tooltip title={tooltipText} arrow placement="top">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: 'hsl(0, 84%, 48%)',
          color: 'hsl(0, 0%, 100%)',
          flexShrink: 0,
          boxShadow: '0 1px 3px hsla(0, 84%, 30%, 0.3)',
          cursor: 'pointer',
          marginLeft: '6px',
          verticalAlign: 'middle',
        }}
      >
        <PriorityHighIcon sx={{ fontSize: '13px !important', color: 'hsl(0, 0%, 100%)', stroke: 'hsl(0, 0%, 100%)', strokeWidth: 1 }} />
      </span>
    </Tooltip>
  );
}
