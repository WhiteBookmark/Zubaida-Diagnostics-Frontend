import { Box, Typography } from '@mui/material';

/**
 * Reusable animated toggle switch for filtering today's records.
 * Uses HSL colors, smooth transitions, and accessible switch semantics.
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Whether the filter is currently active
 * @param {Function} props.onToggle - Callback function invoked on toggle
 * @param {string} props.label - Descriptive text label displayed beside toggle
 */
export default function TodayToggle({ isActive, onToggle, label }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={onToggle}
      role="switch"
      aria-checked={isActive}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      title={label}
    >
      <Box
        sx={{
          width: '50px',
          height: '26px',
          borderRadius: '13px',
          backgroundColor: isActive ? 'var(--primary, hsl(221, 83%, 53%))' : 'hsl(215, 16%, 85%)',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
          boxShadow: 'inset 0 1px 3px hsla(0, 0%, 0%, 0.15)',
        }}
      >
        <Box
          sx={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'hsl(0, 0%, 100%)',
            position: 'absolute',
            top: '2px',
            left: isActive ? '26px' : '2px',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px hsla(0, 0%, 0%, 0.2)',
          }}
        />
      </Box>
      <Typography
        component="span"
        sx={{
          fontWeight: 600,
          fontSize: '14px',
          whiteSpace: 'nowrap',
          color: isActive ? 'var(--primary, hsl(221, 83%, 53%))' : 'var(--text)',
          transition: 'color 0.2s ease',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
