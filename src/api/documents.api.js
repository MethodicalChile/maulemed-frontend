// src/api/documents.api.js
import http from "./http";

const BASE = "/documents";

/**
 * Normaliza la respuesta del endpoint preview.
 *
 * El backend responde usando api_response(), normalmente:
 *
 * {
 *   status: "...",
 *   message: "...",
 *   data: {
 *     file_name: "...",
 *     document_type: "...",
 *     data: { ... }
 *   }
 * }
 */
export const getDocumentPreviewPayload = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

export const documentsApi = {
  listDocuments(params) {
    return http.get(
      `${BASE}/`,
      {
        params,
      },
    );
  },

  getDocument(uuid) {
    return http.get(
      `${BASE}/${uuid}/`,
    );
  },

  createDocument(data) {
    return http.post(
      `${BASE}/`,
      data,
    );
  },

  updateDocument(
    uuid,
    data,
  ) {
    return http.patch(
      `${BASE}/${uuid}/`,
      data,
    );
  },

  deleteDocument(uuid) {
    return http.delete(
      `${BASE}/${uuid}/`,
    );
  },

  /**
   * Procesa temporalmente un documento.
   *
   * NO guarda en Supabase.
   * NO crea un registro Document.
   *
   * El backend:
   *
   * - identifica el documento
   * - ejecuta su parser
   * - genera datos estructurados
   * - genera dashboard
   * - mantiene los datos originales
   *
   * Nombres soportados:
   *
   * DETALLE-CAJA.pdf
   * FLUJO-CAJA-PPTO.xlsx
   * LOGS.xlsx
   * REPORTE.xlsx
   */
  previewDocument(file) {
    if (!file) {
      return Promise.reject(
        new Error(
          "Debes seleccionar un archivo.",
        ),
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    return http.post(
      `${BASE}/preview/`,
      formData,
    );
  },

  /**
   * Procesa el documento y devuelve directamente
   * el payload útil del backend.
   *
   * Esto permite usar:
   *
   * const result =
   *   await documentsApi.analyzeDocument(file);
   *
   * en vez de:
   *
   * response.data.data
   */
  async analyzeDocument(file) {
    const response =
      await this.previewDocument(
        file,
      );

    return getDocumentPreviewPayload(
      response,
    );
  },

  /**
   * Sube físicamente un documento a Supabase
   * y crea el registro Document.
   *
   * Actualmente NO ejecuta el análisis/dashboard.
   */
  uploadDocument(
    file,
    meta = {},
  ) {
    if (!file) {
      return Promise.reject(
        new Error(
          "Debes seleccionar un archivo.",
        ),
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    formData.append(
      "document_type",
      meta.document_type ??
        "OTRO",
    );

    if (
      meta.related_model
    ) {
      formData.append(
        "related_model",
        meta.related_model,
      );
    }

    if (
      meta.related_uuid
    ) {
      formData.append(
        "related_uuid",
        meta.related_uuid,
      );
    }

    if (
      meta.notes
    ) {
      formData.append(
        "notes",
        meta.notes,
      );
    }

    return http.post(
      `${BASE}/upload/`,
      formData,
    );
  },
};