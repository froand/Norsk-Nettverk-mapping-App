// Initialize Azure Monitor telemetry (must be before other imports take effect)
// In ESM, static imports are hoisted, so we must use dynamic imports for the app
import { useAzureMonitor } from '@azure/monitor-opentelemetry';

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
  });
  console.log('Azure Monitor telemetry initialized');
}

// Dynamic imports so OpenTelemetry can patch HTTP/Express before they load
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { searchRoutes } = await import('./routes/search.js');
const { aiSearchRoutes } = await import('./routes/ai-search.js');
const { graphRoutes } = await import('./routes/graph.js');
const { companyRoutes } = await import('./routes/company.js');
const { sourcesRoutes } = await import('./routes/sources.js');
const { aiRoutes } = await import('./routes/ai.js');
const { karanteneRoutes } = await import('./routes/karantene.js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRoutes);
app.use('/api/ai', aiSearchRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/karantene', karanteneRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
