import { Box, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

/**
 * ScrollToTopBottom Component.
 * Global sticky navigation control positioned on bottom-right.
 * Provides instantaneous scroll-to-top and scroll-to-bottom actions for both window and scroll containers.
 */
export default function ScrollToTopBottom() {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollables = document.querySelectorAll(
      '[data-scroll-container], .table-container, [style*="overflow"], [class*="tableContainer"]'
    );
    scrollables.forEach((el) => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
  };

  const handleScrollToBottom = () => {
    const maxDocHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
    window.scrollTo({ top: maxDocHeight, behavior: 'instant' });
    const scrollables = document.querySelectorAll(
      '[data-scroll-container], .table-container, [style*="overflow"], [class*="tableContainer"]'
    );
    scrollables.forEach((el) => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
      }
    });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px hsla(0, 0%, 0%, 0.15)',
        zIndex: 9999,
      }}
    >
      <IconButton
        onClick={handleScrollToTop}
        sx={{
          borderRadius: 0,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderBottom: 'none',
          color: 'var(--text)',
          width: 44,
          height: 44,
          '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
        }}
        aria-label="Scroll to top"
      >
        <ArrowUpwardIcon />
      </IconButton>
      <IconButton
        onClick={handleScrollToBottom}
        sx={{
          borderRadius: 0,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text)',
          width: 44,
          height: 44,
          '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
        }}
        aria-label="Scroll to bottom"
      >
        <ArrowDownwardIcon />
      </IconButton>
    </Box>
  );
}
