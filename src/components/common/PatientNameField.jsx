import { Typography } from '@mui/material';
import { Person } from '@mui/icons-material';

/**
 * Reusable read-only Patient Name input field driven by MR Number lookup.
 * Follows theme HSL colors, left-fixated icon, and displays helper text.
 *
 * @param {Object} props
 * @param {string} props.patientName - The resolved patient's name
 * @param {string} props.lookupStatus - 'loading' | 'found' | 'notFound' | ''
 * @param {string} [props.id='patientName'] - Field id
 * @param {string} [props.label='Patient Name'] - Field label
 */
export default function PatientNameField({
  patientName,
  lookupStatus,
  id = 'patientName',
  label = 'Patient Name'
}) {
  return (
    <div className="input-group">
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
      <div className="input-with-icon">
        <Person className="input-icon" />
        <input
          id={id}
          name={id}
          type="text"
          value={patientName || (lookupStatus === 'notFound' ? 'Patient name not found' : '')}
          placeholder={lookupStatus === 'loading' ? 'Checking MR Number...' : 'Patient name will appear here'}
          disabled
          style={{
            backgroundColor: 'hsl(215, 25%, 95%)',
            color: patientName ? 'var(--text)' : 'hsl(0, 72%, 51%)',
            cursor: 'not-allowed',
            fontStyle: patientName ? 'normal' : 'italic',
          }}
        />
      </div>
      <Typography variant="caption" sx={{ color: 'hsl(215, 16%, 47%)', mt: 0.5, display: 'block' }}>
        Patient Name is determined by MR Number.
      </Typography>
    </div>
  );
}
