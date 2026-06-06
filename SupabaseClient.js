/**
 * ⚡ SupabaseClient para Google Apps Script
 * Proporciona métodos simplificados para interactuar con la API REST de Supabase.
 */

const SupabaseConfig = {
  URL: "https://qvitkasspjxrdfwtyydk.supabase.co/rest/v1",
  KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXRrYXNzcGp4cmRmd3R5eWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODg0MDAsImV4cCI6MjA5Mzc2NDQwMH0.AcueNbwLOIKSe0RalsEyLPKj3HqcOm79DB3OHsUqnik"
};

const Supabase = {
  /**
   * Realiza una petición GET a una tabla.
   * @param {string} tabla Nombre de la tabla.
   * @param {string} query Parámetros de filtrado en formato PostgREST (ej: "select=*,agentes(nombre)&id=eq.1").
   */
  select: function(tabla, query = "select=*") {
    const url = `${SupabaseConfig.URL}/${tabla}?${query}`;
    const options = {
      method: "GET",
      headers: this._getHeaders(),
      muteHttpExceptions: true
    };
    return this._request(url, options);
  },

  /**
   * Realiza una petición POST para insertar datos.
   * @param {string} tabla Nombre de la tabla.
   * @param {Object|Array} datos Objeto o array de objetos a insertar.
   */
  insert: function(tabla, datos) {
    const url = `${SupabaseConfig.URL}/${tabla}`;
    const options = {
      method: "POST",
      headers: {
        ...this._getHeaders(),
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(datos),
      muteHttpExceptions: true
    };
    return this._request(url, options);
  },

  /**
   * Realiza una petición POST con comportamiento UPSERT (inserta o actualiza en conflicto).
   * @param {string} tabla Nombre de la tabla.
   * @param {Object|Array} datos Objeto o array de objetos a insertar/actualizar.
   * @param {string} onConflictField Campo único sobre el cual evaluar el conflicto (ej: "dni").
   */
  upsert: function(tabla, datos, onConflictField) {
    let url = `${SupabaseConfig.URL}/${tabla}`;
    if (onConflictField) {
      url += `?on_conflict=${onConflictField}`;
    }
    const options = {
      method: "POST",
      headers: {
        ...this._getHeaders(),
        "Prefer": "return=representation,resolution=merge-duplicates"
      },
      payload: JSON.stringify(datos),
      muteHttpExceptions: true
    };
    return this._request(url, options);
  },

  /**
   * Realiza una petición PATCH para actualizar datos.
   * @param {string} tabla Nombre de la tabla.
   * @param {Object} datos Objeto con los campos a actualizar.
   * @param {string} query Parámetros de filtrado (ej: "id=eq.uuid").
   */
  update: function(tabla, datos, query) {
    const url = `${SupabaseConfig.URL}/${tabla}?${query}`;
    const options = {
      method: "PATCH",
      headers: {
        ...this._getHeaders(),
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(datos),
      muteHttpExceptions: true
    };
    return this._request(url, options);
  },

  /**
   * Realiza una petición DELETE para eliminar registros.
   * @param {string} tabla Nombre de la tabla.
   * @param {string} query Parámetros de filtrado para eliminar (ej: "id=eq.uuid").
   */
  delete: function(tabla, query) {
    const url = `${SupabaseConfig.URL}/${tabla}?${query}`;
    const options = {
      method: "DELETE",
      headers: {
        ...this._getHeaders(),
        "Prefer": "return=representation"
      },
      muteHttpExceptions: true
    };
    return this._request(url, options);
  },

  /**
   * Métodos internos auxiliares
   */
  _getHeaders: function() {
    return {
      "apikey": SupabaseConfig.KEY,
      "Authorization": `Bearer ${SupabaseConfig.KEY}`,
      "Content-Type": "application/json"
    };
  },

  _request: function(url, options) {
    const encodedUrl = encodeURI(url);
    const response = UrlFetchApp.fetch(encodedUrl, options);
    const code = response.getResponseCode();
    const text = response.getContentText();
    
    if (code >= 200 && code < 300) {
      try {
        return JSON.parse(text);
      } catch(e) {
        return text;
      }
    } else {
      console.error(`[Supabase Error ${code}]: ${text}`);
      throw new Error(`Error en Supabase: ${text}`);
    }
  }
};
