const SHEET_NAME = 'Página1';
const HEADER_ROW = [
  'id',
  'dataCriacao',
  'dataAtualizacao',
  'status',
  'cliente',
  'cnpj',
  'endereco',
  'sindico',
  'telefone',
  'email',
  'valor',
  'mesesObra',
  'margemLucroPercentual',
  'detalhes',
  'imagens',
];

function doGet(event) {
  try {
    if (event && event.parameter && event.parameter.health === '1') {
      getBudgetSheet_();
      const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
      if (folderId) {
        DriveApp.getFolderById(folderId).getName();
      } else {
        DriveApp.getRootFolder().getId();
      }
      return jsonOutput_({ ok: true, service: 'google-sheets-drive', spreadsheetReady: true });
    }
    const sheet = getBudgetSheet_();
    const values = sheet.getDataRange().getDisplayValues();
    return jsonOutput_({ ok: true, data: values.length ? values : [HEADER_ROW] });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function doPost(event) {
  try {
    const payload = readPayload_(event);
    const action = String(payload.action || payload.acao || 'save').toLowerCase();
    if (action === 'uploadimage' || action === 'upload_image') {
      return jsonOutput_(uploadImageToDrive_(payload));
    }

    const proposalId = String(
      payload.id || payload.ID || payload.orcamentoId || payload.codigo || ''
    ).trim();

    if (!proposalId) {
      throw new Error('O ID da proposta é obrigatório.');
    }

    const sheet = getBudgetSheet_();
    if (action === 'delete' || action === 'excluir' || payload.status === 'deleted') {
      const deletedRows = deleteProposalRows_(sheet, proposalId);
      return jsonOutput_({ ok: true, action: 'delete', id: proposalId, deletedRows: deletedRows });
    }

    const headers = ensureHeaderRow_(sheet);
    const targetRow = findProposalRow_(sheet, proposalId, headers);
    const rowValues = buildRow_(payload, proposalId, headers, targetRow);
    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      return jsonOutput_({ ok: true, action: 'update', id: proposalId, row: targetRow });
    }

    sheet.appendRow(rowValues);
    return jsonOutput_({
      ok: true,
      action: action === 'updateStatus' ? 'updateStatus' : 'save',
      id: proposalId,
      row: sheet.getLastRow(),
    });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function getBudgetSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Planilha não encontrada. Configure a propriedade SPREADSHEET_ID.');
  }

  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('A aba "' + SHEET_NAME + '" não existe na planilha.');
  }
  return sheet;
}

function readPayload_(event) {
  const body = event && event.postData && event.postData.contents;
  let payload = {};
  if (body) {
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error('O corpo da requisição não contém JSON válido.');
    }
  }
  return Object.assign({}, event && event.parameter ? event.parameter : {}, payload);
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    return HEADER_ROW.slice();
  }

  let headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getDisplayValues()[0];
  if (!headers.some(function (value) {
    return [
      'id',
      'codigo',
      'codigodaproposta',
      'orcamentoid',
      'idproposta',
      'numeroproposta',
      'proposta',
    ].indexOf(normalizeHeader_(value)) !== -1;
  })) {
    sheet.insertRowBefore(1);
    headers = HEADER_ROW.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const normalizedHeaders = headers.map(normalizeHeader_);
  const missingHeaders = HEADER_ROW.filter(function (header) {
    return normalizedHeaders.indexOf(normalizeHeader_(header)) === -1;
  });
  if (missingHeaders.length) {
    const firstNewColumn = headers.length + 1;
    sheet.insertColumnsAfter(headers.length, missingHeaders.length);
    sheet.getRange(1, firstNewColumn, 1, missingHeaders.length).setValues([missingHeaders]);
    headers = headers.concat(missingHeaders);
  }
  return headers;
}

function buildRow_(payload, proposalId, headers, targetRow) {
  const details =
    typeof payload.detalhes === 'string'
      ? payload.detalhes
      : JSON.stringify(payload.dadosCliente || payload.calculos ? payload : {});
  const valuesByHeader = {
    id: proposalId,
    datacriacao: payload.dataCriacao || payload.data || new Date().toISOString(),
    dataatualizacao: payload.dataAtualizacao || new Date().toISOString(),
    status: payload.status || payload.etapa || 'em_elaboracao',
    cliente: payload.cliente || payload.nomeCondominio || '',
    cnpj: payload.cnpj || '',
    endereco: payload.endereco || '',
    sindico: payload.sindico || payload.nomeSindico || '',
    telefone: payload.telefone || '',
    email: payload.email || '',
    valor: payload.valor !== undefined ? payload.valor : payload.valorGlobal || 0,
    mesesobra: payload.mesesObra || '',
    margemlucropercentual: payload.margemLucroPercentual || 0,
    detalhes: details,
    imagens: JSON.stringify(payload.imagens || []),
  };
  const row = targetRow
    ? sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0]
    : new Array(headers.length).fill('');
  headers.forEach(function (header, index) {
    const normalized = normalizeHeader_(header);
    const canonical = canonicalHeader_(normalized);
    if (canonical && Object.prototype.hasOwnProperty.call(valuesByHeader, canonical)) {
      row[index] = valuesByHeader[canonical];
    }
  });
  return row;
}

