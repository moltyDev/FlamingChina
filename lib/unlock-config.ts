export type UnlockMethod = "holder" | "payment";

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

function parseMethod(value: string | undefined): UnlockMethod | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "holder" || normalized === "payment") {
    return normalized;
  }

  return null;
}

export function getServerEnabledUnlockMethods(): UnlockMethod[] {
  const holderEnabled = parseBool(process.env.FC_ENABLE_HOLDER_UNLOCK, true);
  const paymentEnabled = parseBool(process.env.FC_ENABLE_PAYMENT_UNLOCK, true);

  const methods: UnlockMethod[] = [];
  if (holderEnabled) {
    methods.push("holder");
  }
  if (paymentEnabled) {
    methods.push("payment");
  }

  if (methods.length === 0) {
    methods.push("holder");
  }

  return methods;
}

export function isServerUnlockMethodEnabled(method: UnlockMethod): boolean {
  return getServerEnabledUnlockMethods().includes(method);
}

export function getServerDefaultUnlockMethod(): UnlockMethod {
  const configured = parseMethod(process.env.FC_DEFAULT_UNLOCK_METHOD);
  const enabled = getServerEnabledUnlockMethods();

  if (configured && enabled.includes(configured)) {
    return configured;
  }

  return enabled[0];
}

export function getClientEnabledUnlockMethods(): UnlockMethod[] {
  const holderEnabled = parseBool(process.env.NEXT_PUBLIC_FC_ENABLE_HOLDER_UNLOCK, true);
  const paymentEnabled = parseBool(process.env.NEXT_PUBLIC_FC_ENABLE_PAYMENT_UNLOCK, true);

  const methods: UnlockMethod[] = [];
  if (holderEnabled) {
    methods.push("holder");
  }
  if (paymentEnabled) {
    methods.push("payment");
  }

  if (methods.length === 0) {
    methods.push("holder");
  }

  return methods;
}

export function getClientDefaultUnlockMethod(): UnlockMethod {
  const configured = parseMethod(process.env.NEXT_PUBLIC_FC_DEFAULT_UNLOCK_METHOD);
  const enabled = getClientEnabledUnlockMethods();

  if (configured && enabled.includes(configured)) {
    return configured;
  }

  return enabled[0];
}
