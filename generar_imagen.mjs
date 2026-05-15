import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f4f8;
    padding: 32px;
    width: 820px;
  }
  h2 {
    text-align: center;
    color: #1a3a5c;
    margin-bottom: 24px;
    font-size: 18px;
    letter-spacing: 0.5px;
  }
  .section-title {
    font-size: 13px;
    font-weight: bold;
    color: #555;
    margin: 18px 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-left: 4px solid #1a3a5c;
    padding-left: 8px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 6px;
    font-size: 13px;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  }
  th {
    background: #1a3a5c;
    color: #fff;
    padding: 9px 14px;
    text-align: left;
    font-size: 12.5px;
    letter-spacing: 0.3px;
  }
  td {
    padding: 8px 14px;
    border-bottom: 1px solid #e8edf2;
    color: #333;
  }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f7fafc; }
  .highlight td { background: #fff3cd !important; font-weight: 600; }
  .sql-box {
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 8px;
    padding: 16px 20px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 6px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.18);
  }
  .kw  { color: #89b4fa; font-weight: bold; }
  .fn  { color: #a6e3a1; }
  .str { color: #f38ba8; }
  .cmt { color: #6c7086; font-style: italic; }
  .badge {
    display: inline-block;
    background: #1a3a5c;
    color: #fff;
    border-radius: 4px;
    font-size: 11px;
    padding: 2px 8px;
    margin-left: 8px;
    vertical-align: middle;
  }
  .result-count {
    font-size: 12px;
    color: #888;
    text-align: right;
    margin-top: 4px;
  }
</style>
</head>
<body>
<h2>Caso Práctico — Bases de Datos Relacionales (PID_00201457)</h2>

<!-- TABLA COMPLETA SUCURSALES -->
<div class="section-title">Tabla SUCURSALES (completa)</div>
<table>
  <thead>
    <tr><th>NumSucu</th><th>Dirección</th><th>Población</th><th>Teléfono</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Av. Pearson, 123</td><td>Barcelona</td><td>933333333</td></tr>
    <tr><td>2</td><td>Plaza Catalunya, 1</td><td>Barcelona</td><td>934444444</td></tr>
    <tr><td>3</td><td>Rambla, 16</td><td>Barcelona</td><td>935555555</td></tr>
    <tr class="highlight"><td>4</td><td>Plaza Neptuno, 1</td><td>Madrid</td><td>911111111</td></tr>
    <tr class="highlight"><td>5</td><td>Gran Vía, 11</td><td>Madrid</td><td>916666666</td></tr>
    <tr><td>6</td><td>Colon, 9</td><td>Valencia</td><td>963333333</td></tr>
  </tbody>
</table>
<div class="result-count">6 registros totales &nbsp;|&nbsp; filas resaltadas = Madrid</div>

<!-- INSTRUCCIÓN SQL / VIEW -->
<div class="section-title" style="margin-top:22px;">Instrucción SQL — Creación de la Vista</div>
<div class="sql-box">
<span class="cmt">-- Vista: sucursales de Madrid (NumSucu y Dirección)</span><br/>
<span class="kw">CREATE VIEW</span> <span class="fn">VW_SUCURSALES_MADRID</span> <span class="kw">AS</span><br/>
<span class="kw">SELECT</span> &nbsp;NumSucu, Direccion<br/>
<span class="kw">FROM</span> &nbsp;&nbsp;SUCURSALES<br/>
<span class="kw">WHERE</span> &nbsp;Poblacion = <span class="str">'Madrid'</span>;<br/>
<br/>
<span class="cmt">-- Consultar la vista</span><br/>
<span class="kw">SELECT</span> * <span class="kw">FROM</span> <span class="fn">VW_SUCURSALES_MADRID</span>;
</div>

<!-- RESULTADO DE LA VISTA -->
<div class="section-title" style="margin-top:22px;">
  Resultado de la Vista &nbsp;<span class="badge">VW_SUCURSALES_MADRID</span>
</div>
<table>
  <thead>
    <tr><th>NumSucu</th><th>Dirección</th></tr>
  </thead>
  <tbody>
    <tr><td>4</td><td>Plaza Neptuno, 1</td></tr>
    <tr><td>5</td><td>Gran Vía, 11</td></tr>
  </tbody>
</table>
<div class="result-count">2 registros — Sucursales en Madrid</div>

</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 820, height: 900, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Ajustar al contenido real
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 820, height: bodyHeight + 64, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, 'sucursales_madrid.jpg');
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95, fullPage: true });
  await browser.close();
  console.log('Imagen generada:', outputPath);
})();
