import logger from '@/utils/logger';
import { Component, ErrorInfo, ReactNode } from 'react';
    import { Box, Typography, Button, Paper } from '@mui/material';
    import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';

    interface Props {
      children: ReactNode;
    }

    interface State {
      hasError: boolean;
      error?: Error;
    }

    class ErrorBoundary extends Component<Props, State> {
      public state: State = {
        hasError: false,
      };

      public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
      }

      public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught component error', { message: error.message, stack: error.stack, componentStack: errorInfo.componentStack });
      }

      private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
      };

      public render() {
        if (this.state.hasError) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', p: 2 }}>
              <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
                <SafeIcon icon={FiAlertTriangle} style={{ fontSize: 64, color: '#f57c00', marginBottom: 16 }} />
                <Typography variant="h5" gutterBottom>
                  Something went wrong
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                </Typography>
                <Button variant="contained" onClick={this.handleReset} startIcon={<FiRefreshCw />}>
                  Try Again
                </Button>
              </Paper>
            </Box>
          );
        }

        return this.props.children;
      }
    }

    export default ErrorBoundary;