function findProposalRow_(sheet, proposalId, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const idColumn = proposalIdColumn_(headers);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  for (let index = rows.length - 1; index >= 0; index--) {
    if (String(rows[index][idColumn]).trim() === proposalId) return index + 2;
  }
  return 0;
}

function deleteProposalRows_(sheet, proposalId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  const idColumn = proposalIdColumn_(headers);
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  const matchingRows = [];
  for (let index = 0; index < rows.length; index++) {
    if (String(rows[index][idColumn]).trim() === proposalId) matchingRows.push(index + 2);
  }

  matchingRows.reverse().forEach(function (rowNumber) {
    sheet.deleteRow(rowNumber);
  });
  return matchingRows.length;
}

function proposalIdColumn_(headers) {
  const normalized = headers.map(normalizeHeader_);
  const column = normalized.findIndex(function (value) {
    return [
      'id',
      'codigo',
      'codigodaproposta',
      'orcamentoid',
      'idproposta',
      'numeroproposta',
      'proposta',
    ].indexOf(value) !== -1;
  });
  return column === -1 ? 0 : column;
}

function canonicalHeader_(header) {
  if (
    ['id', 'codigo', 'codigodaproposta', 'orcamentoid', 'idproposta', 'numeroproposta', 'proposta']
      .indexOf(header) !== -1
  ) return 'id';
  if (['datacriacao', 'data', 'timestamp'].indexOf(header) !== -1) return 'datacriacao';
  if (['dataatualizacao', 'atualizadoem'].indexOf(header) !== -1) return 'dataatualizacao';
  if (['status', 'fase', 'etapa'].indexOf(header) !== -1) return 'status';
  if (['cliente', 'condominio', 'nomecondominio', 'nomedocondominio'].indexOf(header) !== -1) return 'cliente';
  if (header === 'cnpj') return 'cnpj';
  if (['endereco', 'logradouro'].indexOf(header) !== -1) return 'endereco';
  if (['sindico', 'nomesindico', 'nomedosindico'].indexOf(header) !== -1) return 'sindico';
  if (['telefone', 'whatsapp'].indexOf(header) !== -1) return 'telefone';
  if (['email', 'emailcliente'].indexOf(header) !== -1) return 'email';
  if (['valor', 'valorglobal', 'valortotal'].indexOf(header) !== -1) return 'valor';
  if (['mesesobra', 'prazo'].indexOf(header) !== -1) return 'mesesobra';
  if (['margemlucropercentual', 'margemlucro'].indexOf(header) !== -1) return 'margemlucropercentual';
  if (['detalhes', 'json', 'payload', 'orcamento', 'dados'].indexOf(header) !== -1) return 'detalhes';
  if (['imagens', 'fotos', 'fotografias', 'imageurls'].indexOf(header) !== -1) return 'imagens';
  return '';
}

function uploadImageToDrive_(payload) {
  const rawUploadId = String(payload.uploadId || '');
  const uploadId = rawUploadId.replace(/[^a-zA-Z0-9_-]/g, '');
  const mimeType = String(payload.mimeType || '').toLowerCase();
  const imageBase64 = String(payload.imageBase64 || '').replace(/\s/g, '');
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (!uploadId || uploadId.length > 80) {
    throw new Error('O identificador do upload é obrigatório e deve ter até 80 caracteres.');
  }
  if (!Object.prototype.hasOwnProperty.call(allowedTypes, mimeType)) {
    throw new Error('Formato de imagem não suportado. Envie JPG, PNG ou WEBP.');
  }
  if (!imageBase64 || imageBase64.length > 15000000) {
    throw new Error('A imagem está vazia ou excede o limite de tamanho do upload.');
  }

  const fileName = 'vistoria_' + uploadId + '.' + allowedTypes[mimeType];
  const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  const existingFiles = folder.getFilesByName(fileName);
  let file = existingFiles.hasNext() ? existingFiles.next() : null;
  const isNewFile = !file;

  if (!file) {
    const bytes = Utilities.base64Decode(imageBase64);
    if (bytes.length > 11 * 1024 * 1024) {
      throw new Error('A imagem excede o limite de 11 MB.');
    }
    file = folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
  }

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    if (isNewFile) file.setTrashed(true);
    throw new Error(
      'Não foi possível habilitar o acesso "qualquer pessoa com o link" no Google Drive. Verifique as políticas da conta Google Workspace: ' +
        error.message
    );
  }

  return {
    ok: true,
    fileId: file.getId(),
    fileName: file.getName(),
    imageUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
    webViewUrl: file.getUrl(),
  };
}

function normalizeHeader_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}
