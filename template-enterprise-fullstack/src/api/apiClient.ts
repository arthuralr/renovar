/**
 * Cliente HTTP Corporativo Resiliente
 * Resolve dinamicamente a URL da API remota a partir de import.meta.env.VITE_API_URL
 * com suporte nativo a timeouts estendidos (45s+), cancelamento de requisição e
 * mensagens de erro orientativas para o usuário.
 */

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
export const BASE_API_URL = RAW_API_URL.replace(/\/+$/, '');

export const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class ApiError extends Error {
  status?: number;
  originalError?: any;

  constructor(message: string, status?: number, originalError?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.originalError = originalError;
  }
}

/**
 * Constrói a URL completa para a rota requisitada.
 * Se VITE_API_URL estiver definida, aponta para a VPS/backend remoto.
 * Caso contrário, utiliza caminho relativo na mesma origem.
 */
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_API_URL ? `${BASE_API_URL}${cleanPath}` : cleanPath;
}

/**
 * Converte erros técnicos de rede em mensagens claras para a interface.
 */
export function formatFriendlyErrorMessage(error: any): string {
  const msg = String(error?.message || error || '').toLowerCase();

  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('econnrefused')
  ) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está online.';
  }

  if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('tempo limite')) {
    return 'A requisição demorou além do tempo esperado para responder (timeout). Tente novamente.';
  }

  return error?.message || 'Ocorreu um erro inesperado ao se comunicar com o servidor.';
}

export async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, headers = {}, ...rest } = options;

  const url = buildApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.message || `A API respondeu com status HTTP ${response.status}.`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return (data as T) ?? ({} as T);
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new ApiError(
        `Tempo limite de ${timeoutMs / 1000}s excedido ao aguardar a resposta da API.`,
        408,
        err
      );
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(formatFriendlyErrorMessage(err), 0, err);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T = any>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T = any>(path: string, body?: any, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T = any>(path: string, body?: any, options?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: <T = any>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
};
