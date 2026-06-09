import { ExportDataNodeData, NodeType, Result } from './types';
import { browser } from 'wxt/browser';

export const exportDataNode: NodeType<ExportDataNodeData> = {
  id: 'nodes:export-data',
  name: 'exportData',
  description: '',
  execute: async (data, context): Promise<Result<void>> => {
  try {
    const exportData = context.engine.scrapedData[data.dataKey];
    if (!exportData) {
      return { success: false, error: String(new Error(`No data found for key: ${data.dataKey}`)) };
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
      return { success: false, error: String(new Error(`Unsupported export format: ${data.format}`)) };
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

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: String(error as Error) };
  }
}

};
