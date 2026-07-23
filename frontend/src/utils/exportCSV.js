import toast from 'react-hot-toast';

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!Array.isArray(data) || data.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  try {
    const headers = Object.keys(data[0] || {});
    const rows = data.map((row) =>
      headers.map((header) => {
        const value = row?.[header] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error('Failed to generate CSV export.');
  }
};
