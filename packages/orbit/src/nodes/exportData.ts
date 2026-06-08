import { ExportDataNodeData } from '../models/nodes';
import { Result, Engine } from '../services/action';
import { browser } from 'wxt/browser';

export default async function exportData(data: ExportDataNodeData, engine: Engine): Promise<Result<void>> {
  try {
    const exportData = engine.scrapedData[data.dataKey];
    if (!exportData) {
      return { success: false, error: new Error(`No data found for key: ${data.dataKey}`) };
    }

    let content = '';
    let mimeType = '';
    let extension = '';

    if (data.format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (data.format === 'csv') {
      // Very basic CSV conversion for array of objects
      if (Array.isArray(exportData) && exportData.length > 0 && typeof exportData[0] === 'object') {
        const headers = Object.keys(exportData[0]);
        const rows = exportData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','));
        content = [headers.join(','), ...rows].join('\n');
      } else {
        content = String(exportData);
      }
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      return { success: false, error: new Error(`Unsupported export format: ${data.format}`) };
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    await browser.downloads.download({
      url,
      filename: `export_${Date.now()}.${extension}`,
      saveAs: true
    });

    // Clean up the URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    return { success: true, value: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
