const allowedTicketReturnPaths = new Set([
  "/tickets",
  "/tickets/my-queue",
]);

export function parseTicketReturnPath(
  value: string | string[] | undefined,
  fallback = "/tickets/my-queue",
) {
  const candidate = Array.isArray(value)
    ? value[0]
    : value;

  if (!candidate) {
    return fallback;
  }

  try {
    const baseUrl =
      new URL("http://deskops.local");
    const parsedUrl = new URL(
      candidate,
      baseUrl,
    );

    if (
      parsedUrl.origin !== baseUrl.origin ||
      !allowedTicketReturnPaths.has(
        parsedUrl.pathname,
      )
    ) {
      return fallback;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return fallback;
  }
}
