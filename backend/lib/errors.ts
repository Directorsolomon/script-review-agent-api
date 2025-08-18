// Shared error helpers for consistent error handling across services
export const badRequest = (message: string) => 
  Object.assign(new Error(message), { code: 'invalid_argument', httpStatus: 400 });

export const payloadTooLarge = (message: string) => 
  Object.assign(new Error(message), { code: 'payload_too_large', httpStatus: 413 });

export const badGateway = (message: string) => 
  Object.assign(new Error(message), { code: 'upstream_error', httpStatus: 502 });

export const failedPrecondition = (message: string) => 
  Object.assign(new Error(message), { code: 'failed_precondition', httpStatus: 422 });

export const toHttpError = (err: any) => {
  const status = err?.httpStatus ?? 500;
  return { 
    status, 
    body: { 
      code: err?.code ?? 'internal', 
      message: err?.message ?? 'Internal error' 
    } 
  };
};
