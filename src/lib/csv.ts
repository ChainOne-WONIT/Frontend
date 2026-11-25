/** 표 내용을 CSV 파일로 내려받습니다 (엑셀에서 열 수 있도록 BOM을 붙입니다). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const text = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
