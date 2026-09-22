import { Typography, CircularProgress } from '@mui/material';
import { Person } from '@mui/icons-material';

/**
 * Reusable read-only Patient Name input field driven by MR Number lookup.
 * Follows theme HSL colors, left-fixated icon, and displays helper text if provided.
 *
 * @param {Object} props
 * @param {string} props.patientName - The resolved patient's name
 * @param {string} props.lookupStatus - 'loading' | 'found' | 'notFound' | ''
 * @param {string} [props.id='patientName'] - Field id
 * @param {string} [props.label='Patient Name'] - Field label
 * @param {boolean} [props.showLabel=true] - Whether to display the label
 * @param {string} [props.helperText] - Optional helper text below the field
 */
export default function PatientNameField({
  patientName,
  lookupStatus,
  id = 'patientName',
  label = 'Patient Name',
  showLabel = true,
  helperText,
}) {
  return (
    <div className="input-group">
      {showLabel && label && (
        <label className="input-label" htmlFor={id}>
          {label}
          {lookupStatus === 'loading' && (
            <span style={{ fontSize: '11px', color: 'var(--primary, hsl(221, 83%, 53%))', marginLeft: '8px' }}>
              (Verifying MR...)
            </span>
          )}
          {lookupStatus === 'notFound' && (
            <span style={{ fontSize: '11px', color: 'hsl(0, 72%, 51%)', marginLeft: '8px' }}>
              (No patient found with this MR)
            </span>
          )}
        </label>
      )}
      <div className="input-with-icon">
        {lookupStatus === 'loading' ? (
          <CircularProgress size={18} sx={{ color: 'hsl(221, 83%, 53%)' }} className="input-icon" />
        ) : (
          <Person className="input-icon" />
        )}
        <input
          id={id}
          name={id}
          type="text"
          value={patientName || (lookupStatus === 'notFound' ? 'Patient name not found' : '')}
          placeholder={lookupStatus === 'loading' ? 'Checking MR Number...' : 'Patient name will appear here'}
          disabled
          aria-label={label || 'Patient Name'}
          style={{
            backgroundColor: 'hsl(215, 25%, 95%)',
            color: patientName ? 'var(--text)' : 'hsl(0, 72%, 51%)',
            cursor: 'not-allowed',
            fontStyle: patientName ? 'normal' : 'italic',
          }}
        />
      </div>
      {helperText && (
        <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)', mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </div>
  );
}
