import { type PromptMetadata } from "xmcp";

export const schema = {};

export const metadata: PromptMetadata = {
  name: "diagnosticar-conexion",
  title: "Diagnosticar conexion",
  description:
    "Guia al agente para verificar conectividad y disponibilidad del backend Exactamente.",
  role: "user",
};

export default function diagnosticarConexion() {
  return `Objetivo: diagnosticar si el MCP y el backend Exactamente estan disponibles.

Workflow recomendado:
1. Llama health-check.
2. Si health-check falla, reporta el codigo de error MCP/API y no intentes workflows largos.
3. Si health-check responde ok, llama list-universities con { limit: 5 }.
4. Si list-universities responde datos, confirma que el MCP puede consultar la API.
5. Si hay rate_limited o upstream_error, informa que es una falla temporal o de disponibilidad del backend.`;
}
