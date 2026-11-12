import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Normaliza funções de cores modernas do CSS (oklch, oklab, color-mix, lab, lch, color)
 * para rgb()/rgba() usando um canvas 2D nativo do navegador, evitando falhas no parser
 * interno do html2canvas ao capturar páginas estilizadas com Tailwind CSS v4.
 */
const createColorNormalizer = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cache = new Map<string, string>();

  const toRgb = (cssColor: string): string => {
    const trimmed = cssColor.trim();
    if (!trimmed) return trimmed;
    const cached = cache.get(trimmed);
    if (cached) return cached;

    if (!ctx) return 'rgb(15, 23, 42)';

    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const alpha = +(a / 255).toFixed(3);
      const result =
        alpha === 0
          ? 'rgba(0, 0, 0, 0)'
          : alpha < 1
            ? `rgba(${r}, ${g}, ${b}, ${alpha})`
            : `rgb(${r}, ${g}, ${b})`;
      cache.set(trimmed, result);
      return result;
    } catch {
      return 'rgb(15, 23, 42)';
    }
  };

  /**
   * Substitui ocorrências de oklch(...), oklab(...), lab(...), lch(...), color(...) e color-mix(...)
   * dentro de qualquer string CSS (incluindo gradientes, sombras e folhas de estilo).
   */
  const replaceUnsupportedCssColors = (cssText: string): string => {
    if (
      !cssText ||
      (!cssText.includes('oklch') &&
        !cssText.includes('oklab') &&
        !cssText.includes('color-mix') &&
        !cssText.includes('lab(') &&
        !cssText.includes('lch(') &&
        !cssText.includes('color('))
    ) {
      return cssText;
    }

    // Primeiro resolve color-mix(...) com parênteses aninhados (até 2 níveis)
    let output = cssText.replace(
      /color-mix\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi,
      (match) => toRgb(match)
    );

    // Em seguida resolve oklch(...), oklab(...), lab(...), lch(...), color(...)
    output = output.replace(
      /\b(?:oklch|oklab|lab|lch|color)\((?:[^()]+|\([^()]*\))*\)/gi,
      (match) => toRgb(match)
    );

    return output;
  };

  return { toRgb, replaceUnsupportedCssColors };
};

/**
 * Sanitiza todas as folhas de estilo e estilos computados do documento clonado pelo html2canvas
 * para garantir que nenhuma função `oklch`/`oklab` cause erro ou travamento e que nenhuma
 * regra `@media print { body * { visibility: hidden } }` oculte elementos durante a captura.
 */
const sanitizeClonedDocumentForHtml2Canvas = (
  clonedDoc: Document,
  replaceUnsupportedCssColors: (cssText: string) => string
) => {
  // Garante visibilidade plena no clone sem jamais afetar o DOM real do usuário
  if (clonedDoc.body) {
    clonedDoc.body.style.visibility = 'visible';
    clonedDoc.body.style.opacity = '1';
    clonedDoc.body.style.background = '#ffffff';
  }

  // 1. Converte <link rel="stylesheet"> acessíveis e sanitiza todas as tags <style> no clone
  const styleElements = Array.from(clonedDoc.querySelectorAll('style'));
  for (const styleEl of styleElements) {
    if (styleEl.textContent) {
      const withoutHiddenBody = styleEl.textContent.replace(
        /body\s*\*\s*\{\s*visibility\s*:\s*hidden\s*;?\s*\}/gi,
        ''
      );
      styleEl.textContent = replaceUnsupportedCssColors(withoutHiddenBody);
    }
  }

  // Também extrai regras CSS das stylesheets da janela original caso existam <link rel="stylesheet">
  const linkElements = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  if (linkElements.length > 0) {
    const origSheets = Array.from(document.styleSheets);
    for (const sheet of origSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        const rawCss = rules.map((r) => r.cssText).join('\n');
        if (rawCss) {
          const inlineStyle = clonedDoc.createElement('style');
          const cleanCss = rawCss.replace(
            /body\s*\*\s*\{\s*visibility\s*:\s*hidden\s*;?\s*\}/gi,
            ''
          );
          inlineStyle.textContent = replaceUnsupportedCssColors(cleanCss);
          clonedDoc.head.appendChild(inlineStyle);
        }
      } catch {
        // Ignora stylesheets cross-origin (ex: Google Fonts)
      }
    }
    for (const linkEl of linkElements) {
      // Preserva fontes externas, remove apenas links locais compilados se houver
      const href = linkEl.getAttribute('href') || '';
      if (!href.includes('fonts.googleapis.com')) {
        linkEl.remove();
      }
    }
  }

  // 2. Sanitiza atributos style inline de todos os elementos do clone
  const allClonedElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
  for (const el of allClonedElements) {
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle) {
      el.setAttribute('style', replaceUnsupportedCssColors(inlineStyle));
    }
  }
};

export interface DownloadPdfOptions {
  elementId?: string;
  filename?: string;
}

/**
 * Cria uma cópia isolada (off-screen) do container `#pdf-content` e de suas folhas A4
 * (`.print-document-sheet`), preservando 100% da interface ativa do usuário visível e intocada,
 * e faz o download direto do arquivo `.pdf` para o computador do usuário.
 */
