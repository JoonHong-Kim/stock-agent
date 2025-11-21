export async function handleHttpResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    let message = "API request failed";
    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed?.detail === "string") {
          message = parsed.detail;
        } else if (typeof parsed?.message === "string") {
          message = parsed.message;
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }
    throw new Error(message);
  }

  if (!body) {
    return {} as T;
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    return body as unknown as T;
  }
}