export async function downloadProposalPdf(options: DownloadPdfOptions = {}): Promise<void> {
  const { elementId = 'pdf-content', filename = 'Proposta-Tecnica-Renovar-Engenharia.pdf' } =
    options;

  const originalContainer = document.getElementById(elementId);
  if (!originalContainer) {
    throw new Error(`Elemento #${elementId} não encontrado para geração do PDF.`);
  }

  // Aguarda fontes estarem carregadas antes da renderização
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Prossegue mesmo se document.fonts falhar
    }
  }

  const { replaceUnsupportedCssColors } = createColorNormalizer();
  const targetWidthPx = 850; // Largura A4 de referência em pixels para layout consistente

  // Cria um wrapper off-screen totalmente isolado para clonar a proposta sem alterar o DOM visível
  const isolatedSandbox = document.createElement('div');
  isolatedSandbox.setAttribute('aria-hidden', 'true');
  isolatedSandbox.style.cssText = [
    'position: fixed',
    'left: -20000px',
    'top: 0',
    `width: ${targetWidthPx}px`,
    'z-index: -9999',
    'pointer-events: none',
    'background: #ffffff',
    'color: #0f172a',
    'overflow: visible',
    'visibility: visible',
  ].join(';');

  // Clona profundamente o container da proposta sem tocar nos elementos ativos da tela
  const clonedContainer = originalContainer.cloneNode(true) as HTMLElement;
  clonedContainer.removeAttribute('id');
  clonedContainer.style.width = `${targetWidthPx}px`;
  clonedContainer.style.maxWidth = `${targetWidthPx}px`;
  clonedContainer.style.margin = '0';
  clonedContainer.style.padding = '0';
  clonedContainer.style.visibility = 'visible';

  // Remove elementos .no-print e tags <style> de impressão apenas dentro da cópia isolada
  clonedContainer.querySelectorAll('.no-print, style').forEach((el) => el.remove());

  isolatedSandbox.appendChild(clonedContainer);
  document.body.appendChild(isolatedSandbox);

  try {
    // Identifica se a cópia isolada é composta por múltiplas folhas A4 (.print-document-sheet)
    // ou se é uma folha única (ex: OfficialReportModal)
    const clonedSheets = Array.from(
      clonedContainer.querySelectorAll<HTMLElement>('.print-document-sheet')
    );
    const targetsToCapture: HTMLElement[] =
      clonedSheets.length > 0 ? clonedSheets : [clonedContainer];

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfPageWidthMm = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfPageHeightMm = pdf.internal.pageSize.getHeight(); // 297 mm

    let isFirstPdfPage = true;

    for (let i = 0; i < targetsToCapture.length; i++) {
      const targetEl = targetsToCapture[i];

      // Configura dimensões e estilo diretamente na cópia isolada off-screen
      targetEl.style.width = `${targetWidthPx}px`;
      targetEl.style.maxWidth = `${targetWidthPx}px`;
      targetEl.style.margin = '0';
      targetEl.style.boxSizing = 'border-box';
      targetEl.style.borderRadius = '0';
      targetEl.style.boxShadow = 'none';
      targetEl.style.overflow = 'visible';
      targetEl.style.visibility = 'visible';
      targetEl.style.background = '#ffffff';

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          sanitizeClonedDocumentForHtml2Canvas(clonedDoc, replaceUnsupportedCssColors);
        },
      });

      const imgWidthMm = pdfPageWidthMm;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      if (
        imgHeightMm <= pdfPageHeightMm * 1.18 &&
        clonedSheets.length > 0 &&
        imgHeightMm > pdfPageHeightMm
      ) {
        if (!isFirstPdfPage) {
          pdf.addPage();
        }
        isFirstPdfPage = false;

        const scaleRatio = pdfPageHeightMm / imgHeightMm;
        const scaledWidthMm = imgWidthMm * scaleRatio;
        const offsetXMm = (pdfPageWidthMm - scaledWidthMm) / 2;
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        pdf.addImage(
          imgData,
          'JPEG',
          offsetXMm,
          0,
          scaledWidthMm,
          pdfPageHeightMm,
          undefined,
          'FAST'
        );
      } else if (imgHeightMm <= pdfPageHeightMm) {
        if (!isFirstPdfPage) {
          pdf.addPage();
        }
        isFirstPdfPage = false;

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm, undefined, 'FAST');
      } else {
        // Fatia verticalmente em múltiplas páginas A4 sem perder conteúdo
        const pageCanvasHeightPx = Math.floor((canvas.width * pdfPageHeightMm) / pdfPageWidthMm);
        let renderedHeightPx = 0;

        while (renderedHeightPx < canvas.height) {
          const sliceHeightPx = Math.min(pageCanvasHeightPx, canvas.height - renderedHeightPx);

          // Evita criar página residual quase vazia (< 20px)
          if (sliceHeightPx < 20 && renderedHeightPx > 0) {
            break;
          }

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const pageCtx = pageCanvas.getContext('2d');

          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
              canvas,
              0,
              renderedHeightPx,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            if (!isFirstPdfPage) {
              pdf.addPage();
            }
            isFirstPdfPage = false;

            const sliceHeightMm = (sliceHeightPx * pdfPageWidthMm) / canvas.width;
            const sliceData = pageCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(sliceData, 'JPEG', 0, 0, pdfPageWidthMm, sliceHeightMm, undefined, 'FAST');
          }

          renderedHeightPx += sliceHeightPx;
        }
      }

      // Cede um frame ao navegador entre páginas para manter a UI responsiva e sem travamentos
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    const sanitizedFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(sanitizedFilename);
  } finally {
    // Remove apenas o container temporário off-screen, mantendo o DOM ativo intacto
    if (isolatedSandbox.parentNode) {
      isolatedSandbox.parentNode.removeChild(isolatedSandbox);
    }
  }
}